"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const ORDER = ["light", "dark", "system"] as const;
const LABEL = { light: "Light theme", dark: "Dark theme", system: "System theme" } as const;

const subscribe = () => () => {};

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const current = (
    mounted && (ORDER as readonly string[]).includes(theme ?? "") ? theme : "system"
  ) as (typeof ORDER)[number];
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
  const Icon = current === "light" ? Sun : current === "dark" ? Moon : Laptop;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      onClick={() => setTheme(next)}
      aria-label={`${LABEL[current]} (switch to ${LABEL[next].toLowerCase()})`}
      title={LABEL[current]}
    >
      <Icon className="size-[1.1rem]" />
    </Button>
  );
}
