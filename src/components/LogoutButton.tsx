"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/**
 * Tutor sign-out. `/api/auth/logout` answers with JSON — unlike the admin
 * logout, which redirects and therefore has to stay a form POST.
 *
 * A failure used to reset the button silently; it now says what happened.
 */
export default function LogoutButton() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Logout failed.");
      }

      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Could not sign you out. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      variant="outline"
      size="lg"
      className="w-full"
    >
      <LogOut data-icon="inline-start" aria-hidden="true" />
      {loading ? "Signing out…" : "Sign out"}
    </Button>
  );
}
