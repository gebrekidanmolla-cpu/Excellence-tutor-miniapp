import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import ApplicationSuccessContent from "./ApplicationSuccessContent";

export const metadata = {
  title: "Application submitted",
};

export default function ApplicationSuccessPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-12">
      <Suspense
        fallback={
          <div className="w-full max-w-lg" aria-hidden="true">
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        }
      >
        <ApplicationSuccessContent />
      </Suspense>
    </main>
  );
}
