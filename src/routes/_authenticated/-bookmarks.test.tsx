import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQueryClient } from "@/test/render";
import { makeQueryBuilder } from "@/test/supabase-mock";

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({
      children,
      to,
      params,
    }: {
      children: ReactNode;
      to: string;
      params?: Record<string, string>;
    }) => {
      const href = params
        ? to.replace(/\$([a-zA-Z0-9_]+)/g, (_, key) => params[key] ?? `$${key}`)
        : to;
      return <a href={href}>{children}</a>;
    },
  };
});

const supabaseMock = { from: vi.fn(), storage: { from: vi.fn() } };
vi.mock("@/integrations/supabase/client", () => ({ supabase: supabaseMock }));

const windowOpen = vi.fn();

// Imported after the mocks above so it picks up the mocked modules.
const { BookmarksPage, Route } = await import("./bookmarks");

function mockBookmarks(
  rows: { id: string; created_at: string; file_id: string | null; attempt_id: string | null }[],
) {
  return { data: rows, error: null };
}

const FILE_A = {
  id: "file-a",
  title: "Profitability Case",
  description: "A profitability teardown",
  category: "Consulting",
  tags: ["excel", "framework"],
  storage_path: "user-1/file-a.pdf",
  file_name: "case.pdf",
  file_type: "application/pdf",
};

const FILE_B = {
  id: "file-b",
  title: "Untagged note",
  description: null,
  category: null,
  tags: null,
  storage_path: null,
  file_name: null,
  file_type: null,
};

const FILE_DOCX = {
  ...FILE_A,
  id: "file-docx",
  title: "Interview Notes",
  file_name: "notes.docx",
  file_type: "application/msword",
};

const ATTEMPT = { id: "attempt-a", case_title: "Market entry drill", category: "Consulting" };

beforeEach(() => {
  vi.clearAllMocks();
  window.open = windowOpen;
});

describe("Route", () => {
  it("declares page metadata", () => {
    const head = Route.options.head?.();
    expect(head?.meta?.[0]).toEqual({ title: "Bookmarks — CaseArena" });
  });
});

