import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilePreviewDialog } from "./file-preview-dialog";

describe("FilePreviewDialog", () => {
  it("renders nothing when there is no preview", () => {
    render(<FilePreviewDialog preview={null} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows a loading state while the signed url is being fetched", () => {
    render(<FilePreviewDialog preview={{ title: "Case.pdf", url: null, isPdf: true }} onClose={vi.fn()} />);
    expect(screen.getByText(/loading preview/i)).toBeInTheDocument();
  });

  it("renders the PDF in an iframe once a url is available", () => {
    render(
      <FilePreviewDialog
        preview={{ title: "Case.pdf", url: "https://signed.example/case.pdf", isPdf: true }}
        onClose={vi.fn()}
      />,
    );
    const iframe = screen.getByTitle("Case.pdf");
    expect(iframe.tagName).toBe("IFRAME");
    expect(iframe).toHaveAttribute("src", "https://signed.example/case.pdf");
  });

  it("shows a fallback message and a download action for non-PDF files", async () => {
    const onDownload = vi.fn();
    render(
      <FilePreviewDialog
        preview={{ title: "Notes.docx", url: "https://signed.example/notes.docx", isPdf: false }}
        onClose={vi.fn()}
        onDownload={onDownload}
      />,
    );
    expect(screen.getByText(/only available for pdf files/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /download instead/i }));
    expect(onDownload).toHaveBeenCalled();
  });

  it("shows the fallback for a non-PDF file even before a url is fetched", () => {
    render(<FilePreviewDialog preview={{ title: "Notes.docx", url: null, isPdf: false }} onClose={vi.fn()} />);
    expect(screen.getByText(/only available for pdf files/i)).toBeInTheDocument();
    expect(screen.queryByText(/loading preview/i)).not.toBeInTheDocument();
  });

  it("does not render a download action when onDownload is not provided", () => {
    render(
      <FilePreviewDialog preview={{ title: "Notes.docx", url: "https://signed.example/x", isPdf: false }} onClose={vi.fn()} />,
    );
    expect(screen.queryByRole("button", { name: /download instead/i })).not.toBeInTheDocument();
  });

  it("calls onClose when the dialog is dismissed", async () => {
    const onClose = vi.fn();
    render(
      <FilePreviewDialog preview={{ title: "Case.pdf", url: "https://signed.example/x", isPdf: true }} onClose={onClose} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
