import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://127.0.0.1:8000" } },
  test: {
    environment: "jsdom",
    // A concrete origin gives jsdom independent, standards-compliant storage on
    // every supported Node runtime; Node 26 otherwise exposes an unavailable
    // experimental storage object to the test workers.
    environmentOptions: { jsdom: { url: "http://localhost/" } },
    // UI tests use real date-picker interactions. Allow slower supported Node
    // runtimes to complete them without changing the assertions themselves.
    testTimeout: 15_000,
    setupFiles: "./tests/setup.ts",
    clearMocks: true,
    restoreMocks: true,
  },
});