describe("BookmarksPage", () => {
  it("shows loading skeletons while the bookmarks query is pending", () => {
    supabaseMock.from.mockImplementation(() => makeQueryBuilder({ data: null, error: null }));
    // Override `then` so the promise never settles during this test.
    const pending = makeQueryBuilder({ data: null, error: null });
    (pending as Record<string, unknown>).then = () => {};
    supabaseMock.from.mockReturnValueOnce(pending);

    const { container } = renderWithQueryClient(<BookmarksPage />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders an empty state when there are no bookmarks", async () => {
    supabaseMock.from.mockImplementation(() => makeQueryBuilder(mockBookmarks([])));
    renderWithQueryClient(<BookmarksPage />);
    expect(await screen.findByText(/nothing bookmarked yet/i)).toBeInTheDocument();
  });

  it("renders a file bookmark with category/tags and downloads it", async () => {
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "bookmarks")
        return makeQueryBuilder(
          mockBookmarks([
            { id: "bm-1", created_at: "2026-01-01", file_id: "file-a", attempt_id: null },
          ]),
        );
      if (table === "files") return makeQueryBuilder({ data: [FILE_A], error: null });
      return makeQueryBuilder({ data: [], error: null });
    });
    const createSignedUrl = vi.fn(async () => ({
      data: { signedUrl: "https://signed.example/case.pdf" },
      error: null,
    }));
    supabaseMock.storage.from.mockReturnValue({ createSignedUrl });

    renderWithQueryClient(<BookmarksPage />);
    expect(await screen.findByText("Profitability Case")).toBeInTheDocument();
    expect(screen.getByText("Consulting")).toBeInTheDocument();
    expect(screen.getByText("excel")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /download/i }));
    await waitFor(() =>
      expect(windowOpen).toHaveBeenCalledWith(
        "https://signed.example/case.pdf",
        "_blank",
        "noopener",
      ),
    );
  });

  it("views a PDF file inline", async () => {
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "bookmarks")
        return makeQueryBuilder(
          mockBookmarks([
            { id: "bm-1", created_at: "2026-01-01", file_id: "file-a", attempt_id: null },
          ]),
        );
      if (table === "files") return makeQueryBuilder({ data: [FILE_A], error: null });
      return makeQueryBuilder({ data: [], error: null });
    });
    const createSignedUrl = vi.fn(async () => ({
      data: { signedUrl: "https://signed.example/case.pdf" },
      error: null,
    }));
    supabaseMock.storage.from.mockReturnValue({ createSignedUrl });

    renderWithQueryClient(<BookmarksPage />);
    await userEvent.click(await screen.findByRole("button", { name: /^view$/i }));
    expect(createSignedUrl).toHaveBeenCalledWith("user-1/file-a.pdf", 60);
    const iframe = await screen.findByTitle("case.pdf");
    expect(iframe).toHaveAttribute("src", "https://signed.example/case.pdf");

    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows a fallback in the dialog for a non-PDF file", async () => {
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "bookmarks")
        return makeQueryBuilder(
          mockBookmarks([
            { id: "bm-7", created_at: "2026-01-01", file_id: "file-docx", attempt_id: null },
          ]),
        );
      if (table === "files") return makeQueryBuilder({ data: [FILE_DOCX], error: null });
      return makeQueryBuilder({ data: [], error: null });
    });
    const createSignedUrl = vi.fn();
    supabaseMock.storage.from.mockReturnValue({ createSignedUrl });

    renderWithQueryClient(<BookmarksPage />);
    await userEvent.click(await screen.findByRole("button", { name: /^view$/i }));
    expect(await screen.findByText(/only available for pdf files/i)).toBeInTheDocument();
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("warns when viewing a file with no attachment", async () => {
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "bookmarks")
        return makeQueryBuilder(
          mockBookmarks([
            { id: "bm-2", created_at: "2026-01-01", file_id: "file-b", attempt_id: null },
          ]),
        );
      if (table === "files") return makeQueryBuilder({ data: [FILE_B], error: null });
      return makeQueryBuilder({ data: [], error: null });
    });

    renderWithQueryClient(<BookmarksPage />);
    await userEvent.click(await screen.findByRole("button", { name: /^view$/i }));
    expect(toastError).toHaveBeenCalledWith("No file attached");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows an error and closes the preview when the signed url request fails while viewing", async () => {
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "bookmarks")
        return makeQueryBuilder(
          mockBookmarks([
            { id: "bm-1", created_at: "2026-01-01", file_id: "file-a", attempt_id: null },
          ]),
        );
      if (table === "files") return makeQueryBuilder({ data: [FILE_A], error: null });
      return makeQueryBuilder({ data: [], error: null });
    });
    const createSignedUrl = vi.fn(async () => ({ data: null, error: { message: "expired token" } }));
    supabaseMock.storage.from.mockReturnValue({ createSignedUrl });

    renderWithQueryClient(<BookmarksPage />);
    await userEvent.click(await screen.findByRole("button", { name: /^view$/i }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("expired token"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("falls back to a generic message when the preview request returns nothing", async () => {
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "bookmarks")
        return makeQueryBuilder(
          mockBookmarks([
            { id: "bm-1", created_at: "2026-01-01", file_id: "file-a", attempt_id: null },
          ]),
        );
      if (table === "files") return makeQueryBuilder({ data: [FILE_A], error: null });
      return makeQueryBuilder({ data: [], error: null });
    });
    const createSignedUrl = vi.fn(async () => ({ data: null, error: null }));
    supabaseMock.storage.from.mockReturnValue({ createSignedUrl });

    renderWithQueryClient(<BookmarksPage />);
    await userEvent.click(await screen.findByRole("button", { name: /^view$/i }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Could not open preview"));
  });

  it("views a PDF file that has no stored file name", async () => {
    const fileWithoutName = { ...FILE_A, id: "file-e", file_name: null };
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "bookmarks")
        return makeQueryBuilder(
          mockBookmarks([
            { id: "bm-8", created_at: "2026-01-01", file_id: "file-e", attempt_id: null },
          ]),
        );
      if (table === "files") return makeQueryBuilder({ data: [fileWithoutName], error: null });
      return makeQueryBuilder({ data: [], error: null });
    });
    const createSignedUrl = vi.fn(async () => ({
      data: { signedUrl: "https://signed.example/x" },
      error: null,
    }));
    supabaseMock.storage.from.mockReturnValue({ createSignedUrl });

    renderWithQueryClient(<BookmarksPage />);
    await userEvent.click(await screen.findByRole("button", { name: /^view$/i }));
    expect(await screen.findByTitle("File")).toBeInTheDocument();
  });

  it("removes a file bookmark", async () => {
    const deleteBuilder = makeQueryBuilder({ data: null, error: null });
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "bookmarks")
        return {
          ...makeQueryBuilder(
            mockBookmarks([
              { id: "bm-1", created_at: "2026-01-01", file_id: "file-a", attempt_id: null },
            ]),
          ),
          delete: vi.fn(() => deleteBuilder),
        };
      if (table === "files") return makeQueryBuilder({ data: [FILE_A], error: null });
      return makeQueryBuilder({ data: [], error: null });
    });

    renderWithQueryClient(<BookmarksPage />);
    await screen.findByText("Profitability Case");
    await userEvent.click(screen.getByRole("button", { name: /remove/i }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Bookmark removed"));
  });

  it("warns when a bookmarked file has no attachment", async () => {
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "bookmarks")
        return makeQueryBuilder(
          mockBookmarks([
            { id: "bm-2", created_at: "2026-01-01", file_id: "file-b", attempt_id: null },
          ]),
        );
      if (table === "files") return makeQueryBuilder({ data: [FILE_B], error: null });
      return makeQueryBuilder({ data: [], error: null });
    });
    const createSignedUrl = vi.fn();
    supabaseMock.storage.from.mockReturnValue({ createSignedUrl });

    renderWithQueryClient(<BookmarksPage />);
    expect(await screen.findByText("Untagged note")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /download/i }));
    expect(toastError).toHaveBeenCalledWith("No file attached");
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("shows the signed-url error message when the download request fails", async () => {
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "bookmarks")
        return makeQueryBuilder(
          mockBookmarks([
            { id: "bm-1", created_at: "2026-01-01", file_id: "file-a", attempt_id: null },
          ]),
        );
      if (table === "files") return makeQueryBuilder({ data: [FILE_A], error: null });
      return makeQueryBuilder({ data: [], error: null });
    });
    const createSignedUrl = vi.fn(async () => ({
      data: null,
      error: { message: "storage unavailable" },
    }));
    supabaseMock.storage.from.mockReturnValue({ createSignedUrl });

    renderWithQueryClient(<BookmarksPage />);
    await userEvent.click(await screen.findByRole("button", { name: /download/i }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("storage unavailable"));
  });

  it("falls back to a generic message when the download request returns nothing", async () => {
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "bookmarks")
        return makeQueryBuilder(
          mockBookmarks([
            { id: "bm-1", created_at: "2026-01-01", file_id: "file-a", attempt_id: null },
          ]),
        );
      if (table === "files") return makeQueryBuilder({ data: [FILE_A], error: null });
      return makeQueryBuilder({ data: [], error: null });
    });
    const createSignedUrl = vi.fn(async () => ({ data: null, error: null }));
    supabaseMock.storage.from.mockReturnValue({ createSignedUrl });

    renderWithQueryClient(<BookmarksPage />);
    await userEvent.click(await screen.findByRole("button", { name: /download/i }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Download failed"));
  });

  it("renders an attempt bookmark linking to the trainer page", async () => {
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "bookmarks")
        return makeQueryBuilder(
          mockBookmarks([
            { id: "bm-3", created_at: "2026-01-01", file_id: null, attempt_id: "attempt-a" },
          ]),
        );
      if (table === "ai_attempts") return makeQueryBuilder({ data: [ATTEMPT], error: null });
      return makeQueryBuilder({ data: [], error: null });
    });

    renderWithQueryClient(<BookmarksPage />);
    expect(await screen.findByText("Market entry drill")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /open attempt/i });
    expect(link).toHaveAttribute("href", "/trainer/attempt-a");
  });

  it("removes an attempt bookmark", async () => {
    const deleteBuilder = makeQueryBuilder({ data: null, error: null });
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "bookmarks")
        return {
          ...makeQueryBuilder(
            mockBookmarks([
              { id: "bm-3", created_at: "2026-01-01", file_id: null, attempt_id: "attempt-a" },
            ]),
          ),
          delete: vi.fn(() => deleteBuilder),
        };
      if (table === "ai_attempts") return makeQueryBuilder({ data: [ATTEMPT], error: null });
      return makeQueryBuilder({ data: [], error: null });
    });

    renderWithQueryClient(<BookmarksPage />);
    await screen.findByText("Market entry drill");
    await userEvent.click(screen.getByRole("button", { name: /remove/i }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Bookmark removed"));
  });

  it("renders a fallback card when a bookmark's target no longer exists", async () => {
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "bookmarks")
        return makeQueryBuilder(
          mockBookmarks([
            { id: "bm-4", created_at: "2026-01-01", file_id: null, attempt_id: null },
          ]),
        );
      return makeQueryBuilder({ data: [], error: null });
    });

    renderWithQueryClient(<BookmarksPage />);
    expect(await screen.findByText(/this bookmark's item was removed/i)).toBeInTheDocument();
  });

  it("removes a bookmark successfully", async () => {
    const deleteBuilder = makeQueryBuilder({ data: null, error: null });
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "bookmarks") {
        return {
          ...makeQueryBuilder(
            mockBookmarks([
              { id: "bm-4", created_at: "2026-01-01", file_id: null, attempt_id: null },
            ]),
          ),
          delete: vi.fn(() => deleteBuilder),
        };
      }
      return makeQueryBuilder({ data: [], error: null });
    });

    renderWithQueryClient(<BookmarksPage />);
    await userEvent.click(await screen.findByRole("button", { name: /remove/i }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Bookmark removed"));
  });

  it("shows an error toast when removing a bookmark fails", async () => {
    const deleteBuilder = makeQueryBuilder({ data: null, error: { message: "cannot delete" } });
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "bookmarks") {
        return {
          ...makeQueryBuilder(
            mockBookmarks([
              { id: "bm-4", created_at: "2026-01-01", file_id: null, attempt_id: null },
            ]),
          ),
          delete: vi.fn(() => deleteBuilder),
        };
      }
      return makeQueryBuilder({ data: [], error: null });
    });

    renderWithQueryClient(<BookmarksPage />);
    await userEvent.click(await screen.findByRole("button", { name: /remove/i }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("cannot delete"));
  });

  it("treats a null bookmarks response as empty", async () => {
    supabaseMock.from.mockImplementation((table: string) =>
      table === "bookmarks" ? makeQueryBuilder({ data: null, error: null }) : makeQueryBuilder({ data: [], error: null }),
    );
    renderWithQueryClient(<BookmarksPage />);
    expect(await screen.findByText(/nothing bookmarked yet/i)).toBeInTheDocument();
  });

  it("treats a null files response as an orphaned bookmark", async () => {
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "bookmarks")
        return makeQueryBuilder(mockBookmarks([{ id: "bm-1", created_at: "2026-01-01", file_id: "file-a", attempt_id: null }]));
      if (table === "files") return makeQueryBuilder({ data: null, error: null });
      return makeQueryBuilder({ data: [], error: null });
    });
    renderWithQueryClient(<BookmarksPage />);
    expect(await screen.findByText(/this bookmark's item was removed/i)).toBeInTheDocument();
  });

  it("treats a null attempts response as an orphaned bookmark", async () => {
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "bookmarks")
        return makeQueryBuilder(mockBookmarks([{ id: "bm-3", created_at: "2026-01-01", file_id: null, attempt_id: "attempt-a" }]));
      if (table === "ai_attempts") return makeQueryBuilder({ data: null, error: null });
      return makeQueryBuilder({ data: [], error: null });
    });
    renderWithQueryClient(<BookmarksPage />);
    expect(await screen.findByText(/this bookmark's item was removed/i)).toBeInTheDocument();
  });

  it("downloads a file that has no stored file name", async () => {
    const fileWithoutName = { ...FILE_A, id: "file-c", file_name: null };
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "bookmarks")
        return makeQueryBuilder(mockBookmarks([{ id: "bm-6", created_at: "2026-01-01", file_id: "file-c", attempt_id: null }]));
      if (table === "files") return makeQueryBuilder({ data: [fileWithoutName], error: null });
      return makeQueryBuilder({ data: [], error: null });
    });
    const createSignedUrl = vi.fn(async () => ({ data: { signedUrl: "https://signed.example/x" }, error: null }));
    supabaseMock.storage.from.mockReturnValue({ createSignedUrl });

    renderWithQueryClient(<BookmarksPage />);
    await userEvent.click(await screen.findByRole("button", { name: /download/i }));
    await waitFor(() =>
      expect(createSignedUrl).toHaveBeenCalledWith(fileWithoutName.storage_path, 60, { download: true }),
    );
  });
});
