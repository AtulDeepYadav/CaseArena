import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bookmark, Download, Eye, FileText, Trash2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { FilePreviewDialog, type FilePreviewState } from "@/components/file-preview-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { isPdfFile } from "@/lib/file-preview";

export const Route = createFileRoute("/_authenticated/bookmarks")({
  head: () => ({
    meta: [
      { title: "Bookmarks — CaseArena" },
      { name: "description", content: "Saved cases and community files." },
      { property: "og:title", content: "Bookmarks — CaseArena" },
      { property: "og:description", content: "Saved cases and community files." },
    ],
  }),
  component: BookmarksPage,
});

type FileRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  storage_path: string | null;
  file_name: string | null;
  file_type: string | null;
};

type AttemptRow = {
  id: string;
  case_title: string;
  category: string;
};

type BookmarkRow = {
  id: string;
  created_at: string;
  file_id: string | null;
  attempt_id: string | null;
};

export function BookmarksPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [preview, setPreview] = useState<FilePreviewState>(null);

  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ["bookmarks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("bookmarks")
        .select("id, created_at, file_id, attempt_id")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as BookmarkRow[];
    },
  });

  const fileIds = bookmarks.filter((b) => b.file_id).map((b) => b.file_id!) as string[];
  const attemptIds = bookmarks.filter((b) => b.attempt_id).map((b) => b.attempt_id!) as string[];

  const { data: files = [] } = useQuery({
    queryKey: ["bookmarked-files", fileIds],
    enabled: fileIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("files")
        .select("id, title, description, category, tags, storage_path, file_name, file_type")
        .in("id", fileIds);
      return (data ?? []) as FileRow[];
    },
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ["bookmarked-attempts", attemptIds],
    enabled: attemptIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_attempts")
        .select("id, case_title, category")
        .in("id", attemptIds);
      return (data ?? []) as AttemptRow[];
    },
  });

  const fileMap = new Map(files.map((f) => [f.id, f]));
  const attemptMap = new Map(attempts.map((a) => [a.id, a]));

  const removeBookmark = async (bookmarkId: string) => {
    const { error } = await supabase.from("bookmarks").delete().eq("id", bookmarkId);
    if (error) return toast.error(error.message);
    toast.success("Bookmark removed");
    qc.invalidateQueries({ queryKey: ["bookmarks"] });
  };

  const download = async (path: string | null, name: string | null) => {
    if (!path) return toast.error("No file attached");
    const { data, error } = await supabase.storage.from("repository").createSignedUrl(path, 60, {
      download: name ?? true,
    });
    if (error || !data) return toast.error(error?.message ?? "Download failed");
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const viewFile = async (path: string | null, name: string | null, type: string | null) => {
    if (!path) return toast.error("No file attached");
    const title = name ?? "File";
    const isPdf = isPdfFile(type, name);
    setPreview({ title, url: null, isPdf });
    if (!isPdf) return;
    const { data, error } = await supabase.storage.from("repository").createSignedUrl(path, 60);
    if (error || !data) {
      toast.error(error?.message ?? "Could not open preview");
      setPreview(null);
      return;
    }
    setPreview({ title, url: data.signedUrl, isPdf: true });
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Bookmarks" description="Saved cases and community files." />

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="rounded-2xl glass p-10 text-center">
          <Bookmark className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nothing bookmarked yet. Save files from the Community Repository to find them here.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {bookmarks.map((b) => {
            const file = b.file_id ? fileMap.get(b.file_id) : undefined;
            const attempt = b.attempt_id ? attemptMap.get(b.attempt_id) : undefined;

            if (file) {
              return (
                <div key={b.id} className="rounded-2xl glass p-4 hover-lift">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">{file.title}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {file.description}
                      </p>
                    </div>
                    {file.category && <Badge variant="outline">{file.category}</Badge>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(file.tags ?? []).slice(0, 4).map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => viewFile(file.storage_path, file.file_name, file.file_type)}
                    >
                      <Eye className="mr-1 h-4 w-4" /> View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => download(file.storage_path, file.file_name)}
                    >
                      <Download className="mr-1 h-4 w-4" /> Download
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => removeBookmark(b.id)}>
                      <Trash2 className="mr-1 h-4 w-4" /> Remove
                    </Button>
                  </div>
                </div>
              );
            }

            if (attempt) {
              return (
                <div key={b.id} className="rounded-2xl glass p-4 hover-lift">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">{attempt.case_title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{attempt.category}</p>
                    </div>
                    <ClipboardList className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/trainer/$attemptId" params={{ attemptId: attempt.id }}>
                        <FileText className="mr-1 h-4 w-4" /> Open attempt
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => removeBookmark(b.id)}>
                      <Trash2 className="mr-1 h-4 w-4" /> Remove
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <div key={b.id} className="rounded-2xl glass p-4 text-sm text-muted-foreground">
                This bookmark's item was removed.
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeBookmark(b.id)}
                  className="mt-2 block"
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Remove
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <FilePreviewDialog preview={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
