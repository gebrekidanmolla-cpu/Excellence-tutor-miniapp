import { Suspense } from "react";
import ApplicationSuccessContent from "./ApplicationSuccessContent";

export default function ApplicationSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center p-6">
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Loading...
            </p>
          </div>
        </main>
      }
    >
      <ApplicationSuccessContent />
    </Suspense>
  );
}