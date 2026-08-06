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

const { mockUseAuth, mockUseTheme } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseTheme: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: mockUseAuth }));
vi.mock("@/lib/theme", () => ({ useTheme: mockUseTheme }));

const supabaseMock = { from: vi.fn(), auth: { updateUser: vi.fn() } };
vi.mock("@/integrations/supabase/client", () => ({ supabase: supabaseMock }));

const { SettingsPage, Route } = await import("./settings");

const mockToggleTheme = vi.fn();
const emptyBuilder = () => makeQueryBuilder({ data: null, error: null });

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: "user-1" }, profile: { email: "aryan@example.com" } });
  mockUseTheme.mockReturnValue({ theme: "dark", toggle: mockToggleTheme });
  supabaseMock.from.mockImplementation(() => emptyBuilder());
  supabaseMock.auth.updateUser.mockResolvedValue({ data: {}, error: null });
});

describe("Route", () => {
  it("declares page metadata", () => {
    const head = Route.options.head?.();
    expect(head?.meta?.[0]).toEqual({ title: "Settings — CaseArena" });
  });
});

describe("SettingsPage — notification preferences", () => {
  it("shows skeletons while settings are loading", () => {
    const pending = makeQueryBuilder({ data: null, error: null });
    (pending as Record<string, unknown>).then = () => {};
    supabaseMock.from.mockImplementation((table: string) =>
      table === "user_settings" ? pending : emptyBuilder(),
    );

    const { container } = renderWithQueryClient(<SettingsPage />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("defaults every toggle to on when no settings row exists yet", async () => {
    renderWithQueryClient(<SettingsPage />);
    const toggle = await screen.findByRole("switch", { name: "Email notifications" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("saves a toggle change", async () => {
    renderWithQueryClient(<SettingsPage />);
    const toggle = await screen.findByRole("switch", { name: "Email notifications" });
    await userEvent.click(toggle);
    await waitFor(() => expect(supabaseMock.from).toHaveBeenCalledWith("user_settings"));
  });

  it("does nothing when there is no authenticated user", async () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null });
    renderWithQueryClient(<SettingsPage />);
    const toggle = await screen.findByRole("switch", { name: "Email notifications" });
    await userEvent.click(toggle);
    expect(supabaseMock.from).not.toHaveBeenCalledWith("user_settings");
  });

  it("shows an error toast when saving a toggle fails", async () => {
    supabaseMock.from.mockImplementation((table: string) =>
      table === "user_settings"
        ? makeQueryBuilder({ data: null, error: { message: "db down" } })
        : emptyBuilder(),
    );
    renderWithQueryClient(<SettingsPage />);
    const toggle = await screen.findByRole("switch", { name: "Email notifications" });
    await userEvent.click(toggle);
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("db down"));
  });
});

describe("SettingsPage — appearance", () => {
  it("shows the dark-mode switch as checked when the theme is dark", async () => {
    mockUseTheme.mockReturnValue({ theme: "dark", toggle: mockToggleTheme });
    renderWithQueryClient(<SettingsPage />);
    expect(await screen.findByRole("switch", { name: "Dark mode" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("shows the dark-mode switch as unchecked when the theme is light, and toggles it", async () => {
    mockUseTheme.mockReturnValue({ theme: "light", toggle: mockToggleTheme });
    renderWithQueryClient(<SettingsPage />);
    const themeSwitch = await screen.findByRole("switch", { name: "Dark mode" });
    expect(themeSwitch).toHaveAttribute("aria-checked", "false");
    await userEvent.click(themeSwitch);
    expect(mockToggleTheme).toHaveBeenCalled();
  });
});

describe("SettingsPage — email address", () => {
  it("pre-fills the current email from the profile", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-1" },
      profile: { email: "aryan@example.com" },
    });
    renderWithQueryClient(<SettingsPage />);
    expect(await screen.findByLabelText("New email address")).toHaveValue("aryan@example.com");
  });

  it("leaves the email field blank when the profile has no email yet", async () => {
    mockUseAuth.mockReturnValue({ user: { id: "user-1" }, profile: null });
    renderWithQueryClient(<SettingsPage />);
    expect(await screen.findByLabelText("New email address")).toHaveValue("");
  });

  it("rejects an invalid email", async () => {
    renderWithQueryClient(<SettingsPage />);
    const input = await screen.findByLabelText("New email address");
    await userEvent.clear(input);
    await userEvent.type(input, "not-an-email");
    await userEvent.click(screen.getByRole("button", { name: /update email/i }));
    expect(toastError).toHaveBeenCalledWith("Enter a valid email");
  });

  it("updates the email successfully", async () => {
    renderWithQueryClient(<SettingsPage />);
    await userEvent.click(await screen.findByRole("button", { name: /update email/i }));
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith(
        "Check your inbox to confirm the new email address",
      ),
    );
  });

  it("shows an error toast when updating the email fails", async () => {
    supabaseMock.auth.updateUser.mockResolvedValue({
      data: null,
      error: { message: "email in use" },
    });
    renderWithQueryClient(<SettingsPage />);
    await userEvent.click(await screen.findByRole("button", { name: /update email/i }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("email in use"));
  });
});

describe("SettingsPage — password", () => {
  it("rejects a short password", async () => {
    renderWithQueryClient(<SettingsPage />);
    const input = await screen.findByLabelText("New password");
    await userEvent.type(input, "short");
    await userEvent.click(screen.getByRole("button", { name: /update password/i }));
    expect(toastError).toHaveBeenCalledWith("Password must be at least 8 characters");
  });

  it("updates the password successfully and clears the field", async () => {
    renderWithQueryClient(<SettingsPage />);
    const input = await screen.findByLabelText("New password");
    await userEvent.type(input, "a-strong-password");
    await userEvent.click(screen.getByRole("button", { name: /update password/i }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Password updated"));
    expect(input).toHaveValue("");
  });

  it("shows an error toast when updating the password fails", async () => {
    supabaseMock.auth.updateUser.mockResolvedValue({
      data: null,
      error: { message: "weak password" },
    });
    renderWithQueryClient(<SettingsPage />);
    const input = await screen.findByLabelText("New password");
    await userEvent.type(input, "a-strong-password");
    await userEvent.click(screen.getByRole("button", { name: /update password/i }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("weak password"));
  });
});
