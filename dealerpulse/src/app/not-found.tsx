import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto grid max-w-6xl place-items-center px-4 py-24 text-center">
      <div>
        <p className="text-muted-foreground text-sm font-medium">404</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Record not found
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Return to the overview to find a branch, rep, or lead.
        </p>
        <Link href="/" className={buttonVariants({ className: "mt-6" })}>
          Back to overview
        </Link>
      </div>
    </main>
  );
}
