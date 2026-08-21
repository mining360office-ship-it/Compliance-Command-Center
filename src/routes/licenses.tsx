import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { Plus, Search, Eye, Pencil, Trash2, Loader2, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMasterNames } from "@/lib/masters";

export const Route = createFileRoute("/licenses")({
  head: () => ({ meta: [{ title: "Licenses & Permits — Mining Compliance Command Center" }] }),
  component: LicensesModule,
});

const AUTHORITIES_FALLBACK = ["IBM", "DGMS", "MoEFCC", "SPCB", "Forest", "PESO", "Revenue", "Labour", "State Mining", "Other"];
const MINES_FALLBACK = ["Block A-12", "Block B-7", "Block C-3", "Block D-9", "Block E-1"];
const STATUSES = ["Active", "Expiring Soon", "Expired", "Pending Renewal", "Cancelled"];

type License = {
  id: string;
  license_name: string;
  license_number: string | null;
  authority: string | null;
  mine: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  renewal_date: string | null;
  status: string;
  responsible_person: string | null;
  documents: unknown;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type LicenseDocument = {
  name: string;
  path: string;
  url: string;
  size: number;
  type: string;
  uploaded_at: string;
};

function safeStorageFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function getLicenseDocument(value: unknown): LicenseDocument | null {
  let candidate: any = value;
  if (typeof candidate === "string") {
    try { candidate = JSON.parse(candidate); }
    catch { return null; }
  }
  if (Array.isArray(candidate)) candidate = candidate[0];
  if (!candidate || typeof candidate !== "object") return null;

  const url = typeof candidate.url === "string"
    ? candidate.url
    : typeof candidate.file_url === "string"
      ? candidate.file_url
      : "";
  if (!url) return null;

  let path = typeof candidate.path === "string" ? candidate.path : "";
  if (!path) {
    try {
      const parsed = new URL(url);
      const marker = "/storage/v1/object/public/documents/";
      if (parsed.pathname.startsWith(marker)) path = decodeURIComponent(parsed.pathname.slice(marker.length));
    } catch {
      return null;
    }
  }

  return {
    name: typeof candidate.name === "string" ? candidate.name : typeof candidate.file_name === "string" ? candidate.file_name : "License document",
    path,
    url,
    size: typeof candidate.size === "number" ? candidate.size : typeof candidate.file_size === "number" ? candidate.file_size : 0,
    type: typeof candidate.type === "string" ? candidate.type : "application/octet-stream",
    uploaded_at: typeof candidate.uploaded_at === "string" ? candidate.uploaded_at : "",
  };
}

function getLicenseDocumentViewUrl(value: unknown): string | null {
  const document = getLicenseDocument(value);
  if (!document) return null;
  try {
    const configuredProjectUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!configuredProjectUrl) return null;
    const fileUrl = new URL(document.url);
    const projectUrl = new URL(configuredProjectUrl);
    if (fileUrl.origin !== projectUrl.origin) return null;
    if (!fileUrl.pathname.startsWith("/storage/v1/object/public/documents/")) return null;
    return fileUrl.toString();
  } catch {
    return null;
  }
}

const emptyForm = {
  license_name: "",
  license_number: "",
  authority: "",
  mine: "",
  issue_date: "",
  expiry_date: "",
  renewal_date: "",
  status: "Active",
  notes: "",
};
type FormState = typeof emptyForm;

