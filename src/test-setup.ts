import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

class NoIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

/** Stub browser APIs missing in jsdom. */
function stubBrowserApis() {
  vi.stubGlobal("IntersectionObserver", NoIntersectionObserver);
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
}

stubBrowserApis();

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  stubBrowserApis();
});
