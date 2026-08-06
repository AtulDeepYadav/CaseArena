// Standalone vitest config — deliberately does NOT touch vite.config.ts
// (which wraps @lovable.dev/vite-tanstack-config for the production build).
// Keeping test config separate means test tooling can never affect the
// production build pipeline.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // EPIC-02 (Account Management + Case Repository) owns these files;
      // pre-existing untested code from other epics is intentionally excluded.
      include: [
        "src/lib/bookmarks.ts",
        "src/lib/errors.ts",
        "src/lib/profile.ts",
        "src/lib/user-settings.ts",
        "src/routes/_authenticated/bookmarks.tsx",
        "src/routes/_authenticated/profile.tsx",
        "src/routes/_authenticated/settings.tsx",
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
