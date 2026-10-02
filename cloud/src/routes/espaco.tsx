import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/studio/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkspace } from "@/lib/workspace-context";

export const Route = createFileRoute("/espaco")({
  head: () => ({
    meta: [
      { title: "Seu espaço — Instagram Studio" },
      { name: "description", content: "Recupere seu espaço privado em outro dispositivo com o código de acesso." },
      { property: "og:title", content: "Seu espaço — Instagram Studio" },
      { property: "og:description", content: "Espaço privado na nuvem, sem conta e sem conectar o Instagram." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SpacePage,
});

function SpacePage() {
  const { token, switchTo } = useWorkspace();
  const [show, setShow] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const recover = async () => {
    setBusy(true);
    setMsg(null);
    const r = await switchTo(code);
    setBusy(false);
    if (r.ok) {
      setCode("");
      toast.success("Espaço recuperado");
    } else setMsg(r.message);
  };

  return (
    <div className="grid max-w-2xl gap-6">
      <PageHeader title="Seu espaço" subtitle="Um espaço privado e anônimo na nuvem. Sem conta, sem conectar o Instagram." />
      <section className="surface p-5 md:p-6">
        <h2 className="text-xl">Código de acesso</h2>
        <p className="mt-1 text-sm text-muted-foreground">Guarde este código. Ele abre este mesmo espaço em outro navegador. Quem tiver o código vê seus rascunhos.</p>
        <div className="mt-4 flex gap-2">
          <Input readOnly aria-label="Código de acesso" type={show ? "text" : "password"} value={token ?? ""} className="font-mono text-xs" />
          <Button variant="outline" size="icon" aria-label={show ? "Ocultar" : "Mostrar"} onClick={() => setShow(!show)}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
          <Button variant="outline" onClick={() => token && navigator.clipboard.writeText(token).then(() => toast.success("Código copiado"))}><Copy className="h-4 w-4" /> Copiar</Button>
        </div>
      </section>
      <section className="surface p-5 md:p-6">
        <h2 className="text-xl">Abrir outro espaço</h2>
        <p className="mt-1 text-sm text-muted-foreground">Cole um código para trocar de espaço. Se o código for inválido, você continua no atual.</p>
        <form className="mt-4 grid gap-2" onSubmit={(e) => { e.preventDefault(); if (code.trim()) recover(); }}>
          <Label htmlFor="rec">Código</Label>
          <div className="flex gap-2">
            <Input id="rec" value={code} maxLength={300} onChange={(e) => setCode(e.target.value)} placeholder="xxxxxxxx-xxxx-….chave" className="font-mono text-xs" />
            <Button type="submit" disabled={busy || !code.trim()}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Recuperar</Button>
          </div>
          {msg && <p className="text-sm text-destructive" role="alert">{msg}</p>}
        </form>
      </section>
    </div>
  );
}
