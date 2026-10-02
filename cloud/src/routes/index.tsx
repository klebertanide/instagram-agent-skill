import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Download, Image as ImageIcon, Loader2, Save, Sparkles, Upload, AlertTriangle, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/studio/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TOOLS, TOOL_BY_ID, LIMITS, type ToolId } from "@/lib/tools";
import { generateFn, referencesFn, saveDraftFn } from "@/lib/studio.functions";
import { useWorkspace } from "@/lib/workspace-context";
import { ChecksList, StatsRow, errMsg, useProfile } from "@/components/studio/shared";
import { DraftEditor, type EditableDraft } from "@/components/studio/DraftEditor";
import { downloadCarousel, downloadTxt } from "@/lib/exporters";
import { formatRatio, type RefRow } from "@/lib/editorial";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Criar — Instagram Studio" },
      { name: "description", content: "Gere roteiros de Reel, legendas, carrosséis e planos com IA, na sua voz." },
      { property: "og:title", content: "Criar — Instagram Studio" },
      { property: "og:description", content: "Treze ferramentas editoriais para Instagram, com IA na nuvem." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreatePage,
});

type Form = { context: string; goal: string; duration: string; wpm: string; keywords: string };
const EMPTY: Form = { context: "", goal: "", duration: "45", wpm: "150", keywords: "" };
type GenResult = Awaited<ReturnType<typeof generateFn>>;

