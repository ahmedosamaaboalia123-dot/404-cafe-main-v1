import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    include: ["tests/**/*.{test,spec}.{js,jsx,mjs}", "src/**/*.{test,spec}.{js,jsx}"],
    restoreMocks: true,
    clearMocks: true,
    // Full-app imports (router smoke) compile a large graph; allow headroom under parallel load.
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: { reporter: ["text", "html"] },
  },
});
