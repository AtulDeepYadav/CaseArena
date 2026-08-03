import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FolderPlus,
  Folder,
  UploadCloud,
  FileText,
  Trash2,
  Download,
  Globe2,
  Lock,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/repository")({
  head: () => ({
    meta: [
      { title: "Repository — CaseArena" },
      { name: "description", content: "Organise your case notes, frameworks and interview transcripts." },
      { property: "og:title", content: "Repository — CaseArena" },
      { property: "og:description", content: "Private folders, uploads and shareable case material." },
    ],
  }),
  component: RepositoryPage,
});

const categories = ["Consulting", "Product Management", "Marketing", "Operations", "Finance", "General Business"];

function RepositoryPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: folders = [] } = useQuery({
    queryKey: ["folders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("folders").select("*").eq("user_id", user!.id).order("name");
      return data ?? [];
    },
  });

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["my-files", user?.id, activeFolder],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("files")
        .select("*")
        .eq("owner_id", user!.id)
        .eq("is_trashed", false)
        .order("created_at", { ascending: false });
      if (activeFolder) q = q.eq("folder_id", activeFolder);
      const { data } = await q;
      return data ?? [];
    },
  });

  const visible = files.filter((f) =>
    (f.title + " " + (f.tags ?? []).join(" ")).toLowerCase().includes(search.toLowerCase()),
  );

  const createFolder = async () => {
    const name = window.prompt("Folder name");
    if (!name?.trim()) return;
    const { error } = await supabase.from("folders").insert({ user_id: user!.id, name: name.trim().slice(0, 80) });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["folders"] });
  };

  const toggleVisibility = async (id: string, current: string) => {
    const next = current === "public" ? "private" : "public";
    const { error } = await supabase.from("files").update({ visibility: next }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["my-files"] });
    toast.success(next === "public" ? "Shared with community" : "Made private");
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("files").update({ is_trashed: true }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["my-files"] });
  };

  const download = async (path: string | null, name: string | null) => {
    if (!path) return toast.error("No file attached");
    const { data, error } = await supabase.storage.from("repository").createSignedUrl(path, 60, {
      download: name ?? true,
    });
    if (error || !data) return toast.error(error?.message ?? "Download failed");
    window.open(data.signedUrl, "_blank", "noopener");
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Personal Repository"
        description="Your private library of notes, frameworks and transcripts."
        action={<UploadDialog folders={folders} onDone={() => qc.invalidateQueries({ queryKey: ["my-files"] })} />}
      />

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl glass p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Folders</h2>
            <Button variant="ghost" size="icon" onClick={createFolder} aria-label="New folder">
              <FolderPlus className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 space-y-1">
            <button
              onClick={() => setActiveFolder(null)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                activeFolder === null ? "bg-accent" : "hover:bg-accent/50"
              }`}
            >
              <Folder className="h-4 w-4" /> All files
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFolder(f.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                  activeFolder === f.id ? "bg-accent" : "hover:bg-accent/50"
                }`}
              >
                <Folder className="h-4 w-4" /> <span className="truncate">{f.name}</span>
              </button>
            ))}
          </div>
        </aside>

        <section>
          <Input
            placeholder="Search your files by title or tag"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4"
          />
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl glass p-10 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                No files yet. Upload your first case note or framework.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {visible.map((f) => (
                <div key={f.id} className="rounded-2xl glass p-4 hover-lift">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">{f.title}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{f.description}</p>
                    </div>
                    <Badge variant={f.visibility === "public" ? "default" : "secondary"}>
                      {f.visibility}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(f.tags ?? []).slice(0, 4).map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    <Button variant="ghost" size="sm" onClick={() => download(f.storage_path, f.file_name)}>
                      <Download className="mr-1 h-4 w-4" /> Download
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleVisibility(f.id, f.visibility)}>
                      {f.visibility === "public" ? (
                        <><Lock className="mr-1 h-4 w-4" /> Make private</>
                      ) : (
                        <><Globe2 className="mr-1 h-4 w-4" /> Share</>
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(f.id)}>
                      <Trash2 className="mr-1 h-4 w-4" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function UploadDialog({
  folders,
  onDone,
}: {
  folders: { id: string; name: string }[];
  onDone: () => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [tags, setTags] = useState("");
  const [folderId, setFolderId] = useState<string>("none");
  const [visibility, setVisibility] = useState("private");
  const [file, setFile] = useState<File | null>(null);

  const submit = async () => {
    if (!title.trim()) return toast.error("Title is required");
    if (file && file.size > 20 * 1024 * 1024) return toast.error("Max file size is 20MB");
    setBusy(true);
    try {
      let storage_path: string | null = null;
      if (file) {
        const path = `${user!.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error } = await supabase.storage.from("repository").upload(path, file);
        if (error) throw error;
        storage_path = path;
      }
      const { error } = await supabase.from("files").insert({
        owner_id: user!.id,
        title: title.trim().slice(0, 200),
        description: description.trim().slice(0, 2000) || null,
        category,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10),
        folder_id: folderId === "none" ? null : folderId,
        visibility: visibility as "public" | "private",
        storage_path,
        file_name: file?.name ?? null,
        file_type: file?.type ?? null,
        size_bytes: file?.size ?? null,
      });
      if (error) throw error;
      await supabase.from("activity_logs").insert({
        user_id: user!.id,
        type: "repository",
        description: `Uploaded "${title.trim()}" to the repository`,
      });
      toast.success("Uploaded");
      setOpen(false);
      setTitle("");
      setDescription("");
      setTags("");
      setFile(null);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary">
          <UploadCloud className="mr-2 h-4 w-4" /> Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload to repository</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Folder</Label>
              <Select value={folderId} onValueChange={setFolderId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No folder</SelectItem>
                  {folders.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="public">Public (community)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tags (comma separated)</Label>
              <Input value={tags} maxLength={200} onChange={(e) => setTags(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>File (optional, max 20MB)</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy} className="bg-gradient-primary">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
