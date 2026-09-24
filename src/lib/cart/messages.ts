/**
 * Shown when there is nothing more specific and nothing worth exposing.
 *
 * Lives outside `actions.ts` on purpose: a `"use server"` file may only export async
 * functions (Next.js enforces this at build time), so a plain string constant can't live
 * there. Both `actions.ts` and `CartProvider` (for when a Server Action call itself rejects,
 * rather than resolving with `{ ok: false }`) import this one string, so there is exactly one
 * "something went wrong" message rather than two that could drift apart.
 */
export const GENERIC_ERROR = "Something went wrong. Please try again.";
