import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";
import {
  audienceEmailSchema,
  audienceLoginSchema,
  audienceProfileUpdateSchema,
  audienceRegisterSchema,
} from "@biling/schemas";
import { api, request } from "../../src/api";
import { useResource } from "../../src/resource";
import { useSession } from "../../src/session";
import {
  Action,
  Card,
  Copy,
  dateLabel,
  Field,
  gameRoute,
  Heading,
  Label,
  Screen,
  Status,
  styles,
  Title,
} from "../../src/ui";

function AccountForm() {
  const session = useSession();
  const capabilities = useResource("capabilities", api.capabilities);
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "resend">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const registration = capabilities.data?.registration;
  const recovery = mode === "forgot" || mode === "resend";

  async function submit() {
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      const form = { email, password };
      if (mode === "login") await session.signIn(await api.login(audienceLoginSchema.parse(form)));
      else if (mode === "register") {
        await request("/audience/register", {
          method: "POST",
          body: audienceRegisterSchema.parse({ ...form, username, displayName }),
        });
        setNotice(
          registration === "verify"
            ? "If registration is available for this address, look for a verification link in your inbox."
            : "Registration submitted. You can now try signing in.",
        );
        setPassword("");
        setMode("login");
      } else {
        await request(
          "/audience/" + (mode === "forgot" ? "forgot-password" : "resend-verification"),
          { method: "POST", body: audienceEmailSchema.parse({ email }) },
        );
        setNotice("If the address is eligible, check your inbox for a link.");
        setMode("login");
      }
    } catch (err) {
      setError(
        err instanceof Error && "issues" in err
          ? "Check the fields. New passwords need at least 12 characters and usernames need 3–24 letters, numbers, or underscores."
          : err instanceof Error
            ? err.message
            : "Could not complete the request.",
      );
    } finally {
      setBusy(false);
    }
  }

  const labels = {
    login: "Sign in",
    register: "Create account",
    forgot: "Send reset link",
    resend: "Send verification link",
  };
  function switchMode(next: typeof mode) {
    setMode(next);
    setError(undefined);
    setNotice(undefined);
    setPassword("");
  }
  return (
    <>
      <Heading>{labels[mode]}</Heading>
      <Status error={error} />
      {notice && <Copy>{notice}</Copy>}
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        maxLength={254}
      />
      {mode === "register" && (
        <>
          <Field
            label="Display name"
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={60}
          />
          <Field
            label="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            maxLength={24}
          />
        </>
      )}
      {!recovery && (
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          maxLength={128}
          onSubmitEditing={() => {
            if (!busy) void submit();
          }}
        />
      )}
      <Action label={busy ? "Please wait…" : labels[mode]} disabled={busy} onPress={submit} />
      {mode === "login" ? (
        <>
          <Status error={capabilities.error} retry={capabilities.refresh} />
          {(registration === "local" || registration === "verify") && (
            <Action
              quiet
              disabled={busy}
              label="Create account"
              onPress={() => switchMode("register")}
            />
          )}
          {registration === "unavailable" && (
            <Copy muted>Registration is currently unavailable.</Copy>
          )}
          {capabilities.data?.emailAvailable && (
            <View style={styles.row}>
              <Action
                quiet
                disabled={busy}
                label="Forgot password"
                onPress={() => switchMode("forgot")}
              />
              <Action
                quiet
                disabled={busy}
                label="Resend verification"
                onPress={() => switchMode("resend")}
              />
            </View>
          )}
        </>
      ) : (
        <Action quiet disabled={busy} label="Back to sign in" onPress={() => switchMode("login")} />
      )}
    </>
  );
}

function Member() {
  const { user, token, setUser, signOut } = useSession();
  const [edit, setEdit] = useState(false);
  const [displayName, setName] = useState("");
  const [username, setUsername] = useState("");
  const [biography, setBio] = useState("");
  const [avatarUrl, setAvatar] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const history = useResource(token ?? "guest", () =>
    token ? api.history(token) : Promise.resolve([]),
  );
  useFocusEffect(
    useCallback(() => {
      void history.refresh();
    }, [history.refresh]),
  );

  if (!user || !token) return null;
  const profile = user;
  function beginEdit() {
    setError(undefined);
    setName(profile.displayName);
    setUsername(profile.username);
    setBio(profile.biography ?? "");
    setAvatar(profile.avatarUrl ?? "");
    setEdit(true);
  }
  async function act(action: () => Promise<void>) {
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen tab refresh={history.refresh} refreshing={history.loading}>
      <Label>Profile</Label>
      <Title>{profile.displayName}</Title>
      <Copy muted>@{profile.username}</Copy>
      <Copy>{profile.email}</Copy>
      {profile.biography && <Copy>{profile.biography}</Copy>}
      <Status error={error} />
      {edit ? (
        <>
          <Field label="Display name" value={displayName} onChangeText={setName} maxLength={60} />
          <Field
            label="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            maxLength={24}
          />
          <Field
            label="Biography"
            value={biography}
            onChangeText={setBio}
            multiline
            maxLength={320}
          />
          <Field
            label="Avatar HTTPS URL"
            value={avatarUrl}
            onChangeText={setAvatar}
            autoCapitalize="none"
            keyboardType="url"
            maxLength={2048}
          />
          <Action
            disabled={busy}
            label="Save profile"
            onPress={() =>
              act(async () => {
                const parsed = audienceProfileUpdateSchema.safeParse({
                  displayName,
                  username,
                  biography: biography.trim() || null,
                  avatarUrl: avatarUrl.trim() || null,
                });
                if (!parsed.success)
                  throw new Error(parsed.error.issues[0]?.message ?? "Check your profile fields.");
                setUser(await api.update(token, parsed.data));
                setEdit(false);
              })
            }
          />
          <Action
            quiet
            disabled={busy}
            label="Cancel"
            onPress={() => {
              setError(undefined);
              setEdit(false);
            }}
          />
        </>
      ) : (
        <Action quiet label="Edit profile" disabled={busy} onPress={beginEdit} />
      )}
      <Heading>Game history</Heading>
      <Status loading={history.loading} error={history.error} retry={history.refresh} />
      {history.data?.length === 0 && <Copy muted>Your saved attempts will appear here.</Copy>}
      {history.data?.map((entry) => (
        <Card
          key={entry.id}
          title={entry.game.title}
          meta={
            (entry.game.type === "PERSONALITY"
              ? "Quiz completed"
              : entry.score + " / " + entry.totalQuestions) +
            " · " +
            dateLabel(entry.completedAt)
          }
          href={gameRoute(entry.game.slug)}
        />
      ))}
      <Action quiet disabled={busy} label="Sign out" onPress={() => act(signOut)} />
    </Screen>
  );
}

export default function Profile() {
  const session = useSession();
  if (session.user) return <Member />;
  return (
    <Screen tab>
      <Title>Profile</Title>
      <Status loading={!session.ready} error={session.problem} retry={session.restore} />
      {session.ready && !session.problem && <AccountForm />}
    </Screen>
  );
}
