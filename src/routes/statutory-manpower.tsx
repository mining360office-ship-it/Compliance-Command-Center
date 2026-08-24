import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Topbar } from "@/components/topbar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useMasterNames } from "@/lib/masters";

export const Route = createFileRoute("/statutory-manpower")({
  head: () => ({ meta: [{ title: "MineCompli — Statutory Manpower" }] }),
  component: StatutoryManpowerModule,
});

const DESIGNATIONS = [
  "Mine Manager",
  "Agent",
  "Assistant Manager",
  "Safety Officer",
  "Mining Engineer",
  "Geologist",
  "Surveyor",
  "Electrical Supervisor",
  "Mechanical Supervisor",
  "Other",
];

const STATUTORY_RULES = [
  "Mines Act",
  "Mines Rules",
  "Metalliferous Mines Regulations",
  "Coal Mines Regulations",
  "Mines Vocational Training Rules",
  "Other",
];

const MANPOWER_STATUSES = ["Active", "Inactive", "Relieved"];

const DEPARTMENTS_FALLBACK = ["Mining", "Environment", "Safety", "Legal", "HR", "Finance", "Operations"];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUTORY_MANPOWER_DOCUMENT_BUCKET = "statutory-manpower-documents";

type MineOption = {
  id: string;
  name: string;
};

type Manpower = {
  id: string;
  mine_manager_name: string;
  department: string | null;
  designation: string | null;
  statutory_rule: string | null;
  mine_id: string | null;
  appointment_date: string | null;
  qualification: string | null;
  experience_years: number | null;
  certificate_number: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type ManpowerDocument = {
  id: string;
  manpower_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_at: string;
};

const emptyForm = {
  mine_manager_name: "",
  department: "",
  designation: "",
  statutory_rule: "",
  mine_id: "",
  appointment_date: "",
  qualification: "",
  experience_years: "",
  certificate_number: "",
  status: "Active",
  notes: "",
};

type FormState = typeof emptyForm;

function safeStorageFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function formatFileSize(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function formatUploadedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function getMineName(row: Manpower, mines: MineOption[]): string {
  if (!row.mine_id) return "—";
  return mines.find((mine) => mine.id === row.mine_id)?.name ?? "—";
}

type SupabaseErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
  status?: number | string;
  statusCode?: number | string;
};

function logSupabaseError(context: string, error: unknown) {
  const value = (error ?? {}) as SupabaseErrorLike;
  console.error(`[Statutory Manpower] ${context}`, {
    message: value.message ?? "Unknown error",
    details: value.details ?? null,
    hint: value.hint ?? null,
    code: value.code ?? null,
    status: value.status ?? value.statusCode ?? null,
  });
}

function getErrorMessage(error: unknown, fallback: string) {
  const value = error as SupabaseErrorLike | null | undefined;
  return value?.message || fallback;
}

async function requireActiveSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    logSupabaseError("Session check failed", error);
    throw error;
  }
  if (!data.session?.access_token) {
    throw new Error("Your login session is no longer active. Please sign in again and retry.");
  }
  return data.session;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Active: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
    Inactive: "bg-muted text-muted-foreground border-border",
    Relieved: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300",
  };
  return map[status] ?? "bg-muted text-muted-foreground border-border";
}

async function openDocument(document: ManpowerDocument) {
  const documentWindow = window.open("about:blank", "_blank");
  if (!documentWindow) {
    toast.error("Unable to open document", { description: "Please allow pop-ups for this portal and try again." });
    return;
  }
  documentWindow.opener = null;

  try {
    await requireActiveSession();
    const { data, error } = await supabase.storage
      .from(STATUTORY_MANPOWER_DOCUMENT_BUCKET)
      .createSignedUrl(document.file_path, 60 * 10);
    if (error) {
      logSupabaseError(`Signed URL generation failed for ${document.file_name}`, error);
      throw error;
    }
    if (!data?.signedUrl) throw new Error("Unable to create a secure document link");
    documentWindow.location.href = data.signedUrl;
  } catch (error) {
    documentWindow.close();
    logSupabaseError("Create signed document URL failed", error);
    toast.error("Unable to open document", { description: getErrorMessage(error, "Document access failed") });
  }
}

