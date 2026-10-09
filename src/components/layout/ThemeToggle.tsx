"use client";

import * as React from "react";
import { Monitor, Moon, Sun, SunMoon, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setThemePreference, type ThemePreference } from "@/lib/theme";
import { useThemePreference } from "@/lib/use-theme";
import { cn } from "@/lib/utils";

const OPTIONS: readonly {
  value: ThemePreference;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

function isThemePreference(value: unknown): value is ThemePreference {
  return OPTIONS.some((option) => option.value === value);
}

/**
 * The theme picker for a header: an icon button that opens a three-way menu.
 *
 * Until hydration the preference is unknown (it lives in `localStorage`), so
 * the button shows a neutral icon and the menu has nothing checked; the
 * page itself is already in the right theme from the inline script.
 */
export function ThemeMenu({ className }: { className?: string }) {
  const preference = useThemePreference();
  const current = OPTIONS.find((option) => option.value === preference);
  const Icon = current?.icon ?? SunMoon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={current ? `Theme: ${current.label}` : "Theme"}
            className={className}
          />
        }
      >
        <Icon aria-hidden="true" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={preference ?? ""}
            onValueChange={(value) => {
              if (isThemePreference(value)) {
                setThemePreference(value);
              }
            }}
          >
            {OPTIONS.map(({ value, label, icon: OptionIcon }) => (
              <DropdownMenuRadioItem key={value} value={value} closeOnClick>
                <OptionIcon aria-hidden="true" />
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The theme picker for a sidebar or drawer footer: three segments, built
 * like `ListToolbar`'s segmented filters (native radios, so arrow keys and
 * screen readers behave as for any radio group).
 */
export function ThemeSegmented({ className }: { className?: string }) {
  const preference = useThemePreference();
  const name = React.useId();

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn("grid grid-cols-3 gap-1 rounded-xl bg-muted p-1", className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <label
          key={value}
          className={cn(
            "flex min-h-9 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-1 text-xs font-medium text-muted-foreground transition-colors select-none pointer-coarse:min-h-11",
            "hover:text-foreground",
            "has-[:checked]:bg-popover has-[:checked]:text-foreground has-[:checked]:shadow-sm",
            "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"
          )}
        >
          <input
            type="radio"
            name={name}
            value={value}
            checked={preference === value}
            onChange={() => setThemePreference(value)}
            className="sr-only"
          />
          <Icon className="size-3.5 shrink-0" aria-hidden="true" />
          {label}
        </label>
      ))}
    </div>
  );
}
