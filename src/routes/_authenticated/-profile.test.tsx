import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
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

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: mockUseAuth }));

const supabaseMock = { from: vi.fn(), storage: { from: vi.fn() } };
vi.mock("@/integrations/supabase/client", () => ({ supabase: supabaseMock }));

const { ProfilePage, Route } = await import("./profile");

const FULL_PROFILE = {
  id: "user-1",
  email: "aryan@example.com",
  full_name: "Aryan Mali",
  avatar_url: "https://public.example/avatar.png",
  bio: "MBA candidate",
  batch: "PGP26",
  specialization: "Consulting",
  linkedin_url: "https://linkedin.com/in/aryan",
  resume_url: "user-1/resume-1.pdf",
  skills: ["Excel"],
  preferred_domains: ["Consulting"],
  xp: 420,
  streak: 5,
  is_banned: false,
};

const MINIMAL_PROFILE = {
  id: "user-1",
  email: null,
  full_name: null,
  avatar_url: null,
  bio: null,
  batch: null,
  specialization: null,
  linkedin_url: null,
  resume_url: null,
  skills: undefined,
  preferred_domains: undefined,
  xp: 0,
  streak: 0,
  is_banned: false,
};

const refreshProfile = vi.fn();
const emptyBuilder = () => makeQueryBuilder({ data: [], error: null });

function setAuth(
  overrides: Partial<{ user: unknown; profile: unknown; refreshProfile: () => Promise<void> }>,
) {
  mockUseAuth.mockReturnValue({
    user: { id: "user-1" },
    profile: FULL_PROFILE,
    refreshProfile,
    ...overrides,
  });
}

function makeFile(name: string, type: string, sizeBytes?: number) {
  const file = new File(["content"], name, { type });
  if (sizeBytes !== undefined)
    Object.defineProperty(file, "size", { value: sizeBytes, configurable: true });
  return file;
}

// userEvent.upload() emulates the browser's file-picker `accept` filtering
// and silently drops files that don't match — bypass that here since we're
// deliberately testing the component's own type-rejection logic.
function attachFileBypassingAccept(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  fireEvent.change(input);
}

function fileInputs(container: HTMLElement) {
  return {
    avatarInput: container.querySelector(
      'input[type="file"][accept="image/*"]',
    ) as HTMLInputElement,
    resumeInput: container.querySelector(
      'input[type="file"][accept="application/pdf"]',
    ) as HTMLInputElement,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.open = vi.fn();
  supabaseMock.from.mockImplementation(() => emptyBuilder());
  supabaseMock.storage.from.mockReturnValue({
    upload: vi.fn(async () => ({ data: {}, error: null })),
    getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://public.example/new-avatar.png" } })),
    createSignedUrl: vi.fn(async () => ({
      data: { signedUrl: "https://signed.example/resume.pdf" },
      error: null,
    })),
  });
});

describe("Route", () => {
  it("declares page metadata", () => {
    const head = Route.options.head?.();
    expect(head?.meta?.[0]).toEqual({ title: "Profile — CaseArena" });
  });
});

