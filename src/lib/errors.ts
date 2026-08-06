/** Shared catch-block formatting: prefer a thrown Error's message, else a fallback. */
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}