function CreatePage() {
  const { token } = useWorkspace();
  const qc = useQueryClient();
  const profile = useProfile();
  const [tool, setTool] = useState<ToolId>("reel");
  const [forms, setForms] = useState<Record<string, Form>>({});
  const [results, setResults] = useState<Record<string, GenResult>>({});
  const [editing, setEditing] = useState<EditableDraft | null>(null);
  const def = TOOL_BY_ID[tool];
  const form = forms[tool] ?? EMPTY;
  const setForm = (p: Partial<Form>) => setForms((f) => ({ ...f, [tool]: { ...form, ...p } }));
  const gen = useServerFn(generateFn);
  const save = useServerFn(saveDraftFn);

  const optionsFor = (f: Form) => ({
    duration: def.fields.includes("duration") && f.duration ? Number(f.duration) : null,
    wpm: def.fields.includes("wpm") && f.wpm ? Number(f.wpm) : null,
    keywords: def.fields.includes("keywords") ? f.keywords.trim() : "",
  });

  const genM = useMutation({
    mutationFn: async (vars: { tool: ToolId; form: Form }) => {
      const o = optionsFor(vars.form);
      return gen({ data: { token: token!, tool: vars.tool, context: vars.form.context.trim(), goal: vars.form.goal.trim(), ...o } });
    },
    onSuccess: (r, vars) => setResults((x) => ({ ...x, [vars.tool]: r })),
  });

  const result = results[tool];
  const busy = genM.isPending;
  const failedHere = genM.isError && genM.variables?.tool === tool;

  const saveM = useMutation({
    mutationFn: async () => {
      const r = result!;
      return save({
        data: {
          token: token!,
          draft: {
            title: r.title || def.name, content: r.content, kind: tool, status: "draft", scheduled_date: null,
            checks: [], slides: r.slides, schedule: r.schedule, notes: r.notes,
            // Options snapshot captured with this result at generation time — never the current controls.
            options: r.options,
          },
        },
      });
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["drafts"] });
      toast.success("Salvo na biblioteca");
      setEditing(row);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const submit = () => {
    if (form.context.trim().length < 3) {
      toast.error("Escreva o contexto antes de gerar.");
      return;
    }
    genM.mutate({ tool, form });
  };

  const fullText = result
    ? [result.title, result.content, result.slides.length ? result.slides.map((s, i) => `Slide ${i + 1}: ${s}`).join("\n\n") : "", result.schedule.length ? result.schedule.map((s) => `${s.day} — ${s.format}: ${s.idea}`).join("\n") : "", result.notes ? `Notas:\n${result.notes}` : ""].filter(Boolean).join("\n\n")
    : "";

  return (
    <div>
      <PageHeader title="Criar" subtitle="Escolha uma ferramenta, dê o contexto e gere na sua voz. Nada é publicado automaticamente." />

      <div className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" role="radiogroup" aria-label="Ferramentas">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            role="radio"
            aria-checked={tool === t.id}
            disabled={busy}
            onClick={() => setTool(t.id)}
            className={`rounded-xl border px-3 py-3 text-left text-sm transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
              tool === t.id ? "border-accent bg-secondary text-secondary-foreground shadow-soft" : "border-border bg-card hover:border-accent/60"
            }`}
          >
            <span className="font-semibold">{t.name}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <section className="surface h-fit p-5 md:p-6">
          <h2 className="text-2xl">{def.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{def.description}</p>
          {tool === "references" ? (
            <ReferencesTool />
          ) : (
            <form className="mt-5 grid gap-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <div className="grid gap-1.5">
                <Label htmlFor="ctx">{def.contextLabel}</Label>
                <Textarea id="ctx" rows={7} maxLength={LIMITS.context} placeholder={def.placeholder} value={form.context} disabled={busy} onChange={(e) => setForm({ context: e.target.value })} />
                <span className="text-right text-xs text-muted-foreground">{form.context.length}/{LIMITS.context}</span>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="goal">Objetivo</Label>
                <Input id="goal" maxLength={LIMITS.goal} placeholder="Ex.: gerar conversas no direct" value={form.goal} disabled={busy} onChange={(e) => setForm({ goal: e.target.value })} />
              </div>
              {(def.fields.includes("duration") || def.fields.includes("wpm")) && (
                <div className="grid grid-cols-2 gap-3">
                  {def.fields.includes("duration") && (
                    <div className="grid gap-1.5">
                      <Label htmlFor="dur">Duração (segundos)</Label>
                      <Input id="dur" type="number" min={5} max={600} value={form.duration} disabled={busy} onChange={(e) => setForm({ duration: e.target.value })} />
                    </div>
                  )}
                  {def.fields.includes("wpm") && (
                    <div className="grid gap-1.5">
                      <Label htmlFor="wpm">Ritmo de fala (ppm)</Label>
                      <Input id="wpm" type="number" min={80} max={260} value={form.wpm} disabled={busy} onChange={(e) => setForm({ wpm: e.target.value })} />
                    </div>
                  )}
                </div>
              )}
              {def.fields.includes("keywords") && (
                <div className="grid gap-1.5">
                  <Label htmlFor="kw">Termos de busca</Label>
                  <Input id="kw" maxLength={LIMITS.keywords} placeholder="Ex.: proposta comercial, freelancer" value={form.keywords} disabled={busy} onChange={(e) => setForm({ keywords: e.target.value })} />
                </div>
              )}
              {!profile.data?.brandName && !profile.isLoading && (
                <p className="rounded-lg bg-secondary px-3 py-2 text-xs text-secondary-foreground">Dica: preencha “Minha voz” para a IA escrever do seu jeito.</p>
              )}
              <Button type="submit" size="lg" disabled={busy || form.context.trim().length < 3}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {busy ? "Gerando…" : "Gerar"}
              </Button>
            </form>
          )}
        </section>

        {tool !== "references" && (
          <section className="min-w-0">
            {busy && genM.variables?.tool === tool ? (
              <div className="surface flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-accent" /> Escrevendo com IA… pode levar alguns segundos.
              </div>
            ) : failedHere ? (
              <div className="surface flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center" role="alert">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <p className="font-medium">{errMsg(genM.error)}</p>
                <p className="text-sm text-muted-foreground">Seu contexto foi mantido.</p>
                <Button onClick={submit}><RotateCcw className="h-4 w-4" /> Tentar de novo</Button>
              </div>
            ) : result ? (
              <article className="surface p-5 md:p-6">
                <h2 className="text-2xl">{result.title || def.name}</h2>
                <div className="mt-3"><StatsRow stats={result.stats} /></div>
                {result.warnings?.map((w) => (
                  <p key={w} className="mt-3 rounded-lg bg-warning/15 px-3 py-2 text-sm">{w}</p>
                ))}
                {result.slides.length > 0 && (
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {result.slides.map((s, i) => (
                      <div key={i} className={`flex aspect-[4/5] flex-col justify-between rounded-lg p-3 text-xs ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <p className={i === 0 ? "font-display text-sm" : "font-medium"}>{s}</p>
                        <div className="flex justify-between opacity-60"><span>{profile.data?.handle}</span><span>{i + 1}/{result.slides.length}</span></div>
                      </div>
                    ))}
                  </div>
                )}
                {result.schedule.length > 0 && (
                  <div className="mt-5 divide-y rounded-lg border">
                    {result.schedule.map((s, i) => (
                      <div key={i} className="grid grid-cols-[90px_1fr] gap-3 p-3 text-sm">
                        <div className="font-semibold">{s.day}</div>
                        <div><span className="text-accent-foreground/70">{s.format}</span> — {s.idea}</div>
                      </div>
                    ))}
                  </div>
                )}
                {result.content && <div className="mt-5 whitespace-pre-wrap text-[15px] leading-relaxed">{result.content}</div>}
                {result.notes && (
                  <div className="mt-5 rounded-lg bg-lilac-gradient p-4">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-secondary-foreground">{tool === "reel" ? "Ganchos e direções" : "Notas"}</div>
                    <div className="whitespace-pre-wrap text-sm">{result.notes}</div>
                  </div>
                )}
                <div className="mt-5 border-t pt-4"><ChecksList checks={result.checks} /></div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button onClick={() => saveM.mutate()} disabled={saveM.isPending}>{saveM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar rascunho</Button>
                  <Button variant="outline" onClick={() => navigator.clipboard.writeText(fullText).then(() => toast.success("Copiado"))}><Copy className="h-4 w-4" /> Copiar</Button>
                  <Button variant="outline" onClick={() => downloadTxt(fullText, result.title || def.name)}><Download className="h-4 w-4" /> Baixar TXT</Button>
                  {result.slides.length > 0 && (
                    <Button variant="outline" onClick={() => downloadCarousel(result.slides, profile.data?.handle ?? "", result.title || "carrossel")}><ImageIcon className="h-4 w-4" /> PNGs 1080×1350</Button>
                  )}
                </div>
              </article>
            ) : (
              <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                O resultado aparece aqui.
              </div>
            )}
          </section>
        )}
      </div>
      <DraftEditor draft={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function ReferencesTool() {
  const { token } = useWorkspace();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const parse = useServerFn(referencesFn);
  const save = useServerFn(saveDraftFn);
  const m = useMutation({ mutationFn: () => parse({ data: { token: token!, text } }) });
  const rows: RefRow[] = m.data?.rows ?? [];

  const saveM = useMutation({
    mutationFn: () => {
      const content = ["conta\tviews\tmediana\trazão\tgancho", ...rows.map((r) => [r.account, r.views ?? "", r.median ?? "", formatRatio(r.ratio), r.hook].join("\t"))].join("\n");
      return save({ data: { token: token!, draft: { title: "Referências", content, kind: "references", status: "draft", scheduled_date: null, checks: [], slides: [], schedule: [], notes: "Razão = views ÷ mediana da própria conta, a partir dos dados enviados.", options: { references: rows } } } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["drafts"] }); toast.success("Referências salvas na biblioteca"); },
    onError: (e) => toast.error(errMsg(e)),
  });

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > LIMITS.references) {
      toast.error("Arquivo grande demais (máx. 200 KB).");
      return;
    }
    setText(await f.text());
  };

  return (
    <div className="mt-5 grid gap-4">
      <p className="text-xs text-muted-foreground">Usa somente os dados que você enviar. Colunas: account, views, median, hook (vírgula, ponto e vírgula ou tab). O Studio não pesquisa o Instagram.</p>
      <Textarea aria-label="Dados CSV/TSV" rows={8} maxLength={LIMITS.references} className="font-mono text-xs" placeholder={TOOL_BY_ID.references.placeholder} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => m.mutate()} disabled={!text.trim() || m.isPending}>{m.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Analisar</Button>
        <Button variant="outline" asChild>
          <label className="cursor-pointer"><Upload className="h-4 w-4" /> Enviar arquivo<input type="file" accept=".csv,.tsv,.txt,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} /></label>
        </Button>
      </div>
      {m.isError && <p className="text-sm text-destructive">{errMsg(m.error)}</p>}
      {m.data?.errors.map((e) => <p key={e} className="text-sm text-destructive">{e}</p>)}
      {rows.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="p-2">Conta</th><th className="p-2 text-right">Views</th><th className="p-2 text-right">Mediana</th><th className="p-2 text-right">Razão</th><th className="p-2">Gancho</th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2 font-medium">{r.account}</td>
                    <td className="p-2 text-right">{r.views?.toLocaleString("pt-BR") ?? "—"}</td>
                    <td className="p-2 text-right">{r.median?.toLocaleString("pt-BR") ?? "—"}</td>
                    <td className="p-2 text-right font-semibold" data-testid="ratio">{formatRatio(r.ratio)}</td>
                    <td className="p-2">{r.hook}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button variant="outline" onClick={() => saveM.mutate()} disabled={saveM.isPending}><Save className="h-4 w-4" /> Salvar na biblioteca</Button>
        </>
      )}
    </div>
  );
}
