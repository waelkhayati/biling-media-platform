import type { AudienceProfile } from "@biling/contracts";

export function AudienceEmailField() {
  return (
    <label>
      Email
      <input name="email" type="email" autoComplete="email" maxLength={254} required />
    </label>
  );
}

export function AudiencePasswordField({
  create = false,
  confirm = false,
}: {
  create?: boolean;
  confirm?: boolean;
}) {
  return (
    <label>
      {confirm
        ? "Confirm new password"
        : create
          ? "New password (at least 12 characters)"
          : "Password"}
      <input
        name={confirm ? "confirmPassword" : "password"}
        type="password"
        autoComplete={create || confirm ? "new-password" : "current-password"}
        minLength={create || confirm ? 12 : undefined}
        maxLength={128}
        required
      />
    </label>
  );
}

export function AudienceProfileFields({ profile }: { profile?: AudienceProfile }) {
  return (
    <>
      <label>
        Display name
        <input
          name="displayName"
          autoComplete="nickname"
          maxLength={60}
          defaultValue={profile?.displayName}
          required
        />
      </label>
      <label>
        Username
        <input
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          minLength={3}
          maxLength={24}
          pattern="[a-zA-Z0-9_]{3,24}"
          defaultValue={profile?.username}
          required
        />
        <small>3 to 24 letters, numbers or underscores.</small>
      </label>
      {profile && (
        <>
          <label>
            Biography
            <textarea
              name="biography"
              maxLength={320}
              rows={3}
              defaultValue={profile.biography ?? ""}
            />
          </label>
          <label>
            Avatar image URL
            <input
              name="avatarUrl"
              type="url"
              inputMode="url"
              maxLength={2048}
              defaultValue={profile.avatarUrl ?? ""}
              placeholder="https://"
            />
          </label>
        </>
      )}
    </>
  );
}