function StatutoryManpowerModule() {
  const { names: departments } = useMasterNames("departments", DEPARTMENTS_FALLBACK);
  const [mineOptions, setMineOptions] = useState<MineOption[]>([]);
  const [rows, setRows] = useState<Manpower[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editing, setEditing] = useState<Manpower | null>(null);
  const [viewing, setViewing] = useState<Manpower | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Manpower | null>(null);
  const [documentDeleteTarget, setDocumentDeleteTarget] = useState<ManpowerDocument | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [documents, setDocuments] = useState<ManpowerDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [documentDeleting, setDocumentDeleting] = useState(false);

  const [search, setSearch] = useState("");
  const [fDepartment, setFDepartment] = useState("all");
  const [fDesignation, setFDesignation] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fMine, setFMine] = useState("all");

  async function loadMines() {
    const { data, error } = await supabase
      .from("mines")
      .select("id, name")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      logSupabaseError("Load mines failed", error);
      toast.error("Failed to load mines", { description: error.message });
      setMineOptions([]);
      return;
    }

    setMineOptions((data ?? []) as MineOption[]);
  }

  async function loadRows() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("statutory_manpower")
      .select("id,mine_manager_name,department,designation,statutory_rule,mine_id,appointment_date,qualification,experience_years,certificate_number,status,notes,created_at,updated_at")
      .order("mine_manager_name", { ascending: true });

    if (error) {
      logSupabaseError("Load records failed", error);
      toast.error("Failed to load Statutory Manpower", { description: error.message });
    } else {
      setRows((data ?? []) as Manpower[]);
    }
    setLoading(false);
  }

  async function loadDocuments(manpowerId: string): Promise<ManpowerDocument[]> {
    setDocumentsLoading(true);
    setDocumentsError(null);

    try {
      if (!manpowerId || !UUID_PATTERN.test(manpowerId)) {
        throw new Error("Unable to load documents because the Statutory Manpower record ID is invalid.");
      }

      await requireActiveSession();
      const { data, error } = await (supabase as any)
        .from("statutory_manpower_documents")
        .select("id,manpower_id,file_name,file_path,file_size,file_type,uploaded_at")
        .eq("manpower_id", manpowerId)
        .order("uploaded_at", { ascending: false });

      if (error) {
        logSupabaseError(`SELECT statutory_manpower_documents failed for manpower_id=${manpowerId}`, error);
        throw error;
      }

      const fetchedDocuments = (data ?? []) as ManpowerDocument[];
      setDocuments(fetchedDocuments);
      return fetchedDocuments;
    } catch (error) {
      const message = getErrorMessage(error, "Unable to load documents");
      setDocuments([]);
      setDocumentsError(message);
      toast.error("Failed to load documents", { description: message });
      return [];
    } finally {
      setDocumentsLoading(false);
    }
  }

  useEffect(() => {
    void loadRows();
    void loadMines();
  }, []);

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
    setPendingFiles([]);
    setDocuments([]);
    setDocumentsError(null);
  }

  function openNew() {
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(row: Manpower) {
    setEditing(row);
    setForm({
      mine_manager_name: row.mine_manager_name ?? "",
      department: row.department ?? "",
      designation: row.designation ?? "",
      statutory_rule: row.statutory_rule ?? "",
      mine_id: row.mine_id ?? "",
      appointment_date: row.appointment_date ?? "",
      qualification: row.qualification ?? "",
      experience_years: row.experience_years == null ? "" : String(row.experience_years),
      certificate_number: row.certificate_number ?? "",
      status: row.status ?? "Active",
      notes: row.notes ?? "",
    });
    setPendingFiles([]);
    setDocuments([]);
    setDocumentsError(null);
    setDialogOpen(true);
    void loadDocuments(row.id);
  }

  function openView(row: Manpower) {
    setViewing(row);
    setDocuments([]);
    setDocumentsError(null);
    setViewOpen(true);
    void loadDocuments(row.id);
  }

  function handleFileSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length) {
      setPendingFiles((current) => [...current, ...selected]);
    }
    event.target.value = "";
  }

  function removePendingFile(index: number) {
    setPendingFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function uploadDocuments(manpowerId: string, files: File[]) {
    if (!manpowerId || !UUID_PATTERN.test(manpowerId)) {
      throw new Error("Documents cannot be uploaded because the Statutory Manpower record ID is invalid.");
    }

    await requireActiveSession();

    const uploadedDocuments: ManpowerDocument[] = [];
    const failedFiles: Array<{ fileName: string; error: unknown }> = [];

    for (const file of files) {
      const uniqueToken = typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const requestedPath = `statutory-manpower/${manpowerId}/${Date.now()}-${uniqueToken}-${safeStorageFileName(file.name)}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STATUTORY_MANPOWER_DOCUMENT_BUCKET)
        .upload(requestedPath, file, { upsert: false });

      if (uploadError) {
        logSupabaseError(`Storage upload failed for ${file.name}`, uploadError);
        failedFiles.push({ fileName: file.name, error: uploadError });
        continue;
      }

      const uploadedPath = uploadData?.path || requestedPath;
      const metadataPayload = {
        manpower_id: manpowerId,
        file_name: file.name,
        file_path: uploadedPath,
        file_size: file.size,
        file_type: file.type || "application/octet-stream",
      };

      const { data: insertedMetadata, error: insertError } = await (supabase as any)
        .from("statutory_manpower_documents")
        .insert(metadataPayload)
        .select("id,manpower_id,file_name,file_path,file_size,file_type,uploaded_at")
        .single();

      if (insertError || !insertedMetadata?.id) {
        if (insertError) {
          logSupabaseError(`Metadata INSERT failed for ${file.name}`, insertError);
        } else {
          logSupabaseError(`Metadata INSERT returned no row for ${file.name}`, {
            message: "Supabase did not return the inserted statutory_manpower_documents row.",
          });
        }

        const { error: cleanupError } = await supabase.storage
          .from(STATUTORY_MANPOWER_DOCUMENT_BUCKET)
          .remove([uploadedPath]);
        if (cleanupError) {
          logSupabaseError(`Storage cleanup failed for ${file.name}`, cleanupError);
        }

        failedFiles.push({
          fileName: file.name,
          error: insertError ?? new Error("Document metadata was not saved."),
        });
        continue;
      }

      const savedDocument = insertedMetadata as ManpowerDocument;
      if (savedDocument.manpower_id !== manpowerId || savedDocument.file_path !== uploadedPath) {
        logSupabaseError(`Metadata verification failed for ${file.name}`, {
          message: "The returned document metadata did not match the current manpower record or Storage path.",
        });
        failedFiles.push({ fileName: file.name, error: new Error("Document metadata verification failed.") });
        continue;
      }

      uploadedDocuments.push(savedDocument);
    }

    return { uploadedDocuments, failedFiles };
  }

  async function handleSave() {
    if (!form.mine_manager_name.trim()) {
      toast.error("Mine Manager Name is required");
      return;
    }
    if (!form.status) {
      toast.error("Status is required");
      return;
    }

    const experience = form.experience_years.trim() === "" ? null : Number(form.experience_years);
    if (experience != null && (!Number.isFinite(experience) || experience < 0)) {
      toast.error("Experience must be a valid non-negative number");
      return;
    }

    const selectedMineId = form.mine_id.trim() || null;
    if (selectedMineId && (!UUID_PATTERN.test(selectedMineId) || !mineOptions.some((mine) => mine.id === selectedMineId))) {
      toast.error("Please select a valid mine from the Mine list");
      return;
    }

    setSaving(true);
    try {
      await requireActiveSession();

      const payload = {
        mine_manager_name: form.mine_manager_name.trim(),
        department: form.department || null,
        designation: form.designation || null,
        statutory_rule: form.statutory_rule || null,
        mine_id: selectedMineId,
        appointment_date: form.appointment_date || null,
        qualification: form.qualification.trim() || null,
        experience_years: experience,
        certificate_number: form.certificate_number.trim() || null,
        status: form.status,
        notes: form.notes.trim() || null,
      };

      let savedRecord: Manpower;
      if (editing) {
        const { data, error } = await (supabase as any)
          .from("statutory_manpower")
          .update(payload)
          .eq("id", editing.id)
          .select("id,mine_manager_name,department,designation,statutory_rule,mine_id,appointment_date,qualification,experience_years,certificate_number,status,notes,created_at,updated_at")
          .single();
        if (error) {
          logSupabaseError("UPDATE public.statutory_manpower failed", error);
          throw error;
        }
        if (!data?.id) throw new Error("The record was updated but Supabase did not return the saved row.");
        savedRecord = data as Manpower;
        setRows((current) => current.map((row) => row.id === savedRecord.id ? savedRecord : row));
      } else {
        const { data, error } = await (supabase as any)
          .from("statutory_manpower")
          .insert(payload)
          .select("id,mine_manager_name,department,designation,statutory_rule,mine_id,appointment_date,qualification,experience_years,certificate_number,status,notes,created_at,updated_at")
          .single();
        if (error) {
          logSupabaseError("INSERT public.statutory_manpower failed", error);
          throw error;
        }
        if (!data?.id) throw new Error("Supabase did not return the newly created Statutory Manpower record.");
        savedRecord = data as Manpower;
        setRows((current) => [...current, savedRecord].sort((a, b) => a.mine_manager_name.localeCompare(b.mine_manager_name)));
      }

      if (pendingFiles.length) {
        try {
          const { uploadedDocuments, failedFiles } = await uploadDocuments(savedRecord.id, pendingFiles);

          // Re-read from the database using the exact saved parent UUID. This verifies that
          // persisted metadata is queryable and immediately refreshes the document state.
          const persistedDocuments = await loadDocuments(savedRecord.id);
          const uploadedIds = new Set(uploadedDocuments.map((document) => document.id));
          const persistedUploadedCount = persistedDocuments.filter((document) => uploadedIds.has(document.id)).length;

          if (persistedUploadedCount !== uploadedDocuments.length) {
            console.error("[Statutory Manpower] Document persistence verification mismatch", {
              manpowerId: savedRecord.id,
              insertedCount: uploadedDocuments.length,
              fetchedInsertedCount: persistedUploadedCount,
            });
            toast.warning("Record saved, but document verification was incomplete", {
              description: "The manpower record is safe. Reopen it to verify its document list.",
            });
          }

          if (failedFiles.length) {
            const firstFailure = failedFiles[0];
            toast.warning(`${uploadedDocuments.length} document(s) uploaded; ${failedFiles.length} failed`, {
              description: `${firstFailure.fileName}: ${getErrorMessage(firstFailure.error, "Upload failed")}`,
            });
          } else if (uploadedDocuments.length) {
            toast.success(`${uploadedDocuments.length} document(s) uploaded`);
          }
        } catch (documentError) {
          // The parent row has already been persisted. Never delete/roll it back because
          // a separate Storage or document-metadata operation failed.
          logSupabaseError("Document save flow failed", documentError);
          toast.warning(editing ? "Record updated, but documents could not be uploaded" : "Record created, but documents could not be uploaded", {
            description: getErrorMessage(documentError, "Document upload failed. Open the record and retry the documents."),
          });
        }
      }

      toast.success(editing ? "Statutory Manpower updated" : "Statutory Manpower created");
      setDialogOpen(false);
      resetForm();
      await loadRows();
    } catch (error) {
      toast.error(editing ? "Update failed" : "Create failed", {
        description: getErrorMessage(error, "Unable to save Statutory Manpower"),
      });
      if (editing) await loadDocuments(editing.id);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    const { data: documentData } = await (supabase as any)
      .from("statutory_manpower_documents")
      .select("file_path")
      .eq("manpower_id", deleteTarget.id);
    const paths = ((documentData ?? []) as { file_path: string }[]).map((doc) => doc.file_path).filter(Boolean);

    const { error } = await (supabase as any)
      .from("statutory_manpower")
      .delete()
      .eq("id", deleteTarget.id);

    if (error) {
      toast.error("Delete failed", { description: error.message });
      return;
    }

    if (paths.length) {
      const { error: storageError } = await supabase.storage.from("statutory-manpower-documents").remove(paths);
      if (storageError) {
        toast.warning("Record deleted, but some stored files could not be removed", { description: storageError.message });
      }
    }

    toast.success("Statutory Manpower deleted");
    setDeleteTarget(null);
    await loadRows();
  }

  async function handleDeleteDocument() {
    if (!documentDeleteTarget) return;
    setDocumentDeleting(true);
    try {
      await requireActiveSession();
      const target = documentDeleteTarget;

      const { error: storageError } = await supabase.storage
        .from(STATUTORY_MANPOWER_DOCUMENT_BUCKET)
        .remove([target.file_path]);
      if (storageError) {
        logSupabaseError(`Storage delete failed for ${target.file_name}`, storageError);
        throw storageError;
      }

      const { error: metadataDeleteError } = await (supabase as any)
        .from("statutory_manpower_documents")
        .delete()
        .eq("id", target.id)
        .eq("manpower_id", target.manpower_id);
      if (metadataDeleteError) {
        logSupabaseError(`Metadata DELETE failed for ${target.file_name}`, metadataDeleteError);
        throw metadataDeleteError;
      }

      setDocuments((current) => current.filter((document) => document.id !== target.id));
      setDocumentDeleteTarget(null);
      await loadDocuments(target.manpower_id);
      toast.success("Document deleted");
    } catch (error) {
      toast.error("Failed to delete document", { description: getErrorMessage(error, "Unable to delete document") });
    } finally {
      setDocumentDeleting(false);
    }
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (query) {
        const haystack = [
          row.mine_manager_name,
          row.department,
          row.designation,
          row.statutory_rule,
          getMineName(row, mineOptions),
          row.qualification,
          row.certificate_number,
          row.status,
          row.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (fDepartment !== "all" && row.department !== fDepartment) return false;
      if (fDesignation !== "all" && row.designation !== fDesignation) return false;
      if (fStatus !== "all" && row.status !== fStatus) return false;
      if (fMine !== "all" && row.mine_id !== fMine) return false;
      return true;
    });
  }, [rows, mineOptions, search, fDepartment, fDesignation, fStatus, fMine]);

  const designations = useMemo(() => {
    return Array.from(new Set([...DESIGNATIONS, ...rows.map((row) => row.designation).filter((value): value is string => !!value)]));
  }, [rows]);

  const statutoryRules = useMemo(() => {
    return Array.from(new Set([...STATUTORY_RULES, ...rows.map((row) => row.statutory_rule).filter((value): value is string => !!value)]));
  }, [rows]);

  return (
    <>
      <Topbar title="Statutory Manpower" subtitle="Manage statutory personnel appointments, qualifications and documents" />
      <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="relative w-full min-w-0 sm:min-w-[220px] sm:flex-1">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, qualification, certificate…"
                  className="pl-8"
                />
              </div>
              <FilterSelect label="Department" value={fDepartment} onChange={setFDepartment} options={departments} />
              <FilterSelect label="Designation" value={fDesignation} onChange={setFDesignation} options={designations} />
              <FilterSelect label="Status" value={fStatus} onChange={setFStatus} options={MANPOWER_STATUSES} />
              <div className="w-full sm:w-[180px]">
                <Label className="text-xs text-muted-foreground">Mine</Label>
                <Select value={fMine} onValueChange={setFMine}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {mineOptions.map((mine) => <SelectItem key={mine.id} value={mine.id}>{mine.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={openNew} className="w-full sm:ml-auto sm:w-auto">
                <Plus className="size-4" /> New Statutory Manpower
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card max-w-full overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mine Manager Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Statutory Rule</TableHead>
                  <TableHead>Mine</TableHead>
                  <TableHead>Appointment Date</TableHead>
                  <TableHead>Qualification</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Certificate Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="py-10 text-center">
                      <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                      <UsersRound className="mx-auto mb-2 size-8 opacity-50" />
                      No Statutory Manpower records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.mine_manager_name}</TableCell>
                      <TableCell>{row.department || "—"}</TableCell>
                      <TableCell>{row.designation || "—"}</TableCell>
                      <TableCell>{row.statutory_rule || "—"}</TableCell>
                      <TableCell>{getMineName(row, mineOptions)}</TableCell>
                      <TableCell>{formatDate(row.appointment_date)}</TableCell>
                      <TableCell className="max-w-[240px] whitespace-normal">{row.qualification || "—"}</TableCell>
                      <TableCell>{row.experience_years == null ? "—" : `${row.experience_years} yr`}</TableCell>
                      <TableCell>{row.certificate_number || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={statusBadge(row.status)}>{row.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="size-8" title="View" onClick={() => openView(row)}>
                            <Eye className="size-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="size-8" title="Edit" onClick={() => openEdit(row)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="size-8 text-destructive" title="Delete" onClick={() => setDeleteTarget(row)}>
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

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Statutory Manpower" : "New Statutory Manpower"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the statutory appointment and supporting documents." : "Create a statutory manpower record and attach one or more supporting documents."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="mine_manager_name">Mine Manager Name *</Label>
              <Input
                id="mine_manager_name"
                value={form.mine_manager_name}
                onChange={(event) => setForm({ ...form, mine_manager_name: event.target.value })}
                placeholder="Full name"
              />
            </div>

            <FormSelect label="Department" value={form.department} onChange={(value) => setForm({ ...form, department: value })} options={departments} placeholder="Select department" />
            <FormSelect label="Designation" value={form.designation} onChange={(value) => setForm({ ...form, designation: value })} options={designations} placeholder="Select designation" />
            <FormSelect label="Statutory Rule" value={form.statutory_rule} onChange={(value) => setForm({ ...form, statutory_rule: value })} options={statutoryRules} placeholder="Select statutory rule" />

            <div className="space-y-2">
              <Label>Mine</Label>
              <Select value={form.mine_id} onValueChange={(value) => setForm({ ...form, mine_id: value })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select mine" /></SelectTrigger>
                <SelectContent>
                  {mineOptions.map((mine) => <SelectItem key={mine.id} value={mine.id}>{mine.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="appointment_date">Appointment Date</Label>
              <Input id="appointment_date" type="date" value={form.appointment_date} onChange={(event) => setForm({ ...form, appointment_date: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="experience_years">Experience (Years)</Label>
              <Input id="experience_years" type="number" min="0" step="0.1" inputMode="decimal" value={form.experience_years} onChange={(event) => setForm({ ...form, experience_years: event.target.value })} placeholder="e.g. 12" />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="qualification">Qualification</Label>
              <Input id="qualification" value={form.qualification} onChange={(event) => setForm({ ...form, qualification: event.target.value })} placeholder="e.g. B.Tech Mining, First Class Mine Manager" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="certificate_number">Certificate Number</Label>
              <Input id="certificate_number" value={form.certificate_number} onChange={(event) => setForm({ ...form, certificate_number: event.target.value })} />
            </div>
            <FormSelect label="Status *" value={form.status} onChange={(value) => setForm({ ...form, status: value })} options={MANPOWER_STATUSES} placeholder="Select status" />

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} />
            </div>

            <div className="sm:col-span-2 rounded-lg border border-border p-3 sm:p-4 space-y-3 min-w-0">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium">Documents</div>
                  <div className="text-xs text-muted-foreground">Upload multiple files to this Statutory Manpower record.</div>
                </div>
                <Label htmlFor="manpower-documents" className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm hover:bg-accent">
                  <Upload className="size-4" /> Upload Documents
                </Label>
                <Input id="manpower-documents" type="file" multiple onChange={handleFileSelection} className="sr-only" />
              </div>

              {pendingFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Ready to upload</div>
                  {pendingFiles.map((file, index) => (
                    <div key={`${file.name}-${file.size}-${index}`} className="flex min-w-0 items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{file.name}</div>
                        <div className="text-xs text-muted-foreground">{formatFileSize(file.size)} · {file.type || "File"}</div>
                      </div>
                      <Button type="button" size="icon" variant="ghost" className="size-8 shrink-0" aria-label={`Remove ${file.name}`} onClick={() => removePendingFile(index)}>
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {editing && (
                <DocumentList
                  documents={documents}
                  loading={documentsLoading}
                  error={documentsError}
                  onDelete={setDocumentDeleteTarget}
                />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editing ? "Save Changes" : "Create Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={(open) => {
        setViewOpen(open);
        if (!open) {
          setViewing(null);
          setDocuments([]);
          setDocumentsError(null);
        }
      }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Statutory Manpower Details</DialogTitle>
            <DialogDescription>Appointment details and supporting documents.</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-5 py-2">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Detail label="Mine Manager Name" value={viewing.mine_manager_name} />
                <Detail label="Department" value={viewing.department} />
                <Detail label="Designation" value={viewing.designation} />
                <Detail label="Statutory Rule" value={viewing.statutory_rule} />
                <Detail label="Mine" value={getMineName(viewing, mineOptions)} />
                <Detail label="Appointment Date" value={formatDate(viewing.appointment_date)} />
                <Detail label="Qualification" value={viewing.qualification} />
                <Detail label="Experience" value={viewing.experience_years == null ? null : `${viewing.experience_years} years`} />
                <Detail label="Certificate Number" value={viewing.certificate_number} />
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <Badge variant="outline" className={`mt-1 ${statusBadge(viewing.status)}`}>{viewing.status}</Badge>
                </div>
                <div className="sm:col-span-2"><Detail label="Notes" value={viewing.notes} /></div>
              </div>

              <div className="rounded-lg border border-border p-3 sm:p-4">
                <div className="mb-3 font-medium">Documents</div>
                <DocumentList
                  documents={documents}
                  loading={documentsLoading}
                  error={documentsError}
                  onDelete={setDocumentDeleteTarget}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
            {viewing && <Button onClick={() => { const row = viewing; setViewOpen(false); openEdit(row); }}>Edit</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Statutory Manpower?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete {deleteTarget?.mine_manager_name ?? "this record"} and its document records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!documentDeleteTarget} onOpenChange={(open) => { if (!open && !documentDeleting) setDocumentDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes only {documentDeleteTarget?.file_name ?? "this document"}. The Statutory Manpower record will remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={documentDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={documentDeleting} onClick={handleDeleteDocument} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {documentDeleting && <Loader2 className="size-4 animate-spin" />} Delete Document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <div className="w-full sm:w-[170px]">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function FormSelect({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (value: string) => void; options: string[]; placeholder: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full"><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm font-medium">{value || "—"}</div>
    </div>
  );
}

function DocumentList({ documents, loading, error, onDelete }: { documents: ManpowerDocument[]; loading: boolean; error: string | null; onDelete: (document: ManpowerDocument) => void }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> Loading documents...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Unable to load documents: {error}
      </div>
    );
  }

  if (!documents.length) {
    return <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No documents uploaded</div>;
  }

  return (
    <div className="space-y-2">
      {documents.map((document) => {
        return (
          <div key={document.id} className="flex min-w-0 flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="break-all text-sm font-medium sm:break-normal sm:truncate">{document.file_name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {document.file_type || "File"} · {formatFileSize(document.file_size)} · {formatUploadedAt(document.uploaded_at)}
                </div>
              </div>
            </div>
            <div className="flex gap-2 sm:shrink-0">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => void openDocument(document)}
              >
                <Eye className="size-4" /> View
              </Button>
              <Button type="button" size="sm" variant="ghost" className="flex-1 text-destructive sm:flex-none" onClick={() => onDelete(document)}>
                <Trash2 className="size-4" /> Delete
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
