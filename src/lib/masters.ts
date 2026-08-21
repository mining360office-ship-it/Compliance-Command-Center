import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const MASTER_TABLES = [
  { key: "authorities", label: "Authority" },
  { key: "categories", label: "Category" },
  { key: "types", label: "Type" },
  { key: "mines", label: "Mine" },
  { key: "leases", label: "Lease" },
  { key: "departments", label: "Department" },
  { key: "responsible_persons", label: "Responsible Person" },
  { key: "priorities", label: "Priority" },
  { key: "statuses", label: "Status" },
  { key: "recurring_rules", label: "Recurring Rule" },
] as const;

export type MasterKey = (typeof MASTER_TABLES)[number]["key"];

export type MasterRow = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export function useMasterNames(table: MasterKey, fallback: string[] = []) {
  const [names, setNames] = useState<string[]>(fallback);

  const load = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from(table)
      .select("name, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (!error && data) {
      const list = (data as { name: string }[]).map((r) => r.name);
      setNames(list.length ? list : fallback);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  useEffect(() => {
    load();
  }, [load]);

  return { names, reload: load };
}
