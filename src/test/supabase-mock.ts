import { vi } from "vitest";

export type MockResult<T = unknown> = {
  data: T;
  error: { message: string; code?: string } | null;
};

const CHAIN_METHODS = [
  "select",
  "insert",
  "update",
  "upsert",
  "delete",
  "eq",
  "in",
  "order",
  "limit",
] as const;

/** A chainable Postgrest-like query builder mock that resolves to `result` when awaited. */
export function makeQueryBuilder(result: MockResult) {
  const builder: Record<string, unknown> = {};
  for (const method of CHAIN_METHODS) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(async () => result);
  builder.single = vi.fn(async () => result);
  builder.then = (onFulfilled?: (v: MockResult) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  return builder;
}

export type SupabaseMockConfig = {
  tables?: Record<string, MockResult>;
  storage?: {
    upload?: MockResult;
    createSignedUrl?: { data: { signedUrl: string } | null; error: { message: string } | null };
    getPublicUrl?: { data: { publicUrl: string } };
  };
  auth?: {
    updateUser?: { data: unknown; error: { message: string } | null };
  };
};

/** Builds a minimal fake of the `supabase` client singleton used across route files. */
export function makeSupabaseMock(config: SupabaseMockConfig = {}) {
  const tables = config.tables ?? {};

  const from = vi.fn((table: string) =>
    makeQueryBuilder(tables[table] ?? { data: null, error: null }),
  );

  const storage = {
    from: vi.fn(() => ({
      upload: vi.fn(async () => config.storage?.upload ?? { data: {}, error: null }),
      createSignedUrl: vi.fn(
        async () =>
          config.storage?.createSignedUrl ?? {
            data: { signedUrl: "https://signed.example/file" },
            error: null,
          },
      ),
      getPublicUrl: vi.fn(
        () =>
          config.storage?.getPublicUrl ?? {
            data: { publicUrl: "https://public.example/avatar.png" },
          },
      ),
    })),
  };

  const auth = {
    updateUser: vi.fn(async () => config.auth?.updateUser ?? { data: {}, error: null }),
  };

  return { from, storage, auth };
}
