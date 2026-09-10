"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Root error boundary. Surfaces data-validation failures cleanly. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto grid max-w-6xl place-items-center px-4 py-24 text-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="text-muted-foreground mt-2 max-w-md text-sm">
          The dashboard couldn&apos;t render this view. This usually means the
          dataset failed validation.
        </p>
        <Button onClick={reset} className="mt-6">
          Try again
        </Button>
      </div>
    </main>
  );
}
