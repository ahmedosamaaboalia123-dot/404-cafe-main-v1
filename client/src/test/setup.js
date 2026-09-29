import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { mockServer } from "./server";

beforeAll(() => mockServer.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  mockServer.resetHandlers();
  localStorage.clear();
  sessionStorage.clear();
});
afterAll(() => mockServer.close());
