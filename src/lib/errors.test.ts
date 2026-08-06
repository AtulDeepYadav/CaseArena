import { describe, it, expect } from "vitest";
import { errorMessage } from "./errors";

describe("errorMessage", () => {
  it("returns the Error's own message when given an Error instance", () => {
    expect(errorMessage(new Error("boom"), "fallback")).toBe("boom");
  });

  it("returns the fallback for anything that isn't an Error instance", () => {
    expect(errorMessage({ message: "not-a-real-error" }, "fallback")).toBe("fallback");
    expect(errorMessage("plain string", "fallback")).toBe("fallback");
    expect(errorMessage(null, "fallback")).toBe("fallback");
  });
});
