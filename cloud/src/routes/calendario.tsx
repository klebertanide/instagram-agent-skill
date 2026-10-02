import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/studio/AppShell";
import { Button } from "@/components/ui/button";
import { listDraftsFn, type DraftRow } from "@/lib/studio.functions";
import { useWorkspace } from "@/lib/workspace-context";
import { KIND_LABEL } from "@/lib/tools";
import { addDays, todaySP, weekdayOf } from "@/lib/editorial";
import { DraftEditor, type EditableDraft } from "@/components/studio/DraftEditor";
import { errMsg } from "@/components/studio/shared";

export const Route = createFileRoute("/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário — Instagram Studio" },
      { name: "description", content: "Organize as datas dos seus conteúdos por semana ou mês." },
      { property: "og:title", content: "Calendário — Instagram Studio" },
      { property: "og:description", content: "Planejamento semanal e mensal no horário de São Paulo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalendarPage,
});

const CAL_PAGE = 100;
const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function startOfWeek(iso: string) {
  return addDays(iso, -weekdayOf(iso));
}

function CalendarPage() {
  const { token, workspaceId } = useWorkspace();
  const list = useServerFn(listDraftsFn);
  const today = todaySP();
  const [mode, setMode] = useState<"week" | "month">("month");
  const [anchor, setAnchor] = useState(today);
  const [editing, setEditing] = useState<EditableDraft | null>(null);

  const { days, from, to, label } = useMemo(() => {
    if (mode === "week") {
      const s = startOfWeek(anchor);
      const ds = Array.from({ length: 7 }, (_, i) => addDays(s, i));
      return { days: ds, from: ds[0]!, to: ds[6]!, label: `Semana de ${ds[0]!.split("-").reverse().slice(0, 2).join("/")} a ${ds[6]!.split("-").reverse().slice(0, 2).join("/")}` };
    }
    const [y = 2026, m = 1] = anchor.split("-").map(Number);
    const first = `${y}-${String(m).padStart(2, "0")}-01`;
    const s = startOfWeek(first);
    const ds = Array.from({ length: 42 }, (_, i) => addDays(s, i));
    return { days: ds, from: ds[0]!, to: ds[41]!, label: `${(MONTHS[m - 1] ?? "").replace(/^./, (c) => c.toUpperCase())} de ${y}` };
  }, [mode, anchor]);

  const q = useInfiniteQuery({
    queryKey: ["drafts", workspaceId, "cal", from, to],
    enabled: !!token,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => list({ data: { token: token!, from, to, limit: CAL_PAGE, offset: pageParam } }),
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, p) => n + p.rows.length, 0);
      return loaded < last.total && last.rows.length > 0 ? loaded : undefined;
    },
  });
  const loaded = q.data?.pages.reduce((n, p) => n + p.rows.length, 0) ?? 0;
  const total = q.data?.pages.at(-1)?.total ?? 0;
  const byDate = useMemo(() => {
    const m: Record<string, DraftRow[]> = {};
    for (const p of q.data?.pages ?? []) for (const r of p.rows) if (r.scheduled_date) (m[r.scheduled_date] ??= []).push(r);
    return m;
  }, [q.data]);

  const shift = (dir: number) => {
    if (mode === "week") setAnchor(addDays(anchor, dir * 7));
    else {
      const [y = 2026, m = 1] = anchor.split("-").map(Number);
      const d = new Date(Date.UTC(y, m - 1 + dir, 1));
      setAnchor(d.toISOString().slice(0, 10));
    }
  };
  const curMonth = anchor.slice(0, 7);

  return (
    <div>
      <PageHeader title="Calendário" subtitle="Organize datas (horário de São Paulo). A publicação no Instagram é manual." />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Anterior" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" aria-label="Próximo" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" onClick={() => setAnchor(today)}>Hoje</Button>
          <span className="font-display text-xl" data-testid="cal-label">{label}</span>
        </div>
        <div className="flex rounded-lg border bg-card p-1">
          {(["week", "month"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`rounded-md px-3 py-1.5 text-sm ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {m === "week" ? "Semana" : "Mês"}
            </button>
          ))}
        </div>
      </div>
      {total > loaded && (
        <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <span data-testid="cal-partial">Mostrando {loaded} de {total} itens deste período.</span>
          <Button size="sm" variant="outline" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>
            {q.isFetchingNextPage && <Loader2 className="h-3 w-3 animate-spin" />} Carregar mais
          </Button>
        </div>
      )}
      {q.isError && <div className="mb-4 text-sm text-destructive">{errMsg(q.error)} <Button variant="link" onClick={() => q.refetch()}>Tentar de novo</Button></div>}
      <div className="overflow-x-auto">
        <div className={`grid min-w-[700px] grid-cols-7 gap-px overflow-hidden rounded-xl border bg-border`}>
          {WD.map((w) => <div key={w} className="bg-muted px-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{w}</div>)}
          {days.map((d) => {
            const items = byDate[d] ?? [];
            const out = mode === "month" && d.slice(0, 7) !== curMonth;
            return (
              <div key={d} data-date={d} className={`flex flex-col gap-1 bg-card p-2 ${mode === "week" ? "min-h-56" : "min-h-28"} ${out ? "opacity-45" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${d === today ? "flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground" : ""}`}>{Number(d.slice(8))}</span>
                  <button aria-label={`Novo em ${d}`} onClick={() => setEditing({ kind: "caption", status: "planned", scheduled_date: d, title: "", content: "" })} className="text-xs text-muted-foreground opacity-0 hover:text-foreground focus:opacity-100 [div:hover>div>&]:opacity-100">+</button>
                </div>
                {items.map((r) => (
                  <button key={r.id} onClick={() => setEditing(r)} className="truncate rounded-md bg-secondary px-2 py-1 text-left text-xs text-secondary-foreground hover:bg-accent/40">
                    <span className="font-semibold">{KIND_LABEL[r.kind]}</span> · {r.title || "Sem título"}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      {q.isFetching && <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Atualizando…</div>}
      <DraftEditor draft={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
