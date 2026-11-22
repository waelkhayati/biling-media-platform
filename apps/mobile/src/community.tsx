import { router } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";
import type { CommunityComment, CommunityTarget } from "@biling/contracts";
import { commentBodySchema } from "@biling/schemas";
import { api, request, segment } from "./api";
import { useResource } from "./resource";
import { useSession } from "./session";
import { Action, Copy, dateLabel, Field, Heading, Label, Status, styles } from "./ui";

export function Community({ target }: { target: CommunityTarget }) {
  const { token } = useSession();
  const query = Object.entries(target)
    .map(([key, value]) => key + "=" + segment(value))
    .join("&");
  const [page, setPage] = useState(1);
  const engagement = useResource(query + token, () => api.engagement(query, token));
  const comments = useResource(query + token + page, () => api.comments(query, page, token));
  const [body, setBody] = useState("");
  const [intent, setIntent] = useState<{ kind: "reply" | "edit"; id: string; name: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  async function mutate(path: string, method: string, payload?: unknown, after?: () => void) {
    if (!token) {
      router.push("/profile");
      return;
    }
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      await request(path, { method, body: payload, token });
      after?.();
      await Promise.all([engagement.refresh(), comments.refresh()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function send() {
    const result = commentBodySchema.safeParse(body);
    if (!result.success) {
      setError("Enter a valid comment between 1 and 2,000 characters.");
      return;
    }
    const clear = () => {
      setBody("");
      setIntent(undefined);
      if (intent?.kind !== "edit") setPage(1);
    };
    if (intent?.kind === "edit")
      void mutate(
        "/community/comments/" + segment(intent.id),
        "PATCH",
        { body: result.data },
        clear,
      );
    else
      void mutate(
        "/community/comments",
        "POST",
        { target, body: result.data, parentId: intent?.id ?? null },
        clear,
      );
  }

  function comment(item: CommunityComment, reply = false) {
    const path = "/community/comments/" + segment(item.id);
    return (
      <View key={item.id} style={styles.panel}>
        <Label>
          {item.author.displayName} · {dateLabel(item.createdAt)}
        </Label>
        <Copy>{item.body}</Copy>
        {token && (
          <View style={styles.row}>
            <Action
              quiet
              disabled={busy}
              label={(item.liked ? "Unlike" : "Like") + " · " + item.likeCount}
              onPress={() => mutate(path + "/likes", item.liked ? "DELETE" : "PUT")}
            />
            {!reply && (
              <Action
                quiet
                disabled={busy}
                label="Reply"
                onPress={() => {
                  setBody("");
                  setIntent({ kind: "reply", id: item.id, name: item.author.displayName });
                }}
              />
            )}
            {item.owned ? (
              <>
                <Action
                  quiet
                  disabled={busy}
                  label="Edit"
                  onPress={() => {
                    setBody(item.body);
                    setIntent({ kind: "edit", id: item.id, name: item.author.displayName });
                  }}
                />
                <Action
                  quiet
                  disabled={busy}
                  label="Delete"
                  onPress={() =>
                    Alert.alert("Delete comment?", "Your comment will be removed.", [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => void mutate(path, "DELETE"),
                      },
                    ])
                  }
                />
              </>
            ) : (
              <Action
                quiet
                disabled={busy}
                label="Report"
                onPress={() =>
                  Alert.alert("Report comment", "Choose a reason.", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Spam",
                      onPress: () =>
                        void mutate(path + "/reports", "POST", { reason: "SPAM" }, () =>
                          setNotice("Report sent."),
                        ),
                    },
                    {
                      text: "Other",
                      onPress: () =>
                        void mutate(path + "/reports", "POST", { reason: "OTHER" }, () =>
                          setNotice("Report sent."),
                        ),
                    },
                  ])
                }
              />
            )}
          </View>
        )}
        {!reply && item.replies.map((child) => comment(child, true))}
      </View>
    );
  }

  const activity = engagement.data;
  return (
    <>
      <Status loading={engagement.loading} error={engagement.error} retry={engagement.refresh} />
      {activity &&
        (target.type === "show" ? (
          <Action
            quiet
            disabled={busy}
            label={(activity.followed ? "Following" : "Follow") + " · " + activity.followerCount}
            onPress={() =>
              mutate(
                "/community/shows/" + segment(target.slug) + "/follow",
                activity.followed ? "DELETE" : "PUT",
              )
            }
          />
        ) : (
          <Action
            quiet
            disabled={busy}
            label={(activity.liked ? "Unlike" : "Like") + " · " + activity.likeCount}
            onPress={() => mutate("/community/likes", activity.liked ? "DELETE" : "PUT", target)}
          />
        ))}
      <Heading>Discussion</Heading>
      <Status error={error} />
      {notice && <Copy>{notice}</Copy>}
      {token ? (
        <>
          <Field
            label={
              intent?.kind === "reply"
                ? "Reply to " + intent.name
                : intent
                  ? "Edit your comment"
                  : "Add a comment"
            }
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={2000}
          />
          <View style={styles.row}>
            <Action
              label={intent?.kind === "edit" ? "Save edit" : "Post"}
              disabled={busy || !body.trim()}
              onPress={send}
            />
            {intent && (
              <Action
                quiet
                label="Cancel"
                onPress={() => {
                  setBody("");
                  setIntent(undefined);
                }}
              />
            )}
          </View>
        </>
      ) : (
        <Action
          quiet
          label="Sign in to join the discussion"
          onPress={() => router.push("/profile")}
        />
      )}
      <Status loading={comments.loading} error={comments.error} retry={comments.refresh} />
      {comments.data?.items.length === 0 && <Copy muted>No comments yet.</Copy>}
      {comments.data?.items.map((item) => comment(item))}
      <View style={styles.row}>
        {page > 1 && <Action quiet label="Previous comments" onPress={() => setPage(page - 1)} />}
        {comments.data?.hasMore && (
          <Action quiet label="More comments" onPress={() => setPage(page + 1)} />
        )}
      </View>
    </>
  );
}
