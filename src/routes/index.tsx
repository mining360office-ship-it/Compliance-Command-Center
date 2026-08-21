import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/topbar";
import { useDashboardData, type DashboardData } from "@/lib/dashboard-data";
import { Link } from "@tanstack/react-router";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown,
  ShieldAlert, ArrowUpRight, Dot, Loader2,
} from "lucide-react";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Mining Compliance Command Center" },
      { name: "description", content: "Compliance health, risk radar, and regulatory operations overview." },
    ],
  }),
  component: Dashboard,
});

const toneClass = {
  info: "text-info bg-info/10 ring-info/20",
  success: "text-success bg-success/10 ring-success/20",
  warning: "text-warning bg-warning/15 ring-warning/30",
  destructive: "text-destructive bg-destructive/10 ring-destructive/20",
} as const;

const priorityDot = {
  Critical: "bg-destructive",
  High: "bg-warning",
  Medium: "bg-info",
  Low: "bg-muted-foreground/40",
} as const;

const riskTone = {
  High: "text-destructive bg-destructive/10 ring-destructive/20",
  Medium: "text-warning bg-warning/15 ring-warning/30",
  Low: "text-success bg-success/10 ring-success/20",
} as const;

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-border bg-card ${className}`}>{children}</div>;
}

function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between px-5 py-4 border-b border-border">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return <li className="px-5 py-6 text-xs text-muted-foreground text-center">{label}</li>;
}

function HealthGauge({ data }: { data: DashboardData }) {
  const score = data.healthScore.overall;
  const radius = 64;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "var(--color-success)" : score >= 60 ? "var(--color-warning)" : "var(--color-destructive)";
  return (
    <Card className="p-5 flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Compliance Health Score</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Composite across all mines</p>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
          live
        </span>
      </div>
      <div className="flex items-center gap-6 mt-4">
        <div className="relative size-40 shrink-0">
          <svg viewBox="0 0 160 160" className="size-40 -rotate-90">
            <circle cx="80" cy="80" r={radius} stroke="var(--color-muted)" strokeWidth="12" fill="none" />
            <circle cx="80" cy="80" r={radius} stroke={color} strokeWidth="12" fill="none"
              strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold tracking-tight">{score}</div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider">of 100</div>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          {data.healthScore.breakdown.map((b) => (
            <div key={b.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{b.label}</span>
                <span className="font-medium tabular-nums">{b.value}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${b.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function ExecCards({ data }: { data: DashboardData }) {
  const getCardRoute = (label: string) => {
    if (label.includes("Compliances")) return "/compliance?status=Open";
    if (label.includes("Overdue")) return "/compliance?status=Overdue";
    if (label.includes("Inspection")) return "/inspections";
    if (label.includes("License")) return "/licenses";
    if (label.includes("Mine")) return "/compliance";
    return "/compliance";
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {data.execCards.map((c) => (
        <Link key={c.label} to={getCardRoute(c.label)} className="cursor-pointer">
          <Card className="p-4 hover:bg-muted/40 transition">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-medium">{c.label}</div>
                <div className="text-2xl font-semibold tracking-tight mt-1 tabular-nums">{c.value}</div>
              </div>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ring-1 ${toneClass[c.tone]}`}>
                {c.tone === "destructive" ? "ALERT" : c.tone === "warning" ? "WATCH" : c.tone === "success" ? "OK" : "INFO"}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
              {c.tone === "destructive" ? <TrendingUp className="size-3 text-destructive" /> : <TrendingDown className="size-3" />}
              {c.delta}
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function ComplianceCalendar({ data }: { data: DashboardData }) {
  return (
    <Card>
      <CardHeader title="Compliance Calendar" subtitle="Next 60 days" action={
        <Link to="/calendar" className="text-xs text-primary font-medium inline-flex items-center gap-1">View full <ArrowUpRight className="size-3" /></Link>
      } />
      <ul className="divide-y divide-border">
        {data.calendarEvents.length === 0 && <EmptyRow label="No upcoming compliances" />}
        {data.calendarEvents.map((e) => {
          const d = parseISO(e.date);
          return (
            <Link key={`${e.title}-${e.date}`} to="/calendar" className="block">
              <li className="flex items-center gap-4 px-5 py-3 hover:bg-muted/40 transition cursor-pointer">
                <div className="w-12 text-center shrink-0">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">{format(d, "MMM")}</div>
                  <div className="text-xl font-bold tabular-nums leading-none">{format(d, "dd")}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{e.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                    <span className="font-mono">{e.authority}</span>
                    <Dot className="size-3" />
                    <span>{format(d, "EEEE")}</span>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md ring-1 ${
                  e.priority === "Critical" ? toneClass.destructive :
                  e.priority === "High" ? toneClass.warning :
                  e.priority === "Medium" ? toneClass.info : "text-muted-foreground bg-muted ring-border"
                }`}>
                  <span className={`size-1.5 rounded-full ${priorityDot[e.priority as keyof typeof priorityDot] ?? "bg-muted-foreground/40"}`} />
                  {e.priority}
                </span>
              </li>
            </Link>
          );
        })}
      </ul>
    </Card>
  );
}

function AuthorityBreakdown({ data }: { data: DashboardData }) {
  return (
    <Link to="/compliance" className="block">
      <Card className="hover:bg-muted/40 transition cursor-pointer">
        <CardHeader title="Authority Breakdown" subtitle="Compliances by regulator" action={
          <div className="text-xs text-primary font-medium inline-flex items-center gap-1">Manage <ArrowUpRight className="size-3" /></div>
        } />
        <div className="p-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.authorityBreakdown} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="authority" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="open" stackId="a" fill="var(--color-chart-1)" radius={[0,0,0,0]} name="Open" />
              <Bar dataKey="overdue" stackId="a" fill="var(--color-destructive)" radius={[4,4,0,0]} name="Overdue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </Link>
  );
}

function LicenseTracker({ data }: { data: DashboardData }) {
  return (
    <Card>
      <CardHeader title="License Expiry Tracker" subtitle="Sorted by urgency" action={
        <Link to="/licenses" className="text-xs text-primary font-medium inline-flex items-center gap-1">View all <ArrowUpRight className="size-3" /></Link>
      } />
      <ul className="divide-y divide-border">
        {data.licenses.length === 0 && <EmptyRow label="No licenses tracked" />}
        {data.licenses.map((l) => {
          const pct = Math.max(0, Math.min(100, ((365 - l.daysLeft) / 365) * 100));
          const tone = l.daysLeft <= 30 ? "destructive" : l.daysLeft <= 90 ? "warning" : "success";
          return (
            <Link key={`${l.name}-${l.expiresOn}`} to="/licenses" className="block">
              <li className="px-5 py-3 hover:bg-muted/40 transition cursor-pointer">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{l.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{l.authority} · expires {format(parseISO(l.expiresOn), "dd MMM yyyy")}</div>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-1 rounded ring-1 tabular-nums ${toneClass[tone]}`}>
                    {l.daysLeft}d
                  </span>
                </div>
                <div className="h-1 mt-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${tone === "destructive" ? "bg-destructive" : tone === "warning" ? "bg-warning" : "bg-success"}`} style={{ width: `${pct}%` }} />
                </div>
              </li>
            </Link>
          );
        })}
      </ul>
    </Card>
  );
}

