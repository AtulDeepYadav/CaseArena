import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Heart, Star, MessageSquare, Download, Eye, Bookmark, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { FilePreviewDialog, type FilePreviewState } from "@/components/file-preview-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { addBookmark } from "@/lib/bookmarks";
import { isPdfFile } from "@/lib/file-preview";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({
    meta: [
      { title: "Community Repository — CaseArena" },
      {
        name: "description",
        content: "Discover case notes and frameworks shared by the IIM Lucknow cohort.",
      },
      { property: "og:title", content: "Community Repository — CaseArena" },
      {
        property: "og:description",
        content: "Browse, rate and discuss shared case prep material.",
      },
    ],
  }),
  component: CommunityPage,
});

const categories = [
  "All",
  "Consulting",
  "Product Management",
  "Marketing",
  "Operations",
  "Finance",
  "General Business",
];

function CommunityPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("recent");
  const [openFile, setOpenFile] = useState<string | null>(null);
  const [preview, setPreview] = useState<FilePreviewState>(null);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["community", category, sort],
    queryFn: async () => {
      let q = supabase
        .from("files")
        .select("*")
        .eq("visibility", "public")
        .eq("is_trashed", false)
        .eq("is_removed", false);
      if (category !== "All") q = q.eq("category", category);
      q =
        sort === "likes"
          ? q.order("like_count", { ascending: false })
          : sort === "rating"
            ? q.order("rating_avg", { ascending: false })
            : q.order("created_at", { ascending: false });
      const { data } = await q.limit(60);
      return data ?? [];
    },
  });

  const { data: myLikes = [] } = useQuery({
    queryKey: ["my-likes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("file_likes").select("file_id").eq("user_id", user!.id);
      return (data ?? []).map((l) => l.file_id);
    },
  });

  const { data: myRatings = {} } = useQuery({
    queryKey: ["my-ratings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("file_ratings")
        .select("file_id, rating")
        .eq("user_id", user!.id);
      return Object.fromEntries((data ?? []).map((r) => [r.file_id, r.rating])) as Record<
        string,
        number
      >;
    },
  });

  const { data: myBookmarks = [] } = useQuery({
    queryKey: ["my-bookmarked-files", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("bookmarks")
        .select("file_id")
        .eq("user_id", user!.id)
        .not("file_id", "is", null);
      return (data ?? []).map((b) => b.file_id) as string[];
    },
  });

  const toggleLike = async (fileId: string) => {
    const { error } = myLikes.includes(fileId)
      ? await supabase.from("file_likes").delete().eq("file_id", fileId).eq("user_id", user!.id)
      : await supabase.from("file_likes").insert({ file_id: fileId, user_id: user!.id });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["my-likes"] });
    qc.invalidateQueries({ queryKey: ["community"] });
  };

  const rate = async (fileId: string, rating: number) => {
    const { error } = await supabase
      .from("file_ratings")
      .upsert({ file_id: fileId, user_id: user!.id, rating }, { onConflict: "file_id,user_id" });
    if (error) return toast.error(error.message);
    toast.success(`Rated ${rating}/5`);
    qc.invalidateQueries({ queryKey: ["my-ratings"] });
    qc.invalidateQueries({ queryKey: ["community"] });
  };

  const bookmark = async (fileId: string) => {
    if (myBookmarks.includes(fileId)) {
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("file_id", fileId)
        .eq("user_id", user!.id);
      if (error) return toast.error(error.message);
      toast.success("Bookmark removed");
    } else {
      const result = await addBookmark(supabase, user!.id, fileId);
      if (!result.ok) return toast.error(result.error);
      toast.success(result.alreadyBookmarked ? "Already bookmarked" : "Bookmarked");
    }
    qc.invalidateQueries({ queryKey: ["my-bookmarked-files"] });
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

  const visible = files.filter((f) =>
    (f.title + " " + (f.description ?? "") + " " + (f.tags ?? []).join(" "))
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Community Repository"
        description="Curated case material shared by your cohort."
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search shared material"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most recent</SelectItem>
            <SelectItem value="likes">Most liked</SelectItem>
            <SelectItem value="rating">Top rated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl glass p-10 text-center text-sm text-muted-foreground">
          Nothing shared yet. Publish a file from your repository to get started.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((f) => (
            <div key={f.id} className="flex flex-col rounded-2xl glass p-4 hover-lift">
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{f.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {f.category && (
                  <Badge variant="outline" className="text-[10px]">
                    {f.category}
                  </Badge>
                )}
                {(f.tags ?? []).slice(0, 3).map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px]">
                    {t}
                  </Badge>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3.5 w-3.5 text-primary" />
                {f.rating_avg?.toFixed(1) ?? "0.0"} ({f.rating_count})
                <span className="ml-2">{f.download_count} downloads</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => toggleLike(f.id)}>
                  <Heart
                    className={`mr-1 h-4 w-4 ${myLikes.includes(f.id) ? "fill-primary text-primary" : ""}`}
                  />
                  {f.like_count}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setOpenFile(f.id)}>
                  <MessageSquare className="mr-1 h-4 w-4" /> Discuss ({f.comment_count ?? 0})
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={myBookmarks.includes(f.id) ? "Remove bookmark" : "Bookmark"}
                  onClick={() => bookmark(f.id)}
                >
                  <Bookmark
                    className={`h-4 w-4 ${myBookmarks.includes(f.id) ? "fill-primary text-primary" : ""}`}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="View"
                  onClick={() => viewFile(f.storage_path, f.file_name, f.file_type)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Download"
                  onClick={() => download(f.storage_path, f.file_name)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => rate(f.id, n)} aria-label={`Rate ${n}`}>
                    <Star
                      className={`h-4 w-4 transition-colors hover:text-primary ${
                        (myRatings[f.id] ?? 0) >= n
                          ? "fill-primary text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <CommentsDialog fileId={openFile} onClose={() => setOpenFile(null)} />
      <FilePreviewDialog preview={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

function CommentsDialog({ fileId, onClose }: { fileId: string | null; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", fileId],
    enabled: !!fileId,
    queryFn: async () => {
      const { data } = await supabase
        .from("file_comments")
        .select("id,content,created_at,user_id")
        .eq("file_id", fileId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const post = async () => {
    if (!text.trim()) return;
    const { error } = await supabase
      .from("file_comments")
      .insert({ file_id: fileId!, user_id: user!.id, content: text.trim().slice(0, 2000) });
    if (error) return toast.error(error.message);
    setText("");
    qc.invalidateQueries({ queryKey: ["comments", fileId] });
    qc.invalidateQueries({ queryKey: ["community"] });
  };

  return (
    <Dialog open={!!fileId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Discussion</DialogTitle>
        </DialogHeader>
        <div className="max-h-64 space-y-3 overflow-y-auto">
          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="rounded-xl border border-border/60 p-3">
              <p className="text-sm">{c.content}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(c.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
        <Textarea
          value={text}
          maxLength={2000}
          placeholder="Add a comment"
          onChange={(e) => setText(e.target.value)}
        />
        <Button onClick={post} className="bg-gradient-primary">
          Post comment
        </Button>
      </DialogContent>
    </Dialog>
  );
}
