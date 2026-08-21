import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Topbar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, ArrowUpDown, Pencil, Trash2, Loader2, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMasterNames } from "@/lib/masters";

export const Route = createFileRoute("/compliance")({
  head: () => ({ meta: [{ title: "Compliance Management — Mining Compliance Command Center" }] }),
  component: ComplianceModule,
});

const AUTHORITIES_FALLBACK = ["IBM", "DGMS", "MoEFCC", "SPCB", "Forest", "PESO", "Revenue", "Labour", "State Mining", "Other"];
const STATUSES_FALLBACK = ["Upcoming", "In Progress", "Submitted", "Approved", "Completed", "Overdue", "Escalated", "Cancelled"];
const PRIORITIES_FALLBACK = ["Critical", "High", "Medium", "Low"];
const DEPARTMENTS_FALLBACK = ["Mining", "Environment", "Safety", "Legal", "HR", "Finance", "Operations"];
const MINES_FALLBACK = ["Block A-12", "Block B-7", "Block C-3", "Block D-9", "Block E-1"];
const CATEGORIES_FALLBACK = ["Return", "Report", "Payment", "Renewal", "Inspection"];
const TYPES_FALLBACK = ["Monthly Return", "Quarterly Report", "Annual Report", "Cess Payment", "License Renewal"];

type ComplianceDocument = {
  name: string;
  path: string;
  url: string;
  size: number;
  type: string;
  uploaded_at: string;
};

type Compliance = {
  id: string;
  sr_no: number | null;
  title: string;
  authority: string;
  category: string | null;
  type: string | null;
  mine: string | null;
  lease: string | null;
  due_date: string | null;
  completion_date: string | null;
  responsible_person: string | null;
  department: string | null;
  priority: string;
  status: string;
  notes: string | null;
  tags: string[] | null;
  documents: unknown;
  approval_workflow: unknown;
  created_at: string;
  updated_at: string;
};

const emptyForm = {
  title: "",
  authority: "",
  category_type: "",
  mine: "",
  lease: "",
  due_date: "",
  completion_date: "",
  responsible_person: "",
  department: "",
  priority: "Medium",
  status: "Upcoming",
  notes: "",
  tags: "",
};

type FormState = typeof emptyForm;


function encodeCategoryType(category: string | null, type: string | null) {
  if (category && type) return `both:${encodeURIComponent(category)}|${encodeURIComponent(type)}`;
  if (category) return `category:${encodeURIComponent(category)}`;
  if (type) return `type:${encodeURIComponent(type)}`;
  return "";
}

function decodeCategoryType(value: string): { category: string | null; type: string | null } {
  if (value.startsWith("both:")) {
    const [category = "", type = ""] = value.slice(5).split("|");
    return {
      category: category ? decodeURIComponent(category) : null,
      type: type ? decodeURIComponent(type) : null,
    };
  }
  if (value.startsWith("category:")) {
    return { category: decodeURIComponent(value.slice(9)), type: null };
  }
  if (value.startsWith("type:")) {
    return { category: null, type: decodeURIComponent(value.slice(5)) };
  }
  return { category: null, type: null };
}

function getComplianceDocument(value: unknown): ComplianceDocument | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const doc = value[0];
  if (!doc || typeof doc !== "object") return null;
  const candidate = doc as Partial<ComplianceDocument>;
  if (!candidate.name || !candidate.path || !candidate.url) return null;
  return {
    name: candidate.name,
    path: candidate.path,
    url: candidate.url,
    size: typeof candidate.size === "number" ? candidate.size : 0,
    type: candidate.type ?? "application/octet-stream",
    uploaded_at: candidate.uploaded_at ?? "",
  };
}

function safeStorageFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function priorityBadge(p: string) {
  const map: Record<string, string> = {
    Critical: "bg-destructive/15 text-destructive border-destructive/30",
    High: "bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-300",
    Medium: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300",
    Low: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  };
  return map[p] ?? "bg-muted text-muted-foreground border-border";
}
function statusBadge(s: string) {
  const map: Record<string, string> = {
    Upcoming: "bg-sky-500/15 text-sky-700 border-sky-500/30 dark:text-sky-300",
    "In Progress": "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300",
    Submitted: "bg-indigo-500/15 text-indigo-700 border-indigo-500/30 dark:text-indigo-300",
    Approved: "bg-teal-500/15 text-teal-700 border-teal-500/30 dark:text-teal-300",
    Completed: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
    Overdue: "bg-destructive/15 text-destructive border-destructive/30",
    Escalated: "bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-300",
    Cancelled: "bg-muted text-muted-foreground border-border",
  };
  return map[s] ?? "bg-muted text-muted-foreground border-border";
}

