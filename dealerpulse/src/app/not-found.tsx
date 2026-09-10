import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto grid max-w-6xl place-items-center px-4 py-24 text-center">
      <div>
        <p className="text-muted-foreground text-sm font-medium">404</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          That branch or rep doesn&apos;t exist
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          The record you&apos;re looking for isn&apos;t in this dataset.
        </p>
        <Link href="/" className={buttonVariants({ className: "mt-6" })}>
          Back to overview
        </Link>
      </div>
    </main>
  );
}