function daysRemaining(expiry: string | null): number | null {
  if (!expiry) return null;
  const d = new Date(expiry + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function expiryBadge(days: number | null) {
  if (days === null) return { label: "—", cls: "bg-muted text-muted-foreground border-border" };
  if (days < 0) return { label: `Expired ${-days}d ago`, cls: "bg-destructive/15 text-destructive border-destructive/30" };
  if (days <= 30) return { label: `${days}d left`, cls: "bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-300" };
  if (days <= 90) return { label: `${days}d left`, cls: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300" };
  return { label: `${days}d left`, cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300" };
}

function statusBadge(s: string) {
  const map: Record<string, string> = {
    Active: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
    "Expiring Soon": "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300",
    Expired: "bg-destructive/15 text-destructive border-destructive/30",
    "Pending Renewal": "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300",
    Cancelled: "bg-muted text-muted-foreground border-border",
  };
  return map[s] ?? "bg-muted text-muted-foreground border-border";
}

function LicensesModule() {
  const { names: AUTHORITIES } = useMasterNames("authorities", AUTHORITIES_FALLBACK);
  const { names: MINES } = useMasterNames("mines", MINES_FALLBACK);
  const navigate = useNavigate();
  const searchParams = useSearch({ from: "/licenses" });
  const calendarCreateDate = searchParams.create === "1" && searchParams.fromCalendar === "1"
    && typeof searchParams.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date)
      ? searchParams.date
      : "";
  const calendarReturnView = searchParams.calendarView === "week" || searchParams.calendarView === "day" ? searchParams.calendarView : "month";
  const [rows, setRows] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<License | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<License | null>(null);

  const [search, setSearch] = useState("");
  const [fAuthority, setFAuthority] = useState("all");
  const [fMine, setFMine] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fExpiry, setFExpiry] = useState("all"); // all | expired | 30 | 90

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("licenses")
      .select("*")
      .order("expiry_date", { ascending: true, nullsFirst: false });
    if (error) toast.error("Failed to load licenses", { description: error.message });
    else setRows((data ?? []) as License[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!calendarCreateDate) return;
    setEditing(null);
    setForm({ ...emptyForm, expiry_date: calendarCreateDate });
    setDocumentFile(null);
    setDialogOpen(true);
  }, [calendarCreateDate]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setDocumentFile(null);
    setDialogOpen(true);
  }
  function openEdit(row: License) {
    setEditing(row);
    setForm({
      license_name: row.license_name ?? "",
      license_number: row.license_number ?? "",
      authority: row.authority ?? "",
      mine: row.mine ?? "",
      issue_date: row.issue_date ?? "",
      expiry_date: row.expiry_date ?? "",
      renewal_date: row.renewal_date ?? "",
      status: row.status ?? "Active",
      notes: row.notes ?? "",
    });
    setDocumentFile(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.license_name.trim()) return toast.error("License Name is required");
    if (!form.authority) return toast.error("Authority is required");
    if (!form.expiry_date) return toast.error("Expiry Date is required");
    if (!form.status) return toast.error("Status is required");

    setSaving(true);
    let uploadedDocument: LicenseDocument | null = null;
    try {
      const existingDocument = editing ? getLicenseDocument(editing.documents) : null;

      if (documentFile) {
        const storagePath = `licenses/${Date.now()}-${safeStorageFileName(documentFile.name)}`;
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
        license_name: form.license_name.trim(),
        license_number: form.license_number || null,
        authority: form.authority,
        mine: form.mine || null,
        issue_date: form.issue_date || null,
        expiry_date: form.expiry_date || null,
        renewal_date: form.renewal_date || null,
        status: form.status,
        documents: uploadedDocument ? [uploadedDocument] : (editing?.documents ?? []),
        notes: form.notes || null,
      };
      const q = editing
        ? (supabase as any).from("licenses").update(payload).eq("id", editing.id)
        : (supabase as any).from("licenses").insert(payload);
      const { error } = await q;
      if (error) throw error;

      if (uploadedDocument && existingDocument?.path && existingDocument.path !== uploadedDocument.path) {
        const { error: removeError } = await supabase.storage
          .from("documents")
          .remove([existingDocument.path]);
        if (removeError) {
          toast.warning("License saved, but the previous document could not be removed", { description: removeError.message });
        }
      }

      const createdFromCalendar = !editing && !!calendarCreateDate;
      toast.success(editing ? "License updated" : "License created");
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
      toast.error(editing ? "Update failed" : "Create failed", { description: error?.message ?? "Unable to save license" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await (supabase as any).from("licenses").delete().eq("id", deleteTarget.id);
    if (error) return toast.error("Delete failed", { description: error.message });
    toast.success("License deleted");
    setDeleteTarget(null);
    load();
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q) {
        const hay = [r.license_name, r.license_number, r.authority, r.mine, r.notes]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (fAuthority !== "all" && r.authority !== fAuthority) return false;
      if (fMine !== "all" && r.mine !== fMine) return false;
      if (fStatus !== "all" && r.status !== fStatus) return false;
      const d = daysRemaining(r.expiry_date);
      if (fExpiry === "expired" && (d === null || d >= 0)) return false;
      if (fExpiry === "30" && (d === null || d < 0 || d > 30)) return false;
      if (fExpiry === "90" && (d === null || d < 0 || d > 90)) return false;
      return true;
    });
  }, [rows, search, fAuthority, fMine, fStatus, fExpiry]);

  const counts = useMemo(() => {
    let active = 0, soon = 0, expired = 0;
    for (const r of rows) {
      const d = daysRemaining(r.expiry_date);
      if (d === null) continue;
      if (d < 0) expired++;
      else if (d <= 30) soon++;
      else active++;
    }
    return { active, soon, expired, total: rows.length };
  }, [rows]);

  return (
    <>
      <Topbar title="Licenses & Permits" subtitle="Lease, EC, CTO, explosives, forest approvals" />
      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total" value={counts.total} />
          <StatCard label="Active" value={counts.active} tone="emerald" />
          <StatCard label="Expiring ≤ 30d" value={counts.soon} tone="amber" />
          <StatCard label="Expired" value={counts.expired} tone="destructive" />
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, number, authority, mine…" className="pl-8" />
            </div>
            <FilterSelect label="Authority" value={fAuthority} onChange={setFAuthority} options={AUTHORITIES} />
            <FilterSelect label="Mine" value={fMine} onChange={setFMine} options={MINES} />
            <FilterSelect label="Status" value={fStatus} onChange={setFStatus} options={STATUSES} />
            <div>
              <Label className="text-xs text-muted-foreground">Expiry</Label>
              <Select value={fExpiry} onValueChange={setFExpiry}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="30">≤ 30 days</SelectItem>
                  <SelectItem value="90">≤ 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={openNew} className="ml-auto">
              <Plus className="size-4" /> New License
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>License</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Authority</TableHead>
                <TableHead>Mine</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin inline mr-2" /> Loading licenses…
                </TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  No licenses found. Click <span className="text-foreground font-medium">New License</span> to create one.
                </TableCell></TableRow>
              ) : filtered.map((r) => {
                const d = daysRemaining(r.expiry_date);
                const eb = expiryBadge(d);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.license_name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.license_number ?? "—"}</TableCell>
                    <TableCell>{r.authority ?? "—"}</TableCell>
                    <TableCell>{r.mine ?? "—"}</TableCell>
                    <TableCell>{r.issue_date ?? "—"}</TableCell>
                    <TableCell>{r.expiry_date ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={eb.cls}>{eb.label}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={statusBadge(r.status)}>{r.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {getLicenseDocumentViewUrl(r.documents) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => window.open(getLicenseDocumentViewUrl(r.documents)!, "_blank", "noopener,noreferrer")}
                          aria-label="View document"
                          title="View document"
                        >
                          <Eye className="size-4" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)} aria-label="Edit"><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(r)} aria-label="Delete"><Trash2 className="size-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); setForm(emptyForm); setDocumentFile(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit License" : "New License"}</DialogTitle>
            <DialogDescription>Fields marked with * are required.</DialogDescription>
          </DialogHeader>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="License Name *" className="sm:col-span-2">
              <Input value={form.license_name} onChange={(e) => setForm({ ...form, license_name: e.target.value })} placeholder="e.g. Consent to Operate (Air)" />
            </Field>
            <Field label="License Number"><Input value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} placeholder="e.g. CTO/AIR/2024/12345" /></Field>
            <Field label="Authority *">
              <PickSelect value={form.authority} onChange={(v) => setForm({ ...form, authority: v })} options={AUTHORITIES} placeholder="Select authority" />
            </Field>
            <Field label="Mine">
              <PickSelect value={form.mine} onChange={(v) => setForm({ ...form, mine: v })} options={MINES} placeholder="Select mine" />
            </Field>
            <Field label="Issue Date"><Input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></Field>
            <Field label="Expiry Date *"><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></Field>
            <Field label="Renewal Date"><Input type="date" value={form.renewal_date} onChange={(e) => setForm({ ...form, renewal_date: e.target.value })} /></Field>
            <Field label="Status *">
              <PickSelect value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={STATUSES} />
            </Field>
            <Field label="Document Upload" className="sm:col-span-2">
              <div className="rounded-md border border-dashed border-border p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    type="file"
                    onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)}
                    className="max-w-md"
                  />
                  <div className="text-xs text-muted-foreground">
                    {documentFile ? (
                      <span className="inline-flex items-center gap-1.5"><Upload className="size-3.5" />{documentFile.name}</span>
                    ) : getLicenseDocument(editing?.documents) ? (
                      <span className="inline-flex items-center gap-1.5"><FileText className="size-3.5" />Current: {getLicenseDocument(editing?.documents)?.name}</span>
                    ) : (
                      "Attach a license/permit document (optional)"
                    )}
                  </div>
                  {!documentFile && getLicenseDocumentViewUrl(editing?.documents) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(getLicenseDocumentViewUrl(editing?.documents)!, "_blank", "noopener,noreferrer")}
                    >
                      <Eye className="size-4" /> View
                    </Button>
                  )}
                </div>
              </div>
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes…" />
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this license?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.license_name}" will be permanently removed. This action cannot be undone.
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

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "emerald" | "amber" | "destructive" }) {
  const toneCls =
    tone === "emerald" ? "text-emerald-600 dark:text-emerald-400"
    : tone === "amber" ? "text-amber-600 dark:text-amber-400"
    : tone === "destructive" ? "text-destructive"
    : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${toneCls}`}>{value}</div>
    </div>
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