function LicenseStatusChart({ data }: { data: DashboardData }) {
  const chartData = data.licenseStatusBreakdown.map((item) => ({
    name: item.status,
    value: item.count,
  }));

  const COLORS = {
    "Active": "var(--color-success)",
    "Expiring": "var(--color-warning)",
    "Expiring Soon": "var(--color-destructive)",
    "Expired": "var(--color-muted)",
  };

  return (
    <Link to="/licenses" className="block">
      <Card className="hover:bg-muted/40 transition cursor-pointer">
        <CardHeader title="License Status Distribution" subtitle="Overview of license health" action={
          <div className="text-xs text-primary font-medium inline-flex items-center gap-1">View details <ArrowUpRight className="size-3" /></div>
        } />
        <div className="p-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || "var(--color-chart-1)"} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                iconType="circle"
                formatter={(value, entry: any) => (
                  <span className="text-xs">
                    {value}: <span className="font-semibold">{entry.payload.value}</span>
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </Link>
  );
}

function InspectionTracker({ data }: { data: DashboardData }) {
  return (
    <Card>
      <CardHeader title="Inspection Tracker" subtitle="Recent regulatory visits" action={
        <Link to="/inspections" className="text-xs text-primary font-medium inline-flex items-center gap-1">View all <ArrowUpRight className="size-3" /></Link>
      } />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-5 py-2.5">ID / Date</th>
              <th className="text-left font-medium px-3 py-2.5">Authority</th>
              <th className="text-left font-medium px-3 py-2.5">Mine</th>
              <th className="text-left font-medium px-3 py-2.5">Severity</th>
              <th className="text-right font-medium px-5 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.inspections.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-6 text-xs text-muted-foreground text-center">No inspection records</td></tr>
            )}
            {data.inspections.map((i) => (
              <Link key={i.id} to="/inspections" className="block">
                <tr className="hover:bg-muted/40 cursor-pointer">
                  <td className="px-5 py-3">
                    <div className="font-mono text-xs">{i.id}</div>
                    <div className="text-[11px] text-muted-foreground">{format(parseISO(i.date), "dd MMM")}</div>
                  </td>
                  <td className="px-3 py-3 text-xs font-medium">{i.authority}</td>
                  <td className="px-3 py-3">
                    <div className="truncate max-w-[180px]">{i.mine}</div>
                    <div className="text-[11px] text-muted-foreground">{i.obs} observations</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ring-1 ${
                      i.severity === "Critical" ? toneClass.destructive :
                      i.severity === "High" ? toneClass.warning :
                      i.severity === "Medium" ? toneClass.info : "text-muted-foreground bg-muted ring-border"
                    }`}>{i.severity}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={`text-[11px] font-medium ${
                      i.status === "Open" ? "text-destructive" : i.status === "In Progress" ? "text-warning" : "text-success"
                    }`}>{i.status}</span>
                  </td>
                </tr>
              </Link>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function MineRiskRadar({ data }: { data: DashboardData }) {
  const radarData = data.riskRadar.map((m) => ({ subject: m.mine.split(" ")[0], risk: m.score, full: 100 }));
  return (
    <Card>
      <CardHeader title="Mine Risk Radar™" subtitle="Predictive risk scoring across portfolio" action={
        <div className="flex items-center gap-3">
          <Link to="/reports" className="text-xs text-primary font-medium inline-flex items-center gap-1">Full Report <ArrowUpRight className="size-3" /></Link>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-destructive">
            <ShieldAlert className="size-3.5" /> {data.highRiskCount} mines at High risk
          </span>
        </div>
      } />
      <div className="grid lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border">
        <div className="p-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="78%">
              <PolarGrid stroke="var(--color-border)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} />
              <Radar name="Risk" dataKey="risk" stroke="var(--color-destructive)" fill="var(--color-destructive)" fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <ul className="divide-y divide-border">
          {data.riskRadar.length === 0 && <EmptyRow label="No mine data" />}
          {data.riskRadar.map((m) => (
            <li key={m.mine} className="px-5 py-3 flex items-start gap-3">
              <div className={`mt-1 text-[11px] font-bold w-9 h-9 rounded grid place-items-center ring-1 tabular-nums ${riskTone[m.level as keyof typeof riskTone]}`}>
                {m.score}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium truncate">{m.mine}</div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                    m.level === "High" ? "text-destructive" : m.level === "Medium" ? "text-warning" : "text-success"
                  }`}>{m.level}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">{m.state}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{m.drivers.join(" · ")}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function ActivityTrend({ data }: { data: DashboardData }) {
  return (
    <Card>
      <CardHeader title="Regulatory Activity Trend" subtitle="Last 6 months" />
      <div className="p-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.trend} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
            <Line type="monotone" dataKey="compliances" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} name="Created" />
            <Line type="monotone" dataKey="completed" stroke="var(--color-chart-3)" strokeWidth={2} dot={false} name="Completed" />
            <Line type="monotone" dataKey="overdue" stroke="var(--color-destructive)" strokeWidth={2} dot={false} name="Overdue" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function Dashboard() {
  const { data, loading } = useDashboardData();

  if (loading || !data) {
    return (
      <>
        <Topbar title="Dashboard" subtitle="Loading regulatory data…" />
        <main className="flex-1 grid place-items-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar title="Dashboard" subtitle={`Real-time regulatory posture · ${data.totalCount} compliances · ${data.mineCount} mines`} />
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1"><HealthGauge data={data} /></div>
          <div className="xl:col-span-2"><ExecCards data={data} /></div>
        </div>

        <div className="grid xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <MineRiskRadar data={data} />
            <div className="grid lg:grid-cols-2 gap-6">
              <AuthorityBreakdown data={data} />
              <ActivityTrend data={data} />
            </div>
            <InspectionTracker data={data} />
          </div>
          <div className="space-y-6">
            <ComplianceCalendar data={data} />
            <LicenseTracker data={data} />
            <LicenseStatusChart data={data} />
          </div>
        </div>
      </main>
    </>
  );
}
