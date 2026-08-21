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
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Shield, Users2, Settings, Activity, Database, Lock, Key, Trash2, Pencil, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Administration — Mining Compliance Command Center" }] }),
  component: Administration,
});

const ROLES = ["Super Admin", "Director", "Mine Owner", "Mine Manager", "Compliance Officer", "Geologist", "Surveyor", "Consultant", "Viewer"];
const PERMISSIONS = ["compliance:read", "compliance:write", "compliance:delete", "licenses:read", "licenses:write", "documents:read", "documents:write", "reports:read", "admin:manage", "settings:manage"];

type User = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  status: string;
  last_login: string | null;
  created_at: string;
};

type AuditLog = {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: any;
  created_at: string;
};

type SystemSetting = {
  id: string;
  key: string;
  value: string;
  description: string | null;
  category: string;
};

const emptyUserForm = {
  email: "",
  full_name: "",
  role: "Compliance Officer",
  status: "Active",
};
type UserFormState = typeof emptyUserForm;

function Administration() {
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyUserForm);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [search, setSearch] = useState("");

  const filteredUsers = users.filter(u => 
    !search || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load users");
    } else {
      setUsers(data || []);
    }
  };

  const fetchAuditLogs = async () => {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      toast.error("Failed to load audit logs");
    } else {
      setAuditLogs(data || []);
    }
  };

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("system_settings")
      .select("*");
    if (error) {
      toast.error("Failed to load settings");
    } else {
      setSettings(data || []);
    }
  };

  useEffect(() => {
    Promise.all([fetchUsers(), fetchAuditLogs(), fetchSettings()]).finally(() => {
      setLoading(false);
    });
  }, []);

  const handleSaveUser = async () => {
    if (!form.email || !form.full_name) {
      toast.error("Email and name are required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("users")
          .update({
            email: form.email,
            full_name: form.full_name,
            role: form.role,
            status: form.status,
          })
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("User updated successfully");
      } else {
        const { error } = await supabase.from("users").insert([{
          email: form.email,
          full_name: form.full_name,
          role: form.role,
          status: form.status,
        }]);
        if (error) throw error;
        toast.success("User created successfully");
      }
      setDialogOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to save user");
    }
    setSaving(false);
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from("users").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success("User deleted successfully");
      setDeleteTarget(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    }
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setForm({
      email: user.email,
      full_name: user.full_name || "",
      role: user.role,
      status: user.status,
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyUserForm);
    setDialogOpen(true);
  };

  const handleSettingChange = async (settingId: string, value: string) => {
    try {
      const { error } = await supabase
        .from("system_settings")
        .update({ value })
        .eq("id", settingId);
      if (error) throw error;
      toast.success("Setting updated");
      fetchSettings();
    } catch (err: any) {
      toast.error(err.message || "Failed to update setting");
    }
  };

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      "Super Admin": "bg-purple-500/15 text-purple-700 border-purple-500/30",
      "Director": "bg-blue-500/15 text-blue-700 border-blue-500/30",
      "Mine Owner": "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
      "Mine Manager": "bg-cyan-500/15 text-cyan-700 border-cyan-500/30",
      "Compliance Officer": "bg-orange-500/15 text-orange-700 border-orange-500/30",
    };
    return colors[role] || "bg-muted text-muted-foreground border-border";
  };

  const statusBadge = (status: string) => {
    return status === "Active" 
      ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
      : status === "Inactive"
      ? "bg-muted text-muted-foreground border-border"
      : "bg-amber-500/15 text-amber-700 border-amber-500/30";
  };

  return (
    <>
      <Topbar title="Administration" subtitle="Users, roles, audit, and system settings" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Tabs defaultValue="users" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto">
              <TabsTrigger value="users" className="gap-2">
                <Users2 className="size-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="roles" className="gap-2">
                <Shield className="size-4" />
                Roles & Permissions
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-2">
                <Activity className="size-4" />
                Audit Logs
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="size-4" />
                System Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Button onClick={openCreate} className="gap-2">
                  <Plus className="size-4" />
                  Add User
                </Button>
              </div>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">User Management</h3>
                  <Badge variant="outline">{filteredUsers.length} users</Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Loader2 className="size-6 animate-spin mx-auto text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.full_name || "—"}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={roleBadge(user.role)}>{user.role}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusBadge(user.status)}>{user.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {user.last_login ? format(parseISO(user.last_login), "dd MMM yyyy") : "Never"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(parseISO(user.created_at), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" className="size-8" onClick={() => openEdit(user)}>
                                <Pencil className="size-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => setDeleteTarget(user)}>
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="roles" className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Role-Based Access Control (RBAC)</h3>
                <div className="space-y-4">
                  {ROLES.map((role) => (
                    <div key={role} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Shield className="size-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{role}</div>
                            <div className="text-sm text-muted-foreground">
                              {role === "Super Admin" && "Full system access including user management"}
                              {role === "Director" && "Strategic oversight and reporting access"}
                              {role === "Mine Owner" && "Mine-level operations and compliance oversight"}
                              {role === "Mine Manager" && "Day-to-day mine operations management"}
                              {role === "Compliance Officer" && "Regulatory compliance management"}
                              {role === "Geologist" && "Technical and geological data access"}
                              {role === "Surveyor" && "Survey and measurement data access"}
                              {role === "Consultant" && "Advisory and reporting access"}
                              {role === "Viewer" && "Read-only access to assigned modules"}
                            </div>
                          </div>
                        </div>
                        <Badge className={roleBadge(role)}>{role}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {PERMISSIONS.slice(0, role === "Super Admin" ? PERMISSIONS.length : role === "Director" ? 6 : role === "Mine Owner" ? 5 : role === "Mine Manager" ? 4 : role === "Compliance Officer" ? 4 : 2).map((perm) => (
                          <Badge key={perm} variant="outline" className="text-xs">
                            {perm}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="audit" className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Audit Logs</h3>
                  <Badge variant="outline">{auditLogs.length} recent entries</Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <Loader2 className="size-6 animate-spin mx-auto text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : auditLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No audit logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(parseISO(log.created_at), "dd MMM yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="text-sm">{log.user_email || "System"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.action}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.entity_type && (
                              <span className="text-muted-foreground">
                                {log.entity_type}
                                {log.entity_id && ` #${log.entity_id.slice(0, 8)}`}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                            {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">System Settings</h3>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Security</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Multi-Factor Authentication</div>
                          <div className="text-sm text-muted-foreground">Require MFA for all users</div>
                        </div>
                        <Switch defaultChecked={false} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Session Timeout</div>
                          <div className="text-sm text-muted-foreground">Auto-logout after inactivity</div>
                        </div>
                        <Select defaultValue="30">
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="120">2 hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Notifications</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Email Notifications</div>
                          <div className="text-sm text-muted-foreground">Send email alerts for critical events</div>
                        </div>
                        <Switch defaultChecked={true} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Compliance Reminders</div>
                          <div className="text-sm text-muted-foreground">Automatic reminders before due dates</div>
                        </div>
                        <Switch defaultChecked={true} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Data Management</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Data Retention</div>
                          <div className="text-sm text-muted-foreground">Keep audit logs for</div>
                        </div>
                        <Select defaultValue="365">
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="90">90 days</SelectItem>
                            <SelectItem value="180">6 months</SelectItem>
                            <SelectItem value="365">1 year</SelectItem>
                            <SelectItem value="730">2 years</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Auto Backup</div>
                          <div className="text-sm text-muted-foreground">Automatic daily backups</div>
                        </div>
                        <Switch defaultChecked={true} />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit User" : "Add New User"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update user details and permissions." : "Add a new user to the system."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveUser} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              {editing ? "Update" : "Create"} User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.full_name || deleteTarget?.email}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
