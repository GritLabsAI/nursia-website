import path from "node:path";
import { defineConfig } from "vitest/config";

// Unit tests for server-side and plain TypeScript modules.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    environment: "node",
  },
});
