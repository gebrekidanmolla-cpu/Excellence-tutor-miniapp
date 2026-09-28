/**
 * How complete a tutor's profile is, as a percentage plus a checklist.
 *
 * Registration already guarantees the required fields and documents, so they
 * count as one block that is always done. The rest of the score comes from
 * the optional extras that make a tutor stand out to admins and families:
 * a photo, a real "About me", and a CV. The dashboard and `/tutor/profile`
 * both render this, so the weights live here once.
 *
 * Pure and client-safe.
 */

/** Shorter than this, an "About me" is a placeholder rather than an introduction. */
export const ABOUT_ME_MIN_LENGTH = 40;

export type ProfileStrengthItem = {
  id: "registration" | "photo" | "aboutMe" | "cv";
  label: string;
  description: string;
  weight: number;
  done: boolean;
  /** Where the tutor goes to complete it. */
  href: string;
};

export type ProfileStrength = {
  percent: number;
  level: "Getting started" | "Good" | "Strong" | "Complete";
  items: ProfileStrengthItem[];
  /** The first unfinished item, for a single "next step" prompt. */
  next: ProfileStrengthItem | null;
};

export function profileStrength(tutor: {
  profilePhotoUrl: string | null;
  aboutMe: string | null;
  cvUrl: string | null;
}): ProfileStrength {
  const items: ProfileStrengthItem[] = [
    {
      id: "registration",
      label: "Account and documents",
      description: "Your details and required documents from registration.",
      weight: 40,
      done: true,
      href: "/tutor/profile",
    },
    {
      id: "photo",
      label: "Profile photo",
      description: "A clear, friendly photo of your face builds trust.",
      weight: 20,
      done: Boolean(tutor.profilePhotoUrl),
      href: "/tutor/profile#photo",
    },
    {
      id: "aboutMe",
      label: "About me",
      description: `Introduce yourself in at least ${ABOUT_ME_MIN_LENGTH} characters — subjects, experience, teaching style.`,
      weight: 20,
      done: (tutor.aboutMe?.trim().length ?? 0) >= ABOUT_ME_MIN_LENGTH,
      href: "/tutor/profile/edit#about",
    },
    {
      id: "cv",
      label: "CV / Resume",
      description: "Shows your experience at a glance. Image or PDF.",
      weight: 20,
      done: Boolean(tutor.cvUrl),
      href: "/tutor/profile#documents",
    },
  ];

  const percent = items.reduce(
    (sum, item) => sum + (item.done ? item.weight : 0),
    0
  );

  const level =
    percent >= 100
      ? "Complete"
      : percent >= 80
        ? "Strong"
        : percent >= 60
          ? "Good"
          : "Getting started";

  return {
    percent,
    level,
    items,
    next: items.find((item) => !item.done) ?? null,
  };
}
