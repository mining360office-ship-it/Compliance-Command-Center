import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/topbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MasterTable } from "@/components/master-table";
import { MASTER_TABLES } from "@/lib/masters";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "MineCompli — Mining Compliance Management System" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <>
      <Topbar title="Settings" subtitle="Manage master data used across modules" />
      <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6">
        <Tabs defaultValue={MASTER_TABLES[0].key} className="space-y-4">
          <TabsList className="flex max-w-full flex-wrap h-auto">
            {MASTER_TABLES.map((m) => (
              <TabsTrigger key={m.key} value={m.key}>{m.label}</TabsTrigger>
            ))}
          </TabsList>
          {MASTER_TABLES.map((m) => (
            <TabsContent key={m.key} value={m.key} className="mt-4">
              <MasterTable table={m.key} label={m.label} />
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </>
  );
}
