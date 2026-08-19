import { FileWarning, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type FilePreviewState = {
  title: string;
  url: string | null;
  isPdf: boolean;
} | null;

export function FilePreviewDialog({
  preview,
  onClose,
  onDownload,
}: {
  preview: FilePreviewState;
  onClose: () => void;
  onDownload?: () => void;
}) {
  return (
    <Dialog open={!!preview} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[85vh] max-w-4xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border/60 p-4 text-left">
          <DialogTitle className="truncate pr-8">{preview?.title}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 bg-muted/30">
          {!preview ? null : !preview.isPdf ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted-foreground">
              <FileWarning className="h-8 w-8" />
              <p>In-app preview is only available for PDF files right now.</p>
              {onDownload && (
                <Button variant="outline" size="sm" onClick={onDownload}>
                  Download instead
                </Button>
              )}
            </div>
          ) : !preview.url ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading preview…
            </div>
          ) : (
            <iframe src={preview.url} title={preview.title} className="h-full w-full border-0" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
