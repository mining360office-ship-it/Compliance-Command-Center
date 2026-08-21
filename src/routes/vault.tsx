import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Topbar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Upload, FileText, Folder, Download, Eye, Pencil, Trash2, Loader2, Filter } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/vault")({
  head: () => ({ meta: [{ title: "Document Vault — Mining Compliance Command Center" }] }),
  component: DocumentVault,
});

const FOLDERS = ["IBM", "DGMS", "EC", "Forest", "PESO", "Revenue", "Legal", "Mine Plans", "Reports"];
const DOCUMENT_TYPES = ["PDF", "Word", "Excel", "Image", "CAD", "Other"];
const STATUSES = ["Active", "Archived", "Draft", "Under Review"];

type Document = {
  id: string;
  title: string;
  folder: string | null;
  document_type: string | null;
  file_name: string | null;
  file_size: number | null;
  file_url: string | null;
  version: number;
  upload_date: string | null;
  uploaded_by: string | null;
  status: string;
  tags: string[] | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

const emptyForm = {
  title: "",
  folder: "",
  document_type: "PDF",
  file_name: "",
  file_size: null as number | null,
  file_url: "",
  description: "",
  status: "Active",
  tags: "",
};
type FormState = typeof emptyForm;

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getDocumentViewUrl(doc: Document): string | null {
  if (!doc.file_url) return null;

  try {
    const configuredProjectUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!configuredProjectUrl) return null;

    const fileUrl = new URL(doc.file_url);
    const projectUrl = new URL(configuredProjectUrl);
    const documentsPublicPath = "/storage/v1/object/public/documents/";

    if (fileUrl.origin !== projectUrl.origin) return null;
    if (!fileUrl.pathname.startsWith(documentsPublicPath)) return null;

    return fileUrl.toString();
  } catch {
    return null;
  }
}

function statusBadge(s: string) {
  const map: Record<string, string> = {
    Active: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
    Archived: "bg-muted text-muted-foreground border-border",
    Draft: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300",
    "Under Review": "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300",
  };
  return map[s] ?? "bg-muted text-muted-foreground border-border";
}

function DocumentVault() {
  const [rows, setRows] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Document | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);

  const [search, setSearch] = useState("");
  const [fFolder, setFFolder] = useState("all");
  const [fType, setFType] = useState("all");
  const [fStatus, setFStatus] = useState("all");

  const filtered = rows.filter((doc) => {
    const matchSearch = !search || 
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.file_name?.toLowerCase().includes(search.toLowerCase()) ||
      doc.description?.toLowerCase().includes(search.toLowerCase());
    const matchFolder = fFolder === "all" || doc.folder === fFolder;
    const matchType = fType === "all" || doc.document_type === fType;
    const matchStatus = fStatus === "all" || doc.status === fStatus;
    return matchSearch && matchFolder && matchType && matchStatus;
  });

  const fetchDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("upload_date", { ascending: false });
    if (error) {
      toast.error("Failed to load documents");
    } else {
      setRows(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleSave = async () => {
    if (!form.title || !form.folder) {
      toast.error("Title and folder are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        folder: form.folder,
        document_type: form.document_type,
        file_name: form.file_name || null,
        file_size: form.file_size,
        file_url: form.file_url || null,
        description: form.description || null,
        status: form.status,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()) : null,
        version: editing ? editing.version : 1,
        uploaded_by: "Ravi Verma",
      };

      if (editing) {
        const { error } = await supabase
          .from("documents")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Document updated successfully");
      } else {
        const { error } = await supabase.from("documents").insert([payload]);
        if (error) throw error;
        toast.success("Document added successfully");
      }
      setDialogOpen(false);
      fetchDocuments();
    } catch (err: any) {
      toast.error(err.message || "Failed to save document");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from("documents").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success("Document deleted successfully");
      setDeleteTarget(null);
      fetchDocuments();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete document");
    }
  };

  const openEdit = (doc: Document) => {
    setEditing(doc);
    setForm({
      title: doc.title,
      folder: doc.folder || "",
      document_type: doc.document_type || "PDF",
      file_name: doc.file_name || "",
      file_size: doc.file_size,
      file_url: doc.file_url || "",
      description: doc.description || "",
      status: doc.status,
      tags: doc.tags?.join(", ") || "",
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("documents")
        .getPublicUrl(fileName);

      setForm(prev => ({
        ...prev,
        file_name: file.name,
        file_size: file.size,
        file_url: publicUrl,
      }));
      toast.success("File uploaded successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file");
    }
    setUploading(false);
  };

  return (
    <>
      <Topbar title="Document Vault" subtitle="Centralized regulatory document repository" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Select value={fFolder} onValueChange={setFFolder}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Folders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Folders</SelectItem>
                  {FOLDERS.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={fType} onValueChange={setFType}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={fStatus} onValueChange={setFStatus}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="size-4" />
              Add Document
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Folder</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="size-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No documents found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{doc.title}</div>
                            {doc.description && (
                              <div className="text-xs text-muted-foreground truncate max-w-xs">{doc.description}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <Folder className="size-3" />
                          {doc.folder}
                        </Badge>
                      </TableCell>
                      <TableCell>{doc.document_type}</TableCell>
                      <TableCell>v{doc.version}</TableCell>
                      <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {doc.upload_date ? new Date(doc.upload_date).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusBadge(doc.status)}>{doc.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {getDocumentViewUrl(doc) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8"
                              title="View document"
                              aria-label={`View ${doc.title}`}
                              onClick={() => {
                                const viewUrl = getDocumentViewUrl(doc);
                                if (viewUrl) window.open(viewUrl, "_blank", "noopener,noreferrer");
                              }}
                            >
                              <Eye className="size-4" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="size-8" onClick={() => openEdit(doc)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => setDeleteTarget(doc)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Document" : "Add New Document"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update document metadata and properties." : "Add a new document to the vault."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Document title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="folder">Folder *</Label>
                <Select value={form.folder} onValueChange={(v) => setForm({ ...form, folder: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select folder" />
                  </SelectTrigger>
                  <SelectContent>
                    {FOLDERS.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Document Type</Label>
                <Select value={form.document_type} onValueChange={(v) => setForm({ ...form, document_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">File Upload</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="flex-1"
                />
                {uploading && <Loader2 className="size-4 animate-spin" />}
              </div>
              {form.file_name && (
                <div className="text-sm text-muted-foreground">
                  Uploaded: {form.file_name}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Document description..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="e.g., compliance, 2024, annual"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              {editing ? "Update" : "Add"} Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
