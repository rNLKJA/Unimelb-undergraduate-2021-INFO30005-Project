"use client";

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  type AiPrefs,
  DEFAULT_PREFS,
  type StoredKey,
  forgetAllKeys,
  loadAllKeys,
  loadPrefs,
  saveKey,
  savePrefs,
} from "@/lib/ai/settings";
import type { Credentials, Provider } from "@/lib/ai/types";
import { AiSettingsDialog } from "./ai-settings-dialog";

/*
 * Browser storage as an external store, so components re-render when the
 * settings change (in this tab or another) without effects or hydration
 * mismatches: the server snapshot is "not loaded yet".
 */
const listeners = new Set<() => void>();
let version = 0;
const emit = () => {
  version++;
  for (const l of listeners) l();
};
function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = () => emit();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
const getSnapshot = () => version;
const getServerSnapshot = () => -1;

const storages = () => ({
  session: typeof sessionStorage === "undefined" ? null : sessionStorage,
  local: typeof localStorage === "undefined" ? null : localStorage,
});

interface AiContextValue {
  /** False until browser storage has been read (always false on the server). */
  ready: boolean;
  prefs: AiPrefs;
  setPrefs: (prefs: AiPrefs) => void;
  storedKey: StoredKey | null;
  savedKeys: Partial<Record<Provider, StoredKey>>;
  saveApiKey: (key: string, remember: boolean) => void;
  forgetApiKeys: () => void;
  /** Ready-to-use credentials, or null when no key is set. */
  credentials: Credentials | null;
  settingsOpen: boolean;
  openSettings: () => void;
  setSettingsOpen: (open: boolean) => void;
}

const AiContext = createContext<AiContextValue | null>(null);

/**
 * Bring-your-own-key AI settings for the vendor portal. The key stays in
 * this browser (sessionStorage unless "remember on this device") and is
 * only ever sent to the chosen provider.
 */
export function AiProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = snapshot >= 0;
  const [settingsOpen, setSettingsOpen] = useState(false);

  const prefs = useMemo(
    () => (snapshot >= 0 ? loadPrefs(storages().local) : DEFAULT_PREFS),
    [snapshot],
  );
  const savedKeys = useMemo(() => {
    if (snapshot < 0) return {};
    const { session, local } = storages();
    return loadAllKeys(session, local);
  }, [snapshot]);
  const storedKey = savedKeys[prefs.provider] ?? null;

  const setPrefs = useCallback((next: AiPrefs) => {
    savePrefs(storages().local, next);
    emit();
  }, []);
  const saveApiKey = useCallback(
    (key: string, remember: boolean) => {
      const { session, local } = storages();
      saveKey(prefs.provider, key, remember, session, local);
      emit();
    },
    [prefs.provider],
  );
  const forgetApiKeys = useCallback(() => {
    const { session, local } = storages();
    forgetAllKeys(session, local);
    emit();
  }, []);

  // The dialog is opened from several buttons and rendered here, so Radix has
  // no trigger to hand focus back to: remember the opener ourselves.
  const opener = useRef<HTMLElement | null>(null);
  const openSettings = useCallback(() => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSettingsOpen(true);
  }, []);
  const returnFocus = useCallback((event: Event) => {
    const el = opener.current;
    opener.current = null;
    if (el && el.isConnected) {
      event.preventDefault();
      el.focus();
    }
  }, []);

  const credentials = useMemo<Credentials | null>(
    () =>
      storedKey
        ? {
            provider: prefs.provider,
            model: prefs.provider === "anthropic" ? prefs.anthropicModel : prefs.openaiModel,
            apiKey: storedKey.key,
          }
        : null,
    [prefs, storedKey],
  );

  const value: AiContextValue = {
    ready,
    prefs,
    setPrefs,
    storedKey,
    savedKeys,
    saveApiKey,
    forgetApiKeys,
    credentials,
    settingsOpen,
    openSettings,
    setSettingsOpen,
  };

  return (
    <AiContext.Provider value={value}>
      {children}
      <AiSettingsDialog onCloseAutoFocus={returnFocus} />
    </AiContext.Provider>
  );
}

export function useAi(): AiContextValue {
  const ctx = useContext(AiContext);
  if (!ctx) throw new Error("useAi must be used inside <AiProvider>");
  return ctx;
}
