/**
 * file-preview.ts
 * Pure helper deciding whether a stored file can be shown in the in-app
 * PDF viewer (FilePreviewDialog). Files are otherwise arbitrary formats
 * (docx/ppt/xlsx/images/zip per the upload dialog), so this stays
 * conservative: only PDFs get an inline preview, everything else falls
 * back to download.
 */

export function isPdfFile(
  fileType: string | null | undefined,
  fileName: string | null | undefined,
): boolean {
  if (fileType === "application/pdf") return true;
  return !!fileName && fileName.toLowerCase().endsWith(".pdf");
}
