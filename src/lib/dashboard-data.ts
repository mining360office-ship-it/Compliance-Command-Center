import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { differenceInCalendarDays, format, parseISO, startOfMonth, subMonths } from "date-fns";

export type Compliance = {
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

const COMPLETED = new Set(["Completed", "Approved", "Submitted"]);
const OPEN = new Set(["Upcoming", "In Progress", "Escalated"]);

export type DashboardData = ReturnType<typeof derive>;

function derive(rows: Compliance[]) {
  const today = new Date();
  const total = rows.length || 1;

  const isOverdue = (c: Compliance) =>
    c.status === "Overdue" ||
    (!COMPLETED.has(c.status) &&
      c.due_date != null &&
      differenceInCalendarDays(parseISO(c.due_date), today) < 0);

  const completed = rows.filter((c) => COMPLETED.has(c.status));
  const overdue = rows.filter(isOverdue);
  const critical = rows.filter((c) => c.priority === "Critical" && !COMPLETED.has(c.status));
  const upcoming = rows
    .filter(
      (c) =>
        !COMPLETED.has(c.status) &&
        c.due_date != null &&
        differenceInCalendarDays(parseISO(c.due_date), today) >= 0,
    )
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1));

  // Health score
  const completionPct = Math.round((completed.length / total) * 100);
  const onTimePct =
    completed.length === 0
      ? 100
      : Math.round(
          (completed.filter(
            (c) =>
              !c.due_date ||
              !c.completion_date ||
              c.completion_date <= c.due_date,
          ).length /
            completed.length) *
            100,
        );
  const overduePenalty = Math.round((overdue.length / total) * 100);
  const criticalPenalty = Math.round((critical.length / total) * 100);
  const overall = Math.max(
    0,
    Math.min(
      100,
      Math.round(0.4 * completionPct + 0.4 * onTimePct + 0.2 * (100 - overduePenalty)),
    ),
  );

  const healthScore = {
    overall,
    trend: 0,
    breakdown: [
      { label: "Compliance", value: completionPct },
      { label: "On-Time", value: onTimePct },
      { label: "Critical Open", value: Math.max(0, 100 - criticalPenalty * 5) },
      { label: "Overdue", value: Math.max(0, 100 - overduePenalty * 4) },
    ],
  };

  // Exec cards
  const execCards = [
    {
      label: "Open Compliances",
      value: rows.filter((c) => !COMPLETED.has(c.status) && !isOverdue(c)).length,
      delta: `${upcoming.length} upcoming`,
      tone: "info" as const,
    },
    {
      label: "Overdue Items",
      value: overdue.length,
      delta: overdue.length ? "needs action" : "all clear",
      tone: (overdue.length ? "destructive" : "success") as "destructive" | "success",
    },
    {
      label: "Completed",
      value: completed.length,
      delta: `${completionPct}% of total`,
      tone: "success" as const,
    },
    {
      label: "Critical Open",
      value: critical.length,
      delta: critical.length ? "high priority" : "none open",
      tone: (critical.length ? "warning" : "success") as "warning" | "success",
    },
    {
      label: "Due Next 7 Days",
      value: upcoming.filter(
        (c) => differenceInCalendarDays(parseISO(c.due_date!), today) <= 7,
      ).length,
      delta: "this week",
      tone: "warning" as const,
    },
    {
      label: "Active Mines",
      value: new Set(rows.map((c) => c.mine).filter(Boolean)).size,
      delta: "with compliances",
      tone: "info" as const,
    },
  ];

  // Calendar - next 30 days upcoming
  const calendarEvents = upcoming
    .filter((c) => differenceInCalendarDays(parseISO(c.due_date!), today) <= 60)
    .slice(0, 8)
    .map((c) => ({
      date: c.due_date!,
      title: c.title,
      authority: c.authority,
      priority: c.priority,
    }));

  // Authority breakdown
  const authMap = new Map<string, { total: number; open: number; overdue: number }>();
  for (const c of rows) {
    const a = c.authority || "Other";
    const cur = authMap.get(a) ?? { total: 0, open: 0, overdue: 0 };
    cur.total++;
    if (!COMPLETED.has(c.status)) cur.open++;
    if (isOverdue(c)) cur.overdue++;
    authMap.set(a, cur);
  }
  const authorityBreakdown = Array.from(authMap.entries())
    .map(([authority, v]) => ({ authority, ...v }))
    .sort((a, b) => b.total - a.total);

  // Monthly trend - last 6 months by created_at
  const trend: { month: string; compliances: number; completed: number; overdue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const m = startOfMonth(subMonths(today, i));
    const next = startOfMonth(subMonths(today, i - 1));
    const inMonth = rows.filter((c) => {
      const d = parseISO(c.created_at);
      return d >= m && d < next;
    });
    trend.push({
      month: format(m, "MMM"),
      compliances: inMonth.length,
      completed: inMonth.filter((c) => COMPLETED.has(c.status)).length,
      overdue: inMonth.filter(isOverdue).length,
    });
  }

  // Licenses - derive from category/type containing License/Permit/Lease/Consent
  const isLicense = (c: Compliance) => {
    const s = `${c.category ?? ""} ${c.type ?? ""} ${c.title}`.toLowerCase();
    return /licen|permit|lease|consent|approval|clearance/.test(s);
  };
  const licenseRows = rows.filter((c) => isLicense(c) && c.due_date);
  const licenses = licenseRows
    .map((c) => ({
      name: c.title,
      authority: c.authority,
      expiresOn: c.due_date!,
      daysLeft: differenceInCalendarDays(parseISO(c.due_date!), today),
      status: c.status,
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 6);

  // License status breakdown for chart
  const licenseStatusMap = new Map<string, number>();
  for (const l of licenseRows) {
    const daysLeft = differenceInCalendarDays(parseISO(l.due_date!), today);
    let status = "Active";
    if (daysLeft < 0) status = "Expired";
    else if (daysLeft <= 30) status = "Expiring Soon";
    else if (daysLeft <= 90) status = "Expiring";
    licenseStatusMap.set(status, (licenseStatusMap.get(status) || 0) + 1);
  }
  const licenseStatusBreakdown = Array.from(licenseStatusMap.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  // Inspections - derive
  const isInspection = (c: Compliance) => {
    const s = `${c.category ?? ""} ${c.type ?? ""} ${c.title}`.toLowerCase();
    return /inspect|audit|visit/.test(s);
  };
  const inspections = rows
    .filter(isInspection)
    .sort((a, b) => (a.due_date && b.due_date ? (a.due_date < b.due_date ? 1 : -1) : 0))
    .slice(0, 5)
    .map((c, idx) => ({
      id: `INS-${String(2000 + idx + 1).padStart(4, "0")}`,
      date: c.due_date ?? c.created_at,
      authority: c.authority,
      mine: c.mine ?? "—",
      severity: c.priority,
      status: COMPLETED.has(c.status) ? "Closed" : c.status === "In Progress" ? "In Progress" : "Open",
      obs: 0,
    }));

  // Mine risk radar - score from overdue + critical ratio
  const mineMap = new Map<string, Compliance[]>();
  for (const c of rows) {
    if (!c.mine) continue;
    const arr = mineMap.get(c.mine) ?? [];
    arr.push(c);
    mineMap.set(c.mine, arr);
  }
  const riskRadar = Array.from(mineMap.entries())
    .map(([mine, list]) => {
      const od = list.filter(isOverdue).length;
      const cr = list.filter((c) => c.priority === "Critical" && !COMPLETED.has(c.status)).length;
      const op = list.filter((c) => !COMPLETED.has(c.status)).length;
      const score = Math.min(
        100,
        Math.round((od / list.length) * 60 + (cr / list.length) * 30 + (op / list.length) * 10),
      );
      const level = score >= 65 ? "High" : score >= 40 ? "Medium" : "Low";
      const drivers: string[] = [];
      if (od) drivers.push(`${od} overdue`);
      if (cr) drivers.push(`${cr} critical open`);
      if (!drivers.length) drivers.push("All compliances current");
      return { mine, state: "", score, level, drivers };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return {
    healthScore,
    execCards,
    calendarEvents,
    authorityBreakdown,
    trend,
    licenses,
    licenseStatusBreakdown,
    inspections,
    riskRadar,
    highRiskCount: riskRadar.filter((r) => r.level === "High").length,
    mineCount: mineMap.size,
    stateCount: 0,
    totalCount: rows.length,
  };
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // Fetch compliances
      const { data: rows, error } = await supabase
        .from("compliances")
        .select(
          "id,title,authority,category,type,mine,due_date,completion_date,priority,status,created_at",
        )
        .limit(1000);
      
      if (cancelled) return;
      if (error) {
        console.error(error);
        setData(derive([]));
      } else {
        const derivedData = derive((rows ?? []) as Compliance[]);
        
        // Fetch actual licenses from licenses table
        const { data: licenseData, error: licenseError } = await supabase
          .from("licenses")
          .select("*")
          .order("expiry_date", { ascending: true })
          .limit(10);
        
        if (!licenseError && licenseData) {
          const today = new Date();
          const actualLicenses = licenseData
            .filter((l: any) => l.expiry_date)
            .map((l: any) => ({
              name: l.license_name,
              authority: l.authority || "Unknown",
              expiresOn: l.expiry_date,
              daysLeft: differenceInCalendarDays(parseISO(l.expiry_date), today),
              status: l.status,
            }))
            .sort((a: any, b: any) => a.daysLeft - b.daysLeft);
          
          derivedData.licenses = actualLicenses;
        }
        
        // Fetch actual inspections from inspections table
        const { data: inspectionData, error: inspectionError } = await supabase
          .from("inspections")
          .select("*")
          .order("inspection_date", { ascending: false })
          .limit(10);
        
        if (!inspectionError && inspectionData) {
          const actualInspections = inspectionData
            .map((insp: any, idx: number) => ({
              id: insp.id || `INS-${String(2000 + idx + 1).padStart(4, "0")}`,
              date: insp.inspection_date || insp.created_at,
              authority: insp.authority || "Unknown",
              mine: insp.mine || "—",
              severity: insp.severity || "Medium",
              status: insp.status || "Open",
              obs: insp.observations_count || 0,
            }))
            .slice(0, 5);
          
          derivedData.inspections = actualInspections;
        }
        
        setData(derivedData);
      }
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("dashboard-compliances")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "compliances" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "licenses" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inspections" },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { data, loading };
}
