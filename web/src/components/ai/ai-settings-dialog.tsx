"use client";

import { Eye, EyeOff, KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ANTHROPIC_MODELS, DEFAULT_OPENAI_MODEL } from "@/lib/ai/models";
import { keySaveAction, maskKey } from "@/lib/ai/settings";
import { PROVIDER_LABEL, type Provider } from "@/lib/ai/types";
import { cn } from "@/lib/utils";
import { useAi } from "./ai-provider";

export function AiSettingsDialog({
  onCloseAutoFocus,
}: {
  onCloseAutoFocus?: (event: Event) => void;
}) {
  const { settingsOpen, setSettingsOpen } = useAi();
  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent
        onCloseAutoFocus={onCloseAutoFocus}
        className="max-h-[92dvh] overflow-y-auto sm:max-w-lg"
      >
        {/* Remount the form each time the dialog opens so it starts from saved state. */}
        {settingsOpen ? <SettingsForm onDone={() => setSettingsOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid gap-1 rounded-xl bg-muted p-1 sm:grid-flow-col"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"

          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors sm:text-center",
            o.value === value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Everything in the form is a draft until Save: closing the dialog (Escape,
 * the close button, a click outside) changes nothing. The "remember" switch
 * follows the selected provider's saved key and only moves a saved key
 * between session and local storage when the visitor flips it themselves.
 */
function SettingsForm({ onDone }: { onDone: () => void }) {
  const { prefs, setPrefs, savedKeys, saveApiKey, forgetApiKeys } = useAi();
  const [provider, setProviderDraft] = useState<Provider>(prefs.provider);
  const [anthropicModel, setAnthropicModel] = useState(prefs.anthropicModel);
  const [openaiModel, setOpenaiModel] = useState(prefs.openaiModel);
  const storedKey = savedKeys[provider] ?? null;
  const otherSaved = (Object.keys(savedKeys) as Provider[]).filter((p) => p !== provider);
  const anySaved = Object.keys(savedKeys).length > 0;
  const [draftKey, setDraftKey] = useState("");
  const [remember, setRemember] = useState(storedKey?.remembered ?? false);
  const [rememberTouched, setRememberTouched] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const setProvider = (next: Provider) => {
    setProviderDraft(next);
    setDraftKey("");
    setRemember(savedKeys[next]?.remembered ?? false);
    setRememberTouched(false);
  };

  const save = () => {
    setPrefs({
      provider,
      anthropicModel,
      openaiModel: openaiModel.trim() || DEFAULT_OPENAI_MODEL,
    });
    const action = keySaveAction({ draftKey, stored: storedKey, remember, rememberTouched });
    if (action) saveApiKey(provider, action.key, action.remember);
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <KeyRound className="size-5 text-primary" aria-hidden /> AI settings
        </DialogTitle>
        <DialogDescription>
          Optional. Everything in Snacks in a Van works without a key. With your own key you can ask
          for an AI-written shift summary on the vendor page.
        </DialogDescription>
      </DialogHeader>

      <div className="flex gap-2.5 rounded-xl border bg-muted/50 p-3 text-xs leading-relaxed">
        <ShieldCheck
          className="mt-0.5 size-4 shrink-0 text-matcha-600 dark:text-matcha-400"
          aria-hidden
        />
        <p>
          Your key stays in this browser. Requests go{" "}
          <strong>directly from your browser to {PROVIDER_LABEL[provider]}</strong>. This app&apos;s
          server never receives the key: it only gets a record of each call (prompt, reply, model,
          timing, tokens) for the audit log, and refuses anything that looks like a key. Calls are
          billed to your account by the provider.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Provider</span>
          <Choice
            label="AI provider"
            value={provider}
            onChange={setProvider}
            options={[
              { value: "anthropic", label: "Anthropic (default)" },
              { value: "openai", label: "OpenAI" },
            ]}
          />
        </div>

        {provider === "anthropic" ? (
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Model</span>
            <Choice
              label="Claude model"
              value={anthropicModel}
              onChange={setAnthropicModel}
              options={ANTHROPIC_MODELS.map((m) => ({ value: m.id, label: m.label }))}
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label
              htmlFor="ai-openai-model"
              className="text-xs font-semibold text-muted-foreground"
            >
              Model id
            </Label>
            <Input
              id="ai-openai-model"
              value={openaiModel}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => setOpenaiModel(e.target.value)}
              placeholder={DEFAULT_OPENAI_MODEL}
              className="h-10 rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              Any Chat Completions model that supports JSON-schema output.
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="ai-key" className="text-xs font-semibold text-muted-foreground">
            {PROVIDER_LABEL[provider]} API key
          </Label>
          <div className="flex gap-2">
            <Input
              id="ai-key"
              type={showKey ? "text" : "password"}
              value={draftKey}
              onChange={(e) => setDraftKey(e.target.value)}
              placeholder={storedKey ? `Saved: ${maskKey(storedKey.key)}` : "Paste your key"}
              autoComplete="off"
              spellCheck={false}
              aria-describedby="ai-key-status"
              className="h-10 rounded-xl"
            />
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              onClick={() => setShowKey((s) => !s)}
              aria-label={showKey ? "Hide key" : "Show key"}
            >
              {showKey ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
            </Button>
          </div>
          <p id="ai-key-status" className="text-xs text-muted-foreground" aria-live="polite">
            {storedKey
              ? storedKey.remembered
                ? `A key (${maskKey(storedKey.key)}) is remembered on this device.`
                : `A key (${maskKey(storedKey.key)}) is saved for this tab only.`
              : `No ${PROVIDER_LABEL[provider]} key saved.`}
            {otherSaved.map((p) => (
              <span key={p} className="block">
                {PROVIDER_LABEL[p]}: a key ({maskKey(savedKeys[p]!.key)}) is also{" "}
                {savedKeys[p]!.remembered ? "remembered on this device" : "saved for this tab"}.
              </span>
            ))}
          </p>
        </div>

        <div className="flex items-start justify-between gap-3 rounded-xl border p-3">
          <Label htmlFor="ai-remember" className="block text-sm leading-snug font-medium">
            Remember on this device
            <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
              Off: kept in session storage, cleared when the tab closes or you log out. On: kept in
              local storage, even after you log out, until you forget it.
            </span>
          </Label>
          <Switch
            id="ai-remember"
            checked={remember}
            onCheckedChange={(on) => {
              setRemember(on);
              setRememberTouched(true);
            }}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        What the AI feature does and never does:{" "}
        <Link href="/methods#ai-use" onClick={onDone} className="underline underline-offset-4">
          AI use statement
        </Link>
        . Every call made through the app is listed in the AI audit log (records area,{" "}
        <code>/admin/ai-log</code>).
      </p>

      <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:items-center">
        {anySaved ? (
          <Button
            type="button"
            variant="destructive"
            className="h-10 rounded-xl sm:mr-auto"
            onClick={() => {
              forgetApiKeys();
              setDraftKey("");
              setRemember(false);
              setRememberTouched(false);
            }}
          >
            <Trash2 aria-hidden />{" "}
            {Object.keys(savedKeys).length > 1 ? "Forget all keys" : "Forget key"}
          </Button>
        ) : null}
        <Button type="button" className="h-10 rounded-xl" onClick={save}>
          Save
        </Button>
      </DialogFooter>
    </>
  );
}
