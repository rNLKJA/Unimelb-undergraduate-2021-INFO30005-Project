"use client";

import { Check } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { setAvatarAction } from "@/app/customer/actions";
import { avatarSrc, SnackImage } from "@/components/shared/snack-image";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  cappuccino: "Cappuccino",
  latte: "Latte",
  "flat-white": "Flat White",
  "long-black": "Long Black",
  "plain-biscuit": "Plain Biscuit",
  "fancy-biscuit": "Fancy Biscuit",
  "small-cake": "Small Cake",
  "large-cake": "Large Cake",
};

/** Replaces the original "enter an Unsplash image ID" profile picture field. */
export function AvatarPicker({
  current,
  choices,
}: {
  current: string;
  choices: readonly string[];
}) {
  const [optimistic, setOptimistic] = useOptimistic(current);
  const [, startTransition] = useTransition();
  return (
    <fieldset>
      <legend className="text-lg font-semibold">Profile picture</legend>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        Pick a snack to represent you on the community board. (In 2021 this was an Unsplash photo
        ID.)
      </p>
      <div className="grid grid-cols-4 gap-3">
        {choices.map((key) => {
          const active = key === optimistic;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              aria-label={`Use ${LABELS[key] ?? key} as profile picture`}
              onClick={() =>
                startTransition(async () => {
                  setOptimistic(key);
                  const result = await setAvatarAction(key);
                  if (result.status === "error") toast.error(result.message);
                })
              }
              className={cn(
                "relative rounded-2xl border-2 p-1 transition",
                active ? "border-primary bg-primary/5" : "border-transparent hover:border-border",
              )}
            >
              <SnackImage src={avatarSrc(key)} alt="" size={96} className="h-auto w-full" />
              {active ? (
                <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3" aria-hidden />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