function ComplianceModule() {
  const { names: AUTHORITIES } = useMasterNames("authorities", AUTHORITIES_FALLBACK);
  const { names: STATUSES } = useMasterNames("statuses", STATUSES_FALLBACK);
  const { names: PRIORITIES } = useMasterNames("priorities", PRIORITIES_FALLBACK);
  const { names: MINES } = useMasterNames("mines", MINES_FALLBACK);
  const { names: DEPARTMENTS } = useMasterNames("departments", DEPARTMENTS_FALLBACK);
  const { names: CATEGORIES } = useMasterNames("categories", CATEGORIES_FALLBACK);
  const { names: TYPES } = useMasterNames("types", TYPES_FALLBACK);
  const { names: RESPONSIBLE_PERSONS } = useMasterNames("responsible_persons", []);
  const navigate = useNavigate();
  const searchParams = useSearch({ from: "/compliance" });
  const calendarCreateDate = searchParams.create === "1" && searchParams.fromCalendar === "1"
    && typeof searchParams.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date)
      ? searchParams.date
      : "";
  const calendarReturnView = searchParams.calendarView === "week" || searchParams.calendarView === "day" ? searchParams.calendarView : "month";
  
  const [rows, setRows] = useState<Compliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Compliance | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Compliance | null>(null);

  const [search, setSearch] = useState("");
  const [fAuthority, setFAuthority] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fPriority, setFPriority] = useState("all");
  const [fMine, setFMine] = useState("all");
  const [fDepartment, setFDepartment] = useState("all");
  const [fDueFrom, setFDueFrom] = useState("");
  const [fDueTo, setFDueTo] = useState("");
  const [sortAsc, setSortAsc] = useState(true);

  // Apply URL search params as initial filters
  useEffect(() => {
    if (searchParams.status) {
      setFStatus(searchParams.status);
    }
  }, [searchParams.status]);

  useEffect(() => {
    if (!calendarCreateDate) return;
    setEditing(null);
    setForm({ ...emptyForm, completion_date: calendarCreateDate });
    setDocumentFile(null);
    setDialogOpen(true);
  }, [calendarCreateDate]);

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("compliances")
      .select("*")
      .order("due_date", { ascending: true, nullsFirst: false });
    if (error) {
      toast.error("Failed to load compliances", { description: error.message });
    } else {
      setRows((data ?? []) as Compliance[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setDocumentFile(null);
    setDialogOpen(true);
  }

  function openEdit(row: Compliance) {
    setEditing(row);
    setForm({
      title: row.title ?? "",
      authority: row.authority ?? "",
      category_type: encodeCategoryType(row.category, row.type),
      mine: row.mine ?? "",
      lease: row.lease ?? "",
      due_date: row.due_date ?? "",
      completion_date: row.completion_date ?? "",
      responsible_person: row.responsible_person ?? "",
      department: row.department ?? "",
      priority: row.priority ?? "Medium",
      status: row.status ?? "Upcoming",
      notes: row.notes ?? "",
      tags: (row.tags ?? []).join(", "),
    });
    setDocumentFile(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) return toast.error("Title is required");
    if (!form.authority) return toast.error("Authority is required");
    if (!form.due_date) return toast.error("Due date is required");
    if (!form.priority) return toast.error("Priority is required");
    if (!form.status) return toast.error("Status is required");

    setSaving(true);
    let uploadedDocument: ComplianceDocument | null = null;
    try {
      const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const categoryType = decodeCategoryType(form.category_type);
      const existingDocument = editing ? getComplianceDocument(editing.documents) : null;

      if (documentFile) {
        const storagePath = `compliances/${Date.now()}-${safeStorageFileName(documentFile.name)}`;
        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(storagePath, documentFile);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("documents")
          .getPublicUrl(storagePath);

        uploadedDocument = {
          name: documentFile.name,
          path: storagePath,
          url: publicUrl,
          size: documentFile.size,
          type: documentFile.type || "application/octet-stream",
          uploaded_at: new Date().toISOString(),
        };
      }

      const payload = {
        title: form.title.trim(),
        authority: form.authority,
        category: categoryType.category,
        type: categoryType.type,
        mine: form.mine || null,
        lease: form.lease || null,
        due_date: form.due_date || null,
        completion_date: form.completion_date || null,
        responsible_person: form.responsible_person || null,
        department: form.department || null,
        priority: form.priority,
        status: form.status,
        notes: form.notes || null,
        tags,
        documents: uploadedDocument ? [uploadedDocument] : (editing?.documents ?? []),
      };

      const q = editing
        ? (supabase as any).from("compliances").update(payload).eq("id", editing.id)
        : (supabase as any).from("compliances").insert(payload);
      const { error } = await q;
      if (error) throw error;

      if (uploadedDocument && existingDocument?.path && existingDocument.path !== uploadedDocument.path) {
        const { error: removeError } = await supabase.storage
          .from("documents")
          .remove([existingDocument.path]);
        if (removeError) {
          toast.warning("Compliance saved, but the previous document could not be removed", { description: removeError.message });
        }
      }

      const createdFromCalendar = !editing && !!calendarCreateDate;
      toast.success(editing ? "Compliance updated" : "Compliance created");
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setDocumentFile(null);
      if (createdFromCalendar) {
        navigate({ to: "/calendar", search: { date: calendarCreateDate, view: calendarReturnView } as any });
        return;
      }
      load();
    } catch (error: any) {
      if (uploadedDocument?.path) {
        await supabase.storage.from("documents").remove([uploadedDocument.path]);
      }
      toast.error(editing ? "Update failed" : "Create failed", { description: error?.message ?? "Unable to save compliance" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await (supabase as any).from("compliances").delete().eq("id", deleteTarget.id);
    if (error) {
      toast.error("Delete failed", { description: error.message });
    } else {
      toast.success("Compliance deleted");
      setDeleteTarget(null);
      load();
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const arr = rows.filter((r) => {
      if (q) {
        const hay = [r.title, r.authority, r.category, r.type, r.mine, r.lease, r.responsible_person, r.department, r.notes]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (fAuthority !== "all" && r.authority !== fAuthority) return false;
      if (fStatus === "Open") {
        const completedStatuses = new Set(["Completed", "Approved", "Submitted"]);
        const today = new Date();
        const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const isOverdue = r.status === "Overdue" || (!completedStatuses.has(r.status) && !!r.due_date && r.due_date < todayKey);
        if (completedStatuses.has(r.status) || isOverdue) return false;
      } else if (fStatus !== "all" && r.status !== fStatus) return false;
      if (fPriority !== "all" && r.priority !== fPriority) return false;
      if (fMine !== "all" && r.mine !== fMine) return false;
      if (fDepartment !== "all" && r.department !== fDepartment) return false;
      if (fDueFrom && (!r.due_date || r.due_date < fDueFrom)) return false;
      if (fDueTo && (!r.due_date || r.due_date > fDueTo)) return false;
      return true;
    });
    arr.sort((a, b) => {
      const av = a.due_date ?? "";
      const bv = b.due_date ?? "";
      if (av === bv) return 0;
      if (!av) return 1;
      if (!bv) return -1;
      return sortAsc ? (av < bv ? -1 : 1) : (av < bv ? 1 : -1);
    });
    return arr;
  }, [rows, search, fAuthority, fStatus, fPriority, fMine, fDepartment, fDueFrom, fDueTo, sortAsc]);

  return (
    <>
      <Topbar title="Compliance Management" subtitle="Track every statutory obligation across authorities" />
      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Filters bar */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, authority, mine, person…" className="pl-8" />
            </div>
            <FilterSelect label="Authority" value={fAuthority} onChange={setFAuthority} options={AUTHORITIES} />
            <FilterSelect label="Status" value={fStatus} onChange={setFStatus} options={Array.from(new Set(["Open", ...STATUSES]))} />
            <FilterSelect label="Priority" value={fPriority} onChange={setFPriority} options={PRIORITIES} />
            <FilterSelect label="Mine" value={fMine} onChange={setFMine} options={MINES} />
            <FilterSelect label="Department" value={fDepartment} onChange={setFDepartment} options={DEPARTMENTS} />
            <div>
              <Label className="text-xs text-muted-foreground">Due from</Label>
              <Input type="date" value={fDueFrom} onChange={(e) => setFDueFrom(e.target.value)} className="w-[150px]" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Due to</Label>
              <Input type="date" value={fDueTo} onChange={(e) => setFDueTo(e.target.value)} className="w-[150px]" />
            </div>
            <Button onClick={openNew} className="ml-auto">
              <Plus className="size-4" /> New Compliance
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Sr.</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Authority</TableHead>
                <TableHead>Mine</TableHead>
                <TableHead>Responsible</TableHead>
                <TableHead>
                  <button onClick={() => setSortAsc((s) => !s)} className="inline-flex items-center gap-1 hover:text-foreground">
                    Due Date <ArrowUpDown className="size-3.5" />
                  </button>
                </TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin inline mr-2" /> Loading compliances…
                </TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  No compliances found. Click <span className="text-foreground font-medium">New Compliance</span> to create one.
                </TableCell></TableRow>
              ) : filtered.map((r, index) => (
                <TableRow key={r.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell>{r.authority}</TableCell>
                  <TableCell>{r.mine ?? "—"}</TableCell>
                  <TableCell>{r.responsible_person ?? "—"}</TableCell>
                  <TableCell>{r.due_date ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline" className={priorityBadge(r.priority)}>{r.priority}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={statusBadge(r.status)}>{r.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)} aria-label="Edit"><Pencil className="size-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(r)} aria-label="Delete"><Trash2 className="size-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); setForm(emptyForm); setDocumentFile(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Compliance" : "New Compliance"}</DialogTitle>
            <DialogDescription>Fields marked with * are required.</DialogDescription>
          </DialogHeader>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Title *" className="sm:col-span-2">
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. IBM Monthly Return (F1)" />
            </Field>
            <Field label="Authority *">
              <PickSelect value={form.authority} onChange={(v) => setForm({ ...form, authority: v })} options={AUTHORITIES} placeholder="Select authority" />
            </Field>
            <Field label="Category / Type">
              <CategoryTypeSelect
                value={form.category_type}
                onChange={(v) => setForm({ ...form, category_type: v })}
                categories={CATEGORIES}
                types={TYPES}
                currentCategory={editing?.category ?? null}
                currentType={editing?.type ?? null}
              />
            </Field>
            <Field label="Mine Name">
              <PickSelect value={form.mine} onChange={(v) => setForm({ ...form, mine: v })} options={MINES} placeholder="Select mine" />
            </Field>
            <Field label="Lease"><Input value={form.lease} onChange={(e) => setForm({ ...form, lease: e.target.value })} placeholder="Lease ref." /></Field>
            <Field label="Department">
              <PickSelect value={form.department} onChange={(v) => setForm({ ...form, department: v })} options={DEPARTMENTS} placeholder="Select department" />
            </Field>
            <Field label="Due Date *"><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
            <Field label="Target Completion Date"><Input type="date" value={form.completion_date} onChange={(e) => setForm({ ...form, completion_date: e.target.value })} /></Field>
            <Field label="Statutory List">
              <PickSelect
                value={form.responsible_person}
                onChange={(v) => setForm({ ...form, responsible_person: v })}
                options={Array.from(new Set([...(form.responsible_person ? [form.responsible_person] : []), ...RESPONSIBLE_PERSONS]))}
                placeholder="Select statutory person"
              />
            </Field>
            <Field label="Priority *">
              <PickSelect value={form.priority} onChange={(v) => setForm({ ...form, priority: v })} options={PRIORITIES} />
            </Field>
            <Field label="Status *">
              <PickSelect value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={STATUSES} />
            </Field>
            <Field label="Tags (comma separated)" className="sm:col-span-2">
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="e.g. monthly, statutory, IBM" />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes…" />
            </Field>
            <Field label="Document Upload" className="sm:col-span-2">
              <div className="rounded-md border border-dashed border-border p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)}
                    className="max-w-md"
                  />
                  <div className="text-xs text-muted-foreground">
                    {documentFile ? (
                      <span className="inline-flex items-center gap-1.5"><Upload className="size-3.5" />{documentFile.name}</span>
                    ) : getComplianceDocument(editing?.documents) ? (
                      <span className="inline-flex items-center gap-1.5"><FileText className="size-3.5" />Current: {getComplianceDocument(editing?.documents)?.name}</span>
                    ) : (
                      "Attach a PDF document (optional)"
                    )}
                  </div>
                </div>
              </div>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editing ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this compliance?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" will be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function PickSelect({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={placeholder ?? "Select…"} /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function CategoryTypeSelect({
  value,
  onChange,
  categories,
  types,
  currentCategory,
  currentType,
}: {
  value: string;
  onChange: (v: string) => void;
  categories: string[];
  types: string[];
  currentCategory: string | null;
  currentType: string | null;
}) {
  const currentCombinedValue = currentCategory && currentType ? encodeCategoryType(currentCategory, currentType) : null;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Select category or type" /></SelectTrigger>
      <SelectContent>
        {currentCombinedValue && value === currentCombinedValue && (
          <SelectGroup>
            <SelectLabel>Current value</SelectLabel>
            <SelectItem value={currentCombinedValue}>{currentCategory} / {currentType}</SelectItem>
          </SelectGroup>
        )}
        {categories.length > 0 && (
          <SelectGroup>
            <SelectLabel>Categories</SelectLabel>
            {categories.map((option) => (
              <SelectItem key={`category-${option}`} value={`category:${encodeURIComponent(option)}`}>{option}</SelectItem>
            ))}
          </SelectGroup>
        )}
        {types.length > 0 && (
          <SelectGroup>
            <SelectLabel>Types</SelectLabel>
            {types.map((option) => (
              <SelectItem key={`type-${option}`} value={`type:${encodeURIComponent(option)}`}>{option}</SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
