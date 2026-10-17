import { cn } from "@/lib/utils";

const LEVELS = [
  { label: "Too short", tone: "bg-destructive", text: "text-destructive" },
  { label: "Weak", tone: "bg-destructive", text: "text-destructive" },
  { label: "Fair", tone: "bg-warning", text: "text-warning-strong" },
  { label: "Good", tone: "bg-success", text: "text-success" },
  { label: "Strong", tone: "bg-success", text: "text-success" },
] as const;

/** 0 (under the 8-character minimum) to 4. Guidance only — not enforced. */
function scorePassword(password: string): number {
  if (password.length < 8) {
    return 0;
  }

  let score = 1;

  if (password.length >= 12) score += 1;
  if (/[a-z]/i.test(password) && /\d/.test(password)) score += 1;
  if (/[^a-z0-9]/i.test(password) || (/[a-z]/.test(password) && /[A-Z]/.test(password))) score += 1;

  return Math.min(score, 4);
}

export function PasswordStrength({ password }: { password: string }) {
  if (!password) {
    return (
      <p className="text-xs text-muted-foreground">
        At least 8 characters. Mixing letters, numbers and symbols makes it
        stronger.
      </p>
    );
  }

  const score = scorePassword(password);
  const level = LEVELS[score];

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-4 gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((segment) => (
          <span
            key={segment}
            className={cn(
              "h-1 rounded-full transition-colors",
              segment <= Math.max(score, 1) ? level.tone : "bg-muted"
            )}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground" aria-live="polite">
        Password strength:{" "}
        <span className={cn("font-medium", level.text)}>{level.label}</span>
      </p>
    </div>
  );
}
