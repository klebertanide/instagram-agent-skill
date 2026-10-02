import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/studio/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listDraftsFn, type DraftRow } from "@/lib/studio.functions";
import { useWorkspace } from "@/lib/workspace-context";
import { KIND_LABEL, STATUS_LABEL, TOOLS } from "@/lib/tools";
import { DraftEditor, type EditableDraft } from "@/components/studio/DraftEditor";
import { errMsg } from "@/components/studio/shared";

export const Route = createFileRoute("/biblioteca")({
  head: () => ({
    meta: [
      { title: "Biblioteca — Instagram Studio" },
      { name: "description", content: "Todos os seus rascunhos, com busca e filtros." },
      { property: "og:title", content: "Biblioteca — Instagram Studio" },
      { property: "og:description", content: "Rascunhos salvos no seu espaço privado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LibraryPage,
});

const PAGE = 20;

export function formatDateBR(iso: string | null | undefined) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function LibraryPage() {
  const { token, workspaceId } = useWorkspace();
  const list = useServerFn(listDraftsFn);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<EditableDraft | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 300);
    return () => clearTimeout(t);
  }, [qInput]);

  const query = useInfiniteQuery({
    queryKey: ["drafts", workspaceId, "lib", q, kind, status],
    enabled: !!token,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      list({ data: { token: token!, offset: pageParam, limit: PAGE, q, kind: kind === "all" ? "" : kind, status: status === "all" ? "" : status } }),
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, p) => n + p.rows.length, 0);
      return loaded < last.total ? loaded : undefined;
    },
  });
  const rows: DraftRow[] = query.data?.pages.flatMap((p) => p.rows) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  return (
    <div>
      <PageHeader
        title="Biblioteca"
        subtitle="Seus rascunhos ficam no seu espaço na nuvem."
        action={<Button onClick={() => setEditing({ kind: "caption", status: "draft", title: "", content: "" })}><Plus className="h-4 w-4" /> Novo</Button>}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_180px_160px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Buscar" placeholder="Buscar por título ou texto" className="pl-9" value={qInput} maxLength={100} onChange={(e) => setQInput(e.target.value)} />
        </div>
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger aria-label="Filtrar por tipo"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {TOOLS.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label="Filtrar por estado"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : query.isError ? (
        <div className="surface p-6 text-center">
          <p>{errMsg(query.error)}</p>
          <Button className="mt-3" onClick={() => query.refetch()}>Tentar de novo</Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">Nenhum rascunho encontrado.</div>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">{total} {total === 1 ? "item" : "itens"}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => (
              <button key={r.id} onClick={() => setEditing(r)} className="surface flex flex-col gap-2 p-4 text-left transition-colors hover:border-accent">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">{KIND_LABEL[r.kind] ?? r.kind}</span>
                  <span className="text-muted-foreground">{STATUS_LABEL[r.status]}{r.scheduled_date ? ` · ${formatDateBR(r.scheduled_date)}` : ""}</span>
                </div>
                <div className="font-display text-lg leading-snug">{r.title || "Sem título"}</div>
                <p className="line-clamp-3 text-sm text-muted-foreground">{r.content || r.slides?.[0]}</p>
              </button>
            ))}
          </div>
          {query.hasNextPage && (
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                {query.isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />} Carregar mais
              </Button>
            </div>
          )}
        </>
      )}
      <DraftEditor draft={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
