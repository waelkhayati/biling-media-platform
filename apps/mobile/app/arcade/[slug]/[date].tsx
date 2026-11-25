import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { normalizeMotWord, type ArcadeAction, type ArcadeView } from "@biling/schemas";
import { arcadeApi } from "../../../src/arcade-api";
import { useResource } from "../../../src/resource";
import { useSession } from "../../../src/session";
import {
  Action,
  color,
  Copy,
  Field,
  Heading,
  Label,
  Screen,
  Status,
  styles,
  Title,
} from "../../../src/ui";

export default function ArcadeRoute() {
  const { slug, date } = useLocalSearchParams<{ slug: string; date: string }>();
  const { token } = useSession();
  const resource = useResource(slug + "/" + date + (token ?? ""), () =>
    arcadeApi.read(slug, date, token),
  );
  useFocusEffect(
    useCallback(() => {
      void resource.refresh();
    }, [resource.refresh]),
  );
  return resource.data ? (
    <Player key={slug + date + (token ?? "")} initial={resource.data} token={token} />
  ) : (
    <Screen>
      <Status
        skeleton="rows"
        loading={resource.loading && resource.data === undefined}
        error={resource.error}
        retry={resource.refresh}
      />
    </Screen>
  );
}

function Player({ initial, token }: { initial: ArcadeView; token?: string }) {
  const [updated, setUpdated] = useState<ArcadeView>();
  const view = updated && updated.serverNow >= initial.serverNow ? updated : initial;
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [seconds, setSeconds] = useState<number>();
  const pending = useRef(false);
  const expiryAttempted = useRef(false);
  const { progress } = view;
  const playing = progress?.status === "IN_PROGRESS";
  const count = view.slots.filter((slot) => slot.found).length;

  async function send(action?: ArcadeAction) {
    if (!token) {
      router.push("/profile");
      return;
    }
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const data = action
        ? await arcadeApi.move(view.slug, view.date, token, action)
        : await arcadeApi.start(view.slug, view.date, token);
      setUpdated(data);
      setInput("");
      setSelected([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the puzzle.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!view.deadline || !playing) return;
    const start = performance.now();
    const span = Date.parse(view.deadline) - Date.parse(view.serverNow);
    const tick = () =>
      setSeconds(Math.max(0, Math.ceil((span - (performance.now() - start)) / 1000)));
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [view, playing]);

  useEffect(() => {
    if (!playing || seconds !== 0 || busy || expiryAttempted.current) return;
    const timer = setTimeout(() => {
      expiryAttempted.current = true;
      void send({ type: "expire", revision: progress.revision });
    }, 600);
    return () => clearTimeout(timer);
  });

  function submit() {
    if (busy || !playing || !input.trim() || (view.kind === "RECALL" && seconds === 0)) return;
    if (view.kind === "MOT" && input.length !== view.wordLength) return;
    void send({
      type: view.kind === "MOT" ? "word" : "recall",
      value: input,
      revision: progress.revision,
    });
  }

  return (
    <Screen>
      <Label>{view.date} · UTC</Label>
      <Title>{view.title}</Title>
      <Copy>{view.description}</Copy>
      {!progress && (
        <Action
          disabled={busy}
          label={token ? "Start puzzle" : "Sign in to play"}
          onPress={() => send()}
        />
      )}
      {view.kind === "MOT" && (
        <>
          <View style={styles.stack}>
            {Array.from({ length: view.limit }, (_, row) => (
              <View key={row} style={board.wordRow}>
                {Array.from({ length: view.wordLength ?? 0 }, (_, col) => {
                  const guess = progress?.words[row];
                  const value =
                    guess?.value[col] ??
                    (playing && row === progress.words.length ? input[col] : undefined);
                  const mark = guess?.cells[col];
                  return (
                    <View
                      key={col}
                      style={[
                        board.letter,
                        mark === "exact" && board.exact,
                        mark === "present" && board.present,
                      ]}
                      accessible
                      accessibilityLabel={
                        value ? value + (mark ? ", " + mark : "") : "Empty letter"
                      }
                    >
                      <Text
                        style={[
                          board.letterText,
                          (mark === "exact" || mark === "present") && board.darkText,
                        ]}
                      >
                        {value}
                      </Text>
                      {mark && (
                        <Text
                          style={[
                            board.mark,
                            (mark === "exact" || mark === "present") && board.darkText,
                          ]}
                        >
                          {mark === "exact" ? "✓" : mark === "present" ? "•" : "×"}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
          {playing && (
            <View style={styles.row}>
              {[..."QWERTYUIOPASDFGHJKLZXCVBNM"].map((letter) => {
                const used = progress.words.some((row) => row.value.includes(letter));
                return (
                  <Pressable
                    key={letter}
                    style={[board.key, used && board.used]}
                    accessibilityRole="button"
                    accessibilityLabel={letter + (used ? ", used" : "")}
                    onPress={() =>
                      setInput((value) => (value + letter).slice(0, view.wordLength ?? 0))
                    }
                  >
                    <Text style={board.keyText}>{letter}</Text>
                  </Pressable>
                );
              })}
              <Action quiet label="Delete letter" onPress={() => setInput(input.slice(0, -1))} />
            </View>
          )}
          {view.solution && <Copy>Solution · {view.solution}</Copy>}
        </>
      )}
      {view.kind === "LINKS" && (
        <>
          <Label>{Math.max(0, view.limit - (progress?.mistakes ?? 0))} mistakes left</Label>
          {view.groups.map((group) => (
            <View key={group.tiles[0].id} style={[styles.panel, board.group]}>
              <Label>{group.solved ? "Group found" : "Missed group"}</Label>
              <Heading>{group.title}</Heading>
              <Copy>{group.tiles.map((tile) => tile.label).join(" · ")}</Copy>
            </View>
          ))}
          <View style={styles.row}>
            {view.tiles.map((tile) => (
              <Pressable
                key={tile.id}
                style={[board.link, selected.includes(tile.id) && board.exact]}
                accessibilityRole="button"
                accessibilityState={{
                  selected: selected.includes(tile.id),
                  disabled: !playing || busy,
                }}
                disabled={!playing || busy}
                onPress={() =>
                  setSelected((old) =>
                    old.includes(tile.id)
                      ? old.filter((id) => id !== tile.id)
                      : old.length < 4
                        ? [...old, tile.id]
                        : old,
                  )
                }
              >
                <Text style={[board.keyText, selected.includes(tile.id) && board.darkText]}>
                  {tile.label}
                </Text>
              </Pressable>
            ))}
          </View>
          {playing && (
            <Action
              label="Submit four tiles"
              disabled={selected.length !== 4 || busy}
              onPress={() => send({ type: "group", value: selected, revision: progress.revision })}
            />
          )}
        </>
      )}
      {view.kind === "RECALL" && (
        <>
          {playing && seconds !== undefined && (
            <Text accessibilityLabel={seconds + " seconds remaining"} style={board.clock}>
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
            </Text>
          )}
          <Label>
            {count} of {view.slots.length} unlocked
          </Label>
          <View
            style={board.track}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: view.slots.length, now: count }}
          >
            <View style={[board.fill, { width: `${(100 * count) / view.slots.length}%` }]} />
          </View>
        </>
      )}
      {playing && view.kind !== "LINKS" && (
        <>
          <Field
            label={view.kind === "MOT" ? "Your word" : "Type an answer"}
            value={input}
            autoCorrect={false}
            maxLength={view.wordLength ?? 200}
            onChangeText={(value) =>
              setInput(
                view.kind === "MOT"
                  ? normalizeMotWord(value)
                      .replace(/[^A-Z]/g, "")
                      .slice(0, view.wordLength ?? 7)
                  : value,
              )
            }
            onSubmitEditing={submit}
          />
          <Action label="Submit" disabled={busy || !input.trim()} onPress={submit} />
        </>
      )}
      {view.kind === "RECALL" && (
        <View style={styles.row}>
          {view.slots.map((slot, index) => (
            <View key={index} style={[board.link, slot.found && board.group]}>
              <Text style={board.keyText}>{slot.label ?? index + 1 + ". Hidden"}</Text>
            </View>
          ))}
        </View>
      )}
      {progress?.feedback && (
        <Text accessibilityLiveRegion="polite" style={styles.copy}>
          {progress.feedback}
        </Text>
      )}
      <Status error={error} />
      {error && playing && seconds === 0 && (
        <Action
          quiet
          label="Check result"
          onPress={() => send({ type: "expire", revision: progress.revision })}
        />
      )}
      {progress && !playing && (
        <>
          <Heading>
            {view.won
              ? "Puzzle cleared"
              : progress.status === "EXPIRED"
                ? "Time’s up"
                : "Round complete"}
          </Heading>
          <Action
            quiet
            label="Share result"
            onPress={() => {
              const score =
                view.kind === "RECALL"
                  ? count + "/" + view.slots.length
                  : view.won
                    ? "Cleared"
                    : "Complete";
              void Share.share({ message: view.title + " · " + view.date + " · " + score }).catch(
                () => {},
              );
            }}
          />
        </>
      )}
    </Screen>
  );
}

const board = StyleSheet.create({
  wordRow: { flexDirection: "row", gap: 5 },
  letter: {
    flex: 1,
    maxWidth: 54,
    minHeight: 46,
    backgroundColor: color.ink,
    borderColor: color.line,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  letterText: { color: color.paper, fontSize: 22, fontWeight: "900" },
  mark: { color: color.muted, fontSize: 12 },
  darkText: { color: color.black },
  exact: { backgroundColor: color.lime },
  present: { backgroundColor: color.orange },
  key: {
    width: 43,
    minHeight: 45,
    backgroundColor: color.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  used: { borderColor: color.orange, borderWidth: 1 },
  keyText: { color: color.paper, fontWeight: "800", textAlign: "center" },
  link: {
    width: "47%",
    minHeight: 52,
    padding: 8,
    justifyContent: "center",
    backgroundColor: color.ink,
  },
  group: { borderStartWidth: 4, borderStartColor: color.lime },
  clock: { color: color.orange, fontSize: 58, fontWeight: "900", fontVariant: ["tabular-nums"] },
  track: { height: 7, backgroundColor: color.line },
  fill: { height: 7, backgroundColor: color.lime },
});
