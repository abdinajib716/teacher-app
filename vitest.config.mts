import { defineConfig } from "vitest/config"
import path from "node:path"

/**
 * Unit tests for the pure logic in src/lib: time zone and school-day rules,
 * attendance percentages, phone numbers, import validation, PDF rendering and
 * the auth helpers. Wrappers around Prisma and Resend are out of scope.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // bcrypt at cost 12 is slow on purpose; on a busy machine the password
    // tests need more than the default 5s.
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "text", "html"],
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/prisma.ts", "src/lib/email.ts", "src/lib/data/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // `server-only` throws outside a React Server Component bundle.
      "server-only": path.resolve(import.meta.dirname, "src/test/empty.ts"),
    },
  },
})
