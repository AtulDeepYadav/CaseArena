import { describe, it, expect } from "vitest";
import { isPdfFile } from "./file-preview";

describe("isPdfFile", () => {
  it("recognizes the application/pdf mime type", () => {
    expect(isPdfFile("application/pdf", "whatever.docx")).toBe(true);
  });

  it("falls back to a .pdf filename extension when the type is missing", () => {
    expect(isPdfFile(null, "case-study.pdf")).toBe(true);
    expect(isPdfFile(undefined, "case-study.pdf")).toBe(true);
  });

  it("is case-insensitive on the extension", () => {
    expect(isPdfFile(null, "CASE-STUDY.PDF")).toBe(true);
  });

  it("returns false for non-PDF types and extensions", () => {
    expect(isPdfFile("image/png", "photo.png")).toBe(false);
    expect(isPdfFile("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "notes.docx")).toBe(
      false,
    );
  });

  it("returns false when both type and name are missing", () => {
    expect(isPdfFile(null, null)).toBe(false);
    expect(isPdfFile(undefined, undefined)).toBe(false);
  });
});