describe("ProfilePage — loading state", () => {
  it("shows skeletons when there is no profile yet", () => {
    setAuth({ user: null, profile: null });
    const { container } = renderWithQueryClient(<ProfilePage />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(screen.queryByText("About")).not.toBeInTheDocument();
  });
});

describe("ProfilePage — populated view", () => {
  it("renders profile fields, stats and badges once loaded", async () => {
    setAuth({});
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "user_badges")
        return makeQueryBuilder({
          data: [{ badge_code: "century", earned_at: "2026-01-01" }],
          error: null,
        });
      if (table === "badges")
        return makeQueryBuilder({
          data: [
            { code: "century", name: "100 Cases", description: "Solved 100 cases", icon: "trophy" },
          ],
          error: null,
        });
      return emptyBuilder();
    });

    renderWithQueryClient(<ProfilePage />);
    expect(await screen.findByDisplayValue("Aryan Mali")).toBeInTheDocument();
    expect(screen.getByText("420")).toBeInTheDocument();
    expect(await screen.findByText("100 Cases")).toBeInTheDocument();
    expect(screen.getByText("Excel")).toBeInTheDocument();
  });

  it("shows badge skeletons while badges are loading", () => {
    setAuth({});
    const pending = makeQueryBuilder({ data: null, error: null });
    (pending as Record<string, unknown>).then = () => {};
    supabaseMock.from.mockImplementation((table: string) =>
      table === "user_badges" ? pending : emptyBuilder(),
    );

    const { container } = renderWithQueryClient(<ProfilePage />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("shows an empty-state message when there are no badges", async () => {
    setAuth({});
    supabaseMock.from.mockImplementation(() => emptyBuilder());
    renderWithQueryClient(<ProfilePage />);
    expect(await screen.findByText(/no badges earned yet/i)).toBeInTheDocument();
  });

  it("falls back to the badge_code when a badge definition is missing", async () => {
    setAuth({});
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "user_badges")
        return makeQueryBuilder({
          data: [{ badge_code: "mystery", earned_at: "2026-01-01" }],
          error: null,
        });
      return emptyBuilder();
    });
    renderWithQueryClient(<ProfilePage />);
    expect(await screen.findByText("mystery")).toBeInTheDocument();
  });

  it("hides the Skills section and uses fallbacks when profile fields are unset", async () => {
    setAuth({ profile: MINIMAL_PROFILE });
    renderWithQueryClient(<ProfilePage />);
    await waitFor(() => expect(screen.getByLabelText("Full name")).toHaveValue(""));
    expect(screen.queryByText("Skills", { selector: "h2" })).not.toBeInTheDocument();
  });

  it("treats a null user_badges response as no badges earned", async () => {
    setAuth({});
    supabaseMock.from.mockImplementation((table: string) =>
      table === "user_badges" ? makeQueryBuilder({ data: null, error: null }) : emptyBuilder(),
    );
    renderWithQueryClient(<ProfilePage />);
    expect(await screen.findByText(/no badges earned yet/i)).toBeInTheDocument();
  });

  it("treats a null badge-definitions response as an unnamed badge", async () => {
    setAuth({});
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "user_badges")
        return makeQueryBuilder({ data: [{ badge_code: "mystery", earned_at: "2026-01-01" }], error: null });
      if (table === "badges") return makeQueryBuilder({ data: null, error: null });
      return emptyBuilder();
    });
    renderWithQueryClient(<ProfilePage />);
    expect(await screen.findByText("mystery")).toBeInTheDocument();
  });
});

