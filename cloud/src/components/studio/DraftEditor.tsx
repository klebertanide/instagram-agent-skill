import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Download, Image as ImageIcon, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { analyzeFn, deleteDraftFn, saveDraftFn, type DraftRow } from "@/lib/studio.functions";
import { useWorkspace } from "@/lib/workspace-context";
import { STATUS_LABEL, TOOLS, LIMITS } from "@/lib/tools";
import { isValidISODate, type Check } from "@/lib/editorial";
import { downloadCarousel, downloadTxt } from "@/lib/exporters";
import { ChecksList, errMsg, useProfile } from "./shared";

/** True when an async result belongs to the editor session that is still open. */
export function isCurrentSession(current: number, started: number) {
  return current === started;
}

export type EditableDraft = Partial<DraftRow> & { kind: DraftRow["kind"] };

const SLIDE_SEP = "\n---\n";

export function DraftEditor({ draft, onClose }: { draft: EditableDraft | null; onClose: () => void }) {
  const { token } = useWorkspace();
  const qc = useQueryClient();
  const save = useServerFn(saveDraftFn);
  const del = useServerFn(deleteDraftFn);
  const analyze = useServerFn(analyzeFn);
  const profile = useProfile();
  const [d, setD] = useState<EditableDraft | null>(draft);
  const [slidesText, setSlidesText] = useState("");
  const [confirm, setConfirm] = useState(false);

  // Each opened draft is a session; late responses from a previous session are ignored.
  const session = useRef(0);
  useEffect(() => {
    session.current += 1;
    setD(draft);
    setSlidesText((draft?.slides ?? []).join(SLIDE_SEP));
  }, [draft]);

  const opts = (d?.options ?? {}) as { wpm?: number | null; duration?: number | null; keywords?: string; goal?: string };
  const slides = slidesText.split(/\n-{3,}\n/).map((s) => s.trim()).filter(Boolean);

  const saveM = useMutation({
    mutationFn: async () => {
      const sid = session.current;
      if (!d) throw new Error("Nada para salvar");
      if (d.scheduled_date && !isValidISODate(d.scheduled_date)) throw new Error("Data inválida.");
      const row = await save({
        data: {
          token: token!,
          draft: {
            id: d.id, title: d.title ?? "", content: d.content ?? "", kind: d.kind, status: d.status ?? "draft",
            scheduled_date: d.scheduled_date || null, checks: [], slides, schedule: d.schedule ?? [],
            notes: d.notes ?? "", options: d.options ?? {},
          },
        },
      });
      return { row, sid };
    },
    onSuccess: ({ row, sid }) => {
      qc.invalidateQueries({ queryKey: ["drafts"] });
      toast.success("Rascunho salvo");
      if (isCurrentSession(session.current, sid)) setD(row);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const recalc = useMutation({
    mutationFn: async () => {
      const sid = session.current;
      const r = await analyze({
        data: {
          token: token!, text: d?.kind === "carousel" ? [...slides, d?.content ?? ""].join("\n\n") : d?.content ?? "",
          kind: d!.kind, wpm: opts.wpm ?? null, duration: opts.duration ?? null,
          goal: opts.goal ?? "", keywords: opts.keywords ?? "",
        },
      });
      return { r, sid };
    },
    // Only checks change; stored options (including keywords) stay as they were.
    onSuccess: ({ r, sid }) => {
      if (isCurrentSession(session.current, sid)) setD((x) => (x ? { ...x, checks: r.checks as Check[] } : x));
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const delM = useMutation({
    mutationFn: async () => {
      const sid = session.current;
      await del({ data: { token: token!, id: d!.id! } });
      return sid;
    },
    onSuccess: (sid) => {
      qc.invalidateQueries({ queryKey: ["drafts"] });
      toast.success("Excluído");
      if (!isCurrentSession(session.current, sid)) return;
      setConfirm(false);
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const busy = saveM.isPending || delM.isPending || recalc.isPending;
  if (!d) return null;
  const set = (patch: Partial<EditableDraft>) => setD({ ...d, ...patch });
  const fullText = [d.title, d.content, slides.length ? slides.map((s, i) => `Slide ${i + 1}: ${s}`).join("\n\n") : "", d.notes ? `Notas:\n${d.notes}` : ""].filter(Boolean).join("\n\n");

  return (
    <Dialog open={!!draft} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{d.id ? "Editar rascunho" : "Novo rascunho"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="ed-title">Título</Label>
            <Input id="ed-title" value={d.title ?? ""} maxLength={LIMITS.title} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label>Tipo</Label>
              <Select value={d.kind} onValueChange={(v) => set({ kind: v as EditableDraft["kind"] })}>
                <SelectTrigger aria-label="Tipo"><SelectValue /></SelectTrigger>
                <SelectContent>{TOOLS.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Estado</Label>
              <Select value={d.status ?? "draft"} onValueChange={(v) => set({ status: v as "draft" })}>
                <SelectTrigger aria-label="Estado"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ed-date">Data</Label>
              <Input id="ed-date" type="date" value={d.scheduled_date ?? ""} onChange={(e) => set({ scheduled_date: e.target.value || null })} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ed-content">Conteúdo</Label>
            <Textarea id="ed-content" rows={10} maxLength={LIMITS.content} value={d.content ?? ""} onChange={(e) => set({ content: e.target.value })} />
          </div>
          {(d.kind === "carousel" || slides.length > 0) && (
            <div className="grid gap-1.5">
              <Label htmlFor="ed-slides">Slides (separe com uma linha ---)</Label>
              <Textarea id="ed-slides" rows={8} value={slidesText} onChange={(e) => setSlidesText(e.target.value)} />
            </div>
          )}
          {!!d.schedule?.length && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              {d.schedule.map((s, i) => <div key={i}><b>{s.day}</b> · {s.format} — {s.idea}</div>)}
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="ed-notes">Notas</Label>
            <Textarea id="ed-notes" rows={3} value={d.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} />
          </div>
          {(opts.wpm || opts.duration || opts.keywords) && (
            <p className="text-xs text-muted-foreground">
              Opções guardadas: {opts.duration ? `${opts.duration}s ` : ""}{opts.wpm ? `· ${opts.wpm} ppm ` : ""}{opts.keywords ? `· termos: ${opts.keywords}` : ""}
            </p>
          )}
          <div className="surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Checagens</span>
              <Button size="sm" variant="ghost" onClick={() => recalc.mutate()} disabled={recalc.isPending}>
                {recalc.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Recalcular
              </Button>
            </div>
            <ChecksList checks={(d.checks ?? []) as Check[]} />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button onClick={() => saveM.mutate()} disabled={saveM.isPending}>
            {saveM.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
          </Button>
          <Button variant="outline" onClick={() => navigator.clipboard.writeText(fullText).then(() => toast.success("Copiado"))}><Copy className="h-4 w-4" /> Copiar</Button>
          <Button variant="outline" onClick={() => downloadTxt(fullText, d.title || "rascunho")}><Download className="h-4 w-4" /> TXT</Button>
          {slides.length > 0 && (
            <Button variant="outline" onClick={() => downloadCarousel(slides, profile.data?.handle ?? "", d.title || "carrossel")}><ImageIcon className="h-4 w-4" /> PNGs</Button>
          )}
          {d.id && (
            <Button variant="ghost" className="ml-auto text-destructive hover:text-destructive" onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" /> Excluir</Button>
          )}
        </div>
        <AlertDialog open={confirm} onOpenChange={setConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir este rascunho?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={(e) => { e.preventDefault(); delM.mutate(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {delM.isPending ? "Excluindo…" : "Confirmar exclusão"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
