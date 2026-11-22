import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AudienceProfile, AudienceSession } from "@biling/contracts";
import { audienceTokenSchema } from "@biling/schemas";
import { api, ApiError, request } from "./api";

const key = "biling.audience.session";
const storage = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const SessionContext = createContext<{
  token?: string;
  user?: AudienceProfile;
  ready: boolean;
  problem?: string;
  restore: () => Promise<void>;
  signIn: (session: AudienceSession) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: AudienceProfile) => void;
} | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string>();
  const [user, setUser] = useState<AudienceProfile>();
  const [ready, setReady] = useState(false);
  const [problem, setProblem] = useState<string>();

  async function restore() {
    setReady(false);
    setProblem(undefined);
    try {
      const saved = await SecureStore.getItemAsync(key);
      if (!saved) return;
      const restored = audienceTokenSchema.parse(saved);
      const profile = await api.me(restored);
      setToken(restored);
      setUser(profile);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch {
          setProblem("Could not clear the expired session. Try again.");
        }
      } else {
        setProblem("Could not restore your session. Try again when connected.");
      }
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    void restore();
  }, []);

  async function signIn(session: AudienceSession) {
    await SecureStore.setItemAsync(key, session.token, storage);
    setToken(session.token);
    setUser(session.user);
    setProblem(undefined);
  }

  async function signOut() {
    try {
      await request("/audience/logout", { method: "POST", token });
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) throw error;
    }
    await SecureStore.deleteItemAsync(key);
    setToken(undefined);
    setUser(undefined);
  }

  return (
    <SessionContext.Provider
      value={{ token, user, ready, problem, restore, signIn, signOut, setUser }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("Missing session provider");
  return session;
}