describe("ProfilePage — save", () => {
  it("does nothing when there is no authenticated user", async () => {
    setAuth({ user: null });
    renderWithQueryClient(<ProfilePage />);
    await userEvent.click(await screen.findByRole("button", { name: /save profile/i }));
    expect(supabaseMock.from).not.toHaveBeenCalledWith("profiles");
    expect(toastError).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("rejects an overly long name", async () => {
    setAuth({});
    renderWithQueryClient(<ProfilePage />);
    const nameInput = await screen.findByLabelText("Full name");
    fireEvent.change(nameInput, { target: { value: "x".repeat(200) } });
    await userEvent.click(screen.getByRole("button", { name: /save profile/i }));
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining("must be under"));
  });

  it("rejects an invalid LinkedIn URL", async () => {
    setAuth({});
    renderWithQueryClient(<ProfilePage />);
    const linkedinInput = await screen.findByLabelText("LinkedIn URL");
    await userEvent.clear(linkedinInput);
    await userEvent.type(linkedinInput, "not-a-url");
    await userEvent.click(screen.getByRole("button", { name: /save profile/i }));
    expect(toastError).toHaveBeenCalledWith("LinkedIn URL must be a valid http(s) link");
  });

  it("saves successfully", async () => {
    setAuth({});
    supabaseMock.from.mockImplementation((table: string) =>
      table === "profiles" ? makeQueryBuilder({ data: null, error: null }) : emptyBuilder(),
    );
    renderWithQueryClient(<ProfilePage />);
    await userEvent.click(await screen.findByRole("button", { name: /save profile/i }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Profile saved"));
    expect(refreshProfile).toHaveBeenCalled();
  });

  it("saves successfully with every optional field cleared", async () => {
    setAuth({});
    supabaseMock.from.mockImplementation((table: string) =>
      table === "profiles" ? makeQueryBuilder({ data: null, error: null }) : emptyBuilder(),
    );
    renderWithQueryClient(<ProfilePage />);
    for (const label of ["Full name", "Batch", "Specialization", "LinkedIn URL", "Bio"]) {
      await userEvent.clear(await screen.findByLabelText(label));
    }
    await userEvent.click(screen.getByRole("button", { name: /save profile/i }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Profile saved"));
  });

  it("updates the skills and preferred domains inputs as the user types", async () => {
    setAuth({});
    renderWithQueryClient(<ProfilePage />);
    const skillsInput = await screen.findByLabelText("Skills (comma separated)");
    const domainsInput = screen.getByLabelText("Preferred domains (comma separated)");
    await userEvent.clear(skillsInput);
    await userEvent.type(skillsInput, "SQL, Modeling");
    await userEvent.clear(domainsInput);
    await userEvent.type(domainsInput, "Product");
    expect(skillsInput).toHaveValue("SQL, Modeling");
    expect(domainsInput).toHaveValue("Product");
  });

  it("shows an error toast when saving fails", async () => {
    setAuth({});
    supabaseMock.from.mockImplementation((table: string) =>
      table === "profiles"
        ? makeQueryBuilder({ data: null, error: { message: "db down" } })
        : emptyBuilder(),
    );
    renderWithQueryClient(<ProfilePage />);
    await userEvent.click(await screen.findByRole("button", { name: /save profile/i }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("db down"));
  });
});

describe("ProfilePage — avatar upload", () => {
  it("does nothing when there is no authenticated user", async () => {
    setAuth({ user: null });
    const { container } = renderWithQueryClient(<ProfilePage />);
    await screen.findByText("About");
    const { avatarInput } = fileInputs(container);
    await userEvent.upload(avatarInput, makeFile("avatar.png", "image/png"));
    expect(supabaseMock.storage.from).not.toHaveBeenCalled();
  });

  it("rejects a non-image file", async () => {
    setAuth({});
    const { container } = renderWithQueryClient(<ProfilePage />);
    await screen.findByText("About");
    const { avatarInput } = fileInputs(container);
    attachFileBypassingAccept(avatarInput, makeFile("notes.txt", "text/plain"));
    expect(toastError).toHaveBeenCalledWith("Avatar must be an image");
  });

  it("rejects an oversized image", async () => {
    setAuth({});
    const { container } = renderWithQueryClient(<ProfilePage />);
    await screen.findByText("About");
    const { avatarInput } = fileInputs(container);
    await userEvent.upload(avatarInput, makeFile("big.png", "image/png", 6 * 1024 * 1024));
    expect(toastError).toHaveBeenCalledWith("Max avatar size is 5MB");
  });

  it("uploads an avatar successfully", async () => {
    setAuth({});
    supabaseMock.from.mockImplementation((table: string) =>
      table === "profiles" ? makeQueryBuilder({ data: null, error: null }) : emptyBuilder(),
    );
    const { container } = renderWithQueryClient(<ProfilePage />);
    await screen.findByText("About");
    const { avatarInput } = fileInputs(container);
    await userEvent.upload(avatarInput, makeFile("avatar.png", "image/png", 1024));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Avatar updated"));
    expect(refreshProfile).toHaveBeenCalled();
  });

  it("shows an error when the avatar storage upload fails", async () => {
    setAuth({});
    supabaseMock.storage.from.mockReturnValue({
      upload: vi.fn(async () => ({ data: null, error: { message: "storage full" } })),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://public.example/x.png" } })),
      createSignedUrl: vi.fn(),
    });
    const { container } = renderWithQueryClient(<ProfilePage />);
    await screen.findByText("About");
    const { avatarInput } = fileInputs(container);
    await userEvent.upload(avatarInput, makeFile("avatar.png", "image/png", 1024));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("storage full"));
  });

  it("shows an error when saving the avatar url fails", async () => {
    setAuth({});
    supabaseMock.from.mockImplementation((table: string) =>
      table === "profiles"
        ? makeQueryBuilder({ data: null, error: { message: "db down" } })
        : emptyBuilder(),
    );
    const { container } = renderWithQueryClient(<ProfilePage />);
    await screen.findByText("About");
    const { avatarInput } = fileInputs(container);
    await userEvent.upload(avatarInput, makeFile("avatar.png", "image/png", 1024));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("db down"));
  });
});

describe("ProfilePage — resume upload", () => {
  it("does nothing when there is no authenticated user", async () => {
    setAuth({ user: null });
    const { container } = renderWithQueryClient(<ProfilePage />);
    await screen.findByText("About");
    const { resumeInput } = fileInputs(container);
    await userEvent.upload(resumeInput, makeFile("resume.pdf", "application/pdf"));
    expect(supabaseMock.storage.from).not.toHaveBeenCalled();
  });

  it("rejects a non-PDF file", async () => {
    setAuth({});
    const { container } = renderWithQueryClient(<ProfilePage />);
    await screen.findByText("About");
    const { resumeInput } = fileInputs(container);
    attachFileBypassingAccept(resumeInput, makeFile("resume.docx", "application/msword"));
    expect(toastError).toHaveBeenCalledWith("Resume must be a PDF");
  });

  it("rejects an oversized resume", async () => {
    setAuth({});
    const { container } = renderWithQueryClient(<ProfilePage />);
    await screen.findByText("About");
    const { resumeInput } = fileInputs(container);
    await userEvent.upload(
      resumeInput,
      makeFile("resume.pdf", "application/pdf", 11 * 1024 * 1024),
    );
    expect(toastError).toHaveBeenCalledWith("Max resume size is 10MB");
  });

  it("uploads a resume successfully", async () => {
    setAuth({});
    supabaseMock.from.mockImplementation((table: string) =>
      table === "profiles" ? makeQueryBuilder({ data: null, error: null }) : emptyBuilder(),
    );
    const { container } = renderWithQueryClient(<ProfilePage />);
    await screen.findByText("About");
    const { resumeInput } = fileInputs(container);
    await userEvent.upload(resumeInput, makeFile("resume.pdf", "application/pdf", 1024));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Resume updated"));
    expect(refreshProfile).toHaveBeenCalled();
  });

  it("shows an error when the resume storage upload fails", async () => {
    setAuth({});
    supabaseMock.storage.from.mockReturnValue({
      upload: vi.fn(async () => ({ data: null, error: { message: "storage full" } })),
      getPublicUrl: vi.fn(),
      createSignedUrl: vi.fn(),
    });
    const { container } = renderWithQueryClient(<ProfilePage />);
    await screen.findByText("About");
    const { resumeInput } = fileInputs(container);
    await userEvent.upload(resumeInput, makeFile("resume.pdf", "application/pdf", 1024));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("storage full"));
  });

  it("shows an error when saving the resume path fails", async () => {
    setAuth({});
    supabaseMock.from.mockImplementation((table: string) =>
      table === "profiles"
        ? makeQueryBuilder({ data: null, error: { message: "db down" } })
        : emptyBuilder(),
    );
    const { container } = renderWithQueryClient(<ProfilePage />);
    await screen.findByText("About");
    const { resumeInput } = fileInputs(container);
    await userEvent.upload(resumeInput, makeFile("resume.pdf", "application/pdf", 1024));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("db down"));
  });
});

describe("ProfilePage — view resume", () => {
  it("opens the signed resume url", async () => {
    setAuth({});
    renderWithQueryClient(<ProfilePage />);
    await userEvent.click(await screen.findByRole("button", { name: /view/i }));
    await waitFor(() =>
      expect(window.open).toHaveBeenCalledWith(
        "https://signed.example/resume.pdf",
        "_blank",
        "noopener",
      ),
    );
  });

  it("shows the signed-url error message when it fails", async () => {
    setAuth({});
    supabaseMock.storage.from.mockReturnValue({
      upload: vi.fn(),
      getPublicUrl: vi.fn(),
      createSignedUrl: vi.fn(async () => ({ data: null, error: { message: "expired" } })),
    });
    renderWithQueryClient(<ProfilePage />);
    await userEvent.click(await screen.findByRole("button", { name: /view/i }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("expired"));
  });

  it("falls back to a generic message when the signed url request returns nothing", async () => {
    setAuth({});
    supabaseMock.storage.from.mockReturnValue({
      upload: vi.fn(),
      getPublicUrl: vi.fn(),
      createSignedUrl: vi.fn(async () => ({ data: null, error: null })),
    });
    renderWithQueryClient(<ProfilePage />);
    await userEvent.click(await screen.findByRole("button", { name: /view/i }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Could not open resume"));
  });
});
