export const authorities = ["IBM", "DGMS", "MoEFCC", "SPCB", "Forest", "PESO", "Revenue", "Labour", "State Mining"] as const;

export const healthScore = {
  overall: 82,
  trend: +3,
  breakdown: [
    { label: "Compliance", value: 88 },
    { label: "Inspections", value: 76 },
    { label: "Documents", value: 84 },
    { label: "Notices", value: 72 },
  ],
};

export const execCards = [
  { label: "Open Compliances", value: 47, delta: "-6 this week", tone: "info" as const },
  { label: "Overdue Items", value: 8, delta: "+2 vs last week", tone: "destructive" as const },
  { label: "Notices Pending Reply", value: 5, delta: "2 due in 7 days", tone: "warning" as const },
  { label: "Licenses Expiring (90d)", value: 11, delta: "3 critical", tone: "warning" as const },
  { label: "Inspections This Month", value: 14, delta: "9 closed", tone: "success" as const },
  { label: "Active Mines", value: 12, delta: "across 4 states", tone: "info" as const },
];

export const calendarEvents = [
  { date: "2026-06-28", title: "IBM Monthly Return (F1)", authority: "IBM", priority: "High" },
  { date: "2026-06-29", title: "DGMS Form-IV Submission", authority: "DGMS", priority: "Critical" },
  { date: "2026-07-01", title: "SPCB Water Cess Payment", authority: "SPCB", priority: "Medium" },
  { date: "2026-07-03", title: "EC Half-Yearly Report", authority: "MoEFCC", priority: "High" },
  { date: "2026-07-05", title: "Royalty Statement (Revenue)", authority: "Revenue", priority: "Medium" },
  { date: "2026-07-08", title: "Forest Diversion Compliance", authority: "Forest", priority: "High" },
  { date: "2026-07-10", title: "PESO Magazine License Renewal", authority: "PESO", priority: "Critical" },
  { date: "2026-07-15", title: "Labour Welfare Cess", authority: "Labour", priority: "Low" },
];

export const authorityBreakdown = [
  { authority: "IBM", total: 28, open: 9, overdue: 2 },
  { authority: "DGMS", total: 22, open: 7, overdue: 1 },
  { authority: "MoEFCC", total: 14, open: 5, overdue: 1 },
  { authority: "SPCB", total: 18, open: 6, overdue: 2 },
  { authority: "Forest", total: 9, open: 3, overdue: 0 },
  { authority: "PESO", total: 7, open: 2, overdue: 1 },
  { authority: "Revenue", total: 11, open: 4, overdue: 0 },
  { authority: "Labour", total: 8, open: 3, overdue: 1 },
];

export const licenses = [
  { name: "Mining Lease — Block A-12", authority: "State Mining", expiresOn: "2026-08-14", daysLeft: 48, status: "Renewal Due" },
  { name: "Environmental Clearance", authority: "MoEFCC", expiresOn: "2026-09-30", daysLeft: 95, status: "Active" },
  { name: "Consent to Operate (Air)", authority: "SPCB", expiresOn: "2026-07-22", daysLeft: 25, status: "Critical" },
  { name: "Consent to Operate (Water)", authority: "SPCB", expiresOn: "2026-07-22", daysLeft: 25, status: "Critical" },
  { name: "Explosives License (LE-3)", authority: "PESO", expiresOn: "2026-12-01", daysLeft: 157, status: "Active" },
  { name: "Forest Diversion Approval", authority: "Forest", expiresOn: "2027-02-18", daysLeft: 236, status: "Active" },
];

export const inspections = [
  { id: "INS-2041", date: "2026-06-22", authority: "DGMS", officer: "Sh. R. Khanna", mine: "Bellary Iron Ore", severity: "Medium", status: "Open", obs: 4 },
  { id: "INS-2040", date: "2026-06-19", authority: "IBM", officer: "Sh. P. Iyer", mine: "Goa Manganese", severity: "Low", status: "Closed", obs: 2 },
  { id: "INS-2039", date: "2026-06-15", authority: "SPCB", officer: "Smt. A. Desai", mine: "Hospet Pit-3", severity: "High", status: "In Progress", obs: 6 },
  { id: "INS-2038", date: "2026-06-11", authority: "MoEFCC", officer: "Sh. V. Rao", mine: "Bellary Iron Ore", severity: "Critical", status: "Open", obs: 9 },
  { id: "INS-2037", date: "2026-06-05", authority: "Forest", officer: "Sh. M. Singh", mine: "Joda East", severity: "Low", status: "Closed", obs: 1 },
];

export const riskRadar = [
  { mine: "Bellary Iron Ore", state: "Karnataka", score: 78, level: "High", drivers: ["2 open critical notices", "EC report overdue"] },
  { mine: "Hospet Pit-3", state: "Karnataka", score: 64, level: "Medium", drivers: ["SPCB consent expiring", "1 inspection open"] },
  { mine: "Goa Manganese", state: "Goa", score: 42, level: "Low", drivers: ["All compliances current"] },
  { mine: "Joda East", state: "Odisha", score: 71, level: "High", drivers: ["Forest compliance pending", "Royalty arrears"] },
  { mine: "Barbil Block-C", state: "Odisha", score: 55, level: "Medium", drivers: ["Lease renewal due in 60d"] },
  { mine: "Singareni Shaft-9", state: "Telangana", score: 38, level: "Low", drivers: ["Recent audit cleared"] },
];

export const trend = [
  { month: "Jan", compliances: 38, notices: 4, inspections: 9 },
  { month: "Feb", compliances: 42, notices: 6, inspections: 11 },
  { month: "Mar", compliances: 51, notices: 3, inspections: 8 },
  { month: "Apr", compliances: 44, notices: 5, inspections: 12 },
  { month: "May", compliances: 49, notices: 7, inspections: 10 },
  { month: "Jun", compliances: 53, notices: 5, inspections: 14 },
];
