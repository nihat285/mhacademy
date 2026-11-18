import type { ActionState } from "@/components/ui/action-form";
import { AuthError } from "@/lib/auth";

const GENERIC_ERROR = "Gözlənilməyən xəta baş verdi. Bir az sonra yenidən cəhd edin.";

/** redirect() / notFound() work by throwing; those must reach Next.js untouched. */
function isNextControlFlow(e: unknown): boolean {
  const digest = (e as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_") || digest === "DYNAMIC_SERVER_USAGE");
}

/**
 * Wraps the body of a Server Action so it always resolves to an ActionState:
 * auth problems and unexpected errors become a user-facing message instead of a crashed request.
 * Expected business errors should be returned by the callback itself (e.g. `{ error: "..." }`).
 */
export async function run(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await fn();
  } catch (e) {
    if (isNextControlFlow(e)) throw e;
    if (e instanceof AuthError) {
      return { error: e.status === 401 ? "Daxil olmaq tələb olunur." : "Bu əməliyyat üçün icazəniz yoxdur." };
    }
    console.error("server action failed", e);
    return { error: GENERIC_ERROR };
  }
}
