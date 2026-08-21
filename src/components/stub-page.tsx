import { Topbar } from "@/components/topbar";
import { Construction } from "lucide-react";

export function makeStub(title: string, subtitle: string, bullets: string[]) {
  return function StubPage() {
    return (
      <>
        <Topbar title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto rounded-lg border border-dashed border-border bg-card p-10 text-center">
            <div className="size-12 rounded-full bg-accent grid place-items-center mx-auto">
              <Construction className="size-6 text-accent-foreground" />
            </div>
            <h2 className="mt-4 text-lg font-semibold tracking-tight">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Module scaffolded — full UI coming next iteration.</p>
            <ul className="mt-6 grid sm:grid-cols-2 gap-2 text-left text-sm">
              {bullets.map((b) => (
                <li key={b} className="rounded-md border border-border bg-background px-3 py-2 text-muted-foreground">
                  <span className="text-foreground font-medium">·</span> {b}
                </li>
              ))}
            </ul>
          </div>
        </main>
      </>
    );
  };
}
