import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Topbar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText, BarChart3, Calendar, Filter, Loader2, TrendingUp, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, differenceInCalendarDays, startOfMonth, endOfMonth, subMonths } from "date-fns";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "MineCompli — Mining Compliance Management System" }] }),
  component: ReportsAnalytics,
});

type Compliance = {
  id: string;
  title: string;
  authority: string;
  category: string | null;
  type: string | null;
  mine: string | null;
  due_date: string | null;
  completion_date: string | null;
  priority: string;
  status: string;
  created_at: string;
};

type License = {
  id: string;
  license_name: string;
  authority: string | null;
  mine: string | null;
  expiry_date: string | null;
  status: string;
};

type Document = {
  id: string;
  title: string;
  folder: string | null;
  upload_date: string | null;
  status: string;
};

function ReportsAnalytics() {
  const [compliances, setCompliances] = useState<Compliance[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");
  const [selectedAuthority, setSelectedAuthority] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [compData, licData, docData] = await Promise.all([
        supabase.from("compliances").select("*").limit(1000),
        supabase.from("licenses").select("*").limit(500),
        supabase.from("documents").select("*").limit(500),
      ]);

      if (compData.error) throw compData.error;
      if (licData.error) throw licData.error;
      if (docData.error) throw docData.error;

      setCompliances(compData.data || []);
      setLicenses(licData.data || []);
      setDocuments(docData.data || []);
    } catch (error) {
      toast.error("Failed to load report data");
      console.error(error);
    }
    setLoading(false);
  };

  const filteredCompliances = compliances.filter(c => 
    selectedAuthority === "all" || c.authority === selectedAuthority
  );

  const authorities = Array.from(new Set(compliances.map(c => c.authority)));

  const complianceStats = {
    total: filteredCompliances.length,
    completed: filteredCompliances.filter(c => ["Completed", "Approved", "Submitted"].includes(c.status)).length,
    overdue: filteredCompliances.filter(c => {
      if (c.status === "Overdue") return true;
      if (!c.due_date) return false;
      return differenceInCalendarDays(parseISO(c.due_date), new Date()) < 0 && 
             !["Completed", "Approved", "Submitted"].includes(c.status);
    }).length,
    critical: filteredCompliances.filter(c => c.priority === "Critical" && !["Completed", "Approved", "Submitted"].includes(c.status)).length,
  };

  const licenseStats = {
    total: licenses.length,
    expiringSoon: licenses.filter(l => {
      if (!l.expiry_date) return false;
      const days = differenceInCalendarDays(parseISO(l.expiry_date), new Date());
      return days >= 0 && days <= 90;
    }).length,
    expired: licenses.filter(l => {
      if (!l.expiry_date) return false;
      return differenceInCalendarDays(parseISO(l.expiry_date), new Date()) < 0;
    }).length,
  };

  const documentStats = {
    total: documents.length,
    byFolder: documents.reduce((acc, doc) => {
      const folder = doc.folder || "Uncategorized";
      acc[folder] = (acc[folder] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  const authorityBreakdown = authorities.map(auth => ({
    authority: auth,
    total: filteredCompliances.filter(c => c.authority === auth).length,
    completed: filteredCompliances.filter(c => c.authority === auth && ["Completed", "Approved", "Submitted"].includes(c.status)).length,
    overdue: filteredCompliances.filter(c => {
      if (c.authority !== auth) return false;
      if (c.status === "Overdue") return true;
      if (!c.due_date) return false;
      return differenceInCalendarDays(parseISO(c.due_date), new Date()) < 0 && 
             !["Completed", "Approved", "Submitted"].includes(c.status);
    }).length,
  })).sort((a, b) => b.total - a.total);

  const exportReport = (reportType: string) => {
    toast.success(`Exporting ${reportType} report...`);
    // In real implementation, this would generate PDF/Excel/CSV
  };

  return (
    <>
      <Topbar title="Reports & Analytics" subtitle="Cross-module regulatory intelligence and reporting" />
      <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <div className="w-full sm:w-auto"><Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select></div>
              <div className="w-full sm:w-auto"><Select value={selectedAuthority} onValueChange={setSelectedAuthority}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="All Authorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Authorities</SelectItem>
                  {authorities.map(auth => (
                    <SelectItem key={auth} value={auth}>{auth}</SelectItem>
                  ))}
                </SelectContent>
              </Select></div>
            </div>
            <div className="flex w-full flex-col gap-2 min-[380px]:flex-row sm:w-auto">
              <Button variant="outline" onClick={() => exportReport("PDF")} className="gap-2">
                <Download className="size-4" />
                Export PDF
              </Button>
              <Button variant="outline" onClick={() => exportReport("Excel")} className="gap-2">
                <Download className="size-4" />
                Export Excel
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="flex w-full justify-start overflow-x-auto lg:grid lg:w-auto lg:grid-cols-4 lg:overflow-visible">
                <TabsTrigger value="overview" className="shrink-0">Overview</TabsTrigger>
                <TabsTrigger value="compliance" className="shrink-0">Compliance</TabsTrigger>
                <TabsTrigger value="licenses" className="shrink-0">Licenses</TabsTrigger>
                <TabsTrigger value="documents" className="shrink-0">Documents</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Compliances</p>
                        <p className="text-2xl font-bold mt-1">{complianceStats.total}</p>
                      </div>
                      <FileText className="size-8 text-muted-foreground/20" />
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <CheckCircle className="size-4 text-emerald-500" />
                      <span className="text-muted-foreground">{complianceStats.completed} completed</span>
                    </div>
                  </Card>
                  <Card className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Overdue Items</p>
                        <p className="text-2xl font-bold mt-1 text-destructive">{complianceStats.overdue}</p>
                      </div>
                      <AlertTriangle className="size-8 text-destructive/20" />
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <Clock className="size-4 text-warning" />
                      <span className="text-muted-foreground">Needs attention</span>
                    </div>
                  </Card>
                  <Card className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Active Licenses</p>
                        <p className="text-2xl font-bold mt-1">{licenseStats.total}</p>
                      </div>
                      <BarChart3 className="size-8 text-muted-foreground/20" />
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <TrendingUp className="size-4 text-emerald-500" />
                      <span className="text-muted-foreground">{licenseStats.expiringSoon} expiring soon</span>
                    </div>
                  </Card>
                  <Card className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Documents</p>
                        <p className="text-2xl font-bold mt-1">{documentStats.total}</p>
                      </div>
                      <FileText className="size-8 text-muted-foreground/20" />
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <Calendar className="size-4 text-info" />
                      <span className="text-muted-foreground">{Object.keys(documentStats.byFolder).length} folders</span>
                    </div>
                  </Card>
                </div>

                <Card className="p-4 sm:p-6">
                  <h3 className="text-lg font-semibold mb-4">Authority Performance Summary</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Authority</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Overdue</TableHead>
                        <TableHead>Completion Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {authorityBreakdown.map((auth) => {
                        const rate = auth.total > 0 ? Math.round((auth.completed / auth.total) * 100) : 0;
                        return (
                          <TableRow key={auth.authority}>
                            <TableCell className="font-medium">{auth.authority}</TableCell>
                            <TableCell>{auth.total}</TableCell>
                            <TableCell className="text-emerald-600">{auth.completed}</TableCell>
                            <TableCell className={auth.overdue > 0 ? "text-destructive" : ""}>{auth.overdue}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-24">
                                  <div 
                                    className="h-full bg-emerald-500" 
                                    style={{ width: `${rate}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium">{rate}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              <TabsContent value="compliance" className="space-y-6">
                <Card className="p-4 sm:p-6">
                  <h3 className="text-lg font-semibold mb-4">Compliance Details</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Authority</TableHead>
                        <TableHead>Mine</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCompliances.slice(0, 20).map((c) => (
                        <Link key={c.id} to="/compliance" className="block">
                          <TableRow className="hover:bg-muted/40 cursor-pointer">
                            <TableCell className="font-medium">{c.title}</TableCell>
                            <TableCell>{c.authority}</TableCell>
                            <TableCell>{c.mine || "—"}</TableCell>
                            <TableCell>{c.due_date ? format(parseISO(c.due_date), "dd MMM yyyy") : "—"}</TableCell>
                            <TableCell>
                              <Badge variant={c.priority === "Critical" ? "destructive" : "outline"}>
                                {c.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                c.status === "Completed" || c.status === "Approved" 
                                  ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                                  : c.status === "Overdue"
                                  ? "bg-destructive/15 text-destructive border-destructive/30"
                                  : "bg-muted"
                              }>
                                {c.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        </Link>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              <TabsContent value="licenses" className="space-y-6">
                <Card className="p-4 sm:p-6">
                  <h3 className="text-lg font-semibold mb-4">License Status Report</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>License Name</TableHead>
                        <TableHead>Authority</TableHead>
                        <TableHead>Mine</TableHead>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {licenses.map((l) => {
                        const daysLeft = l.expiry_date ? differenceInCalendarDays(parseISO(l.expiry_date), new Date()) : null;
                        return (
                          <Link key={l.id} to="/licenses" className="block">
                            <TableRow className="hover:bg-muted/40 cursor-pointer">
                              <TableCell className="font-medium">{l.license_name}</TableCell>
                              <TableCell>{l.authority || "—"}</TableCell>
                              <TableCell>{l.mine || "—"}</TableCell>
                              <TableCell>
                                {l.expiry_date ? format(parseISO(l.expiry_date), "dd MMM yyyy") : "—"}
                                {daysLeft !== null && (
                                  <span className={`ml-2 text-xs ${daysLeft < 0 ? "text-destructive" : daysLeft <= 90 ? "text-warning" : "text-emerald-600"}`}>
                                    ({daysLeft}d)
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge className={
                                  l.status === "Active" 
                                    ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                                    : l.status === "Expired"
                                    ? "bg-destructive/15 text-destructive border-destructive/30"
                                    : "bg-muted"
                                }>
                                  {l.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          </Link>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="space-y-6">
                <Card className="p-4 sm:p-6">
                  <h3 className="text-lg font-semibold mb-4">Document Repository Summary</h3>
                  <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Object.entries(documentStats.byFolder).map(([folder, count]) => (
                      <Card key={folder} className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-primary/10 grid place-items-center">
                            <FileText className="size-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{folder}</p>
                            <p className="text-sm text-muted-foreground">{count} documents</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </Card>

                <Card className="p-4 sm:p-6">
                  <h3 className="text-lg font-semibold mb-4">Recent Documents</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Folder</TableHead>
                        <TableHead>Upload Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.slice(0, 15).map((d) => (
                        <Link key={d.id} to="/vault" className="block">
                          <TableRow className="hover:bg-muted/40 cursor-pointer">
                            <TableCell className="font-medium">{d.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{d.folder || "Uncategorized"}</Badge>
                            </TableCell>
                            <TableCell>{d.upload_date ? format(parseISO(d.upload_date), "dd MMM yyyy") : "—"}</TableCell>
                            <TableCell>
                              <Badge className={
                                d.status === "Active" 
                                  ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                                  : "bg-muted"
                              }>
                                {d.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        </Link>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </>
  );
}
