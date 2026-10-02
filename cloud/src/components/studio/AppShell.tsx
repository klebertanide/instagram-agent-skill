import { Link, useLocation } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { CalendarDays, Library, Menu, Mic2, Sparkles, KeyRound, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/workspace-context";

const NAV = [
  { to: "/", label: "Criar", icon: Sparkles },
  { to: "/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/biblioteca", label: "Biblioteca", icon: Library },
  { to: "/voz", label: "Minha voz", icon: Mic2 },
  { to: "/espaco", label: "Seu espaço", icon: KeyRound },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            }`}
          >
            <Icon className={`h-4 w-4 ${active ? "text-sidebar-primary" : ""}`} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary font-display text-lg text-sidebar-primary-foreground">S</div>
      <div>
        <div className="font-display text-lg leading-none text-sidebar-accent-foreground">Instagram Studio</div>
        <div className="mt-1 text-[11px] uppercase tracking-widest text-sidebar-foreground/50">editorial</div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { token, error, retry, status } = useWorkspace();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col gap-8 bg-sidebar p-4 pt-6 md:flex">
        <Brand />
        <NavList />
        <p className="mt-auto px-3 text-xs leading-relaxed text-sidebar-foreground/50">
          Você publica manualmente no Instagram. Nenhuma conta é conectada.
        </p>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-sidebar px-4 py-3 md:hidden">
        <Brand />
        <Button variant="ghost" size="icon" aria-label="Abrir menu" onClick={() => setOpen(true)} className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <Menu className="h-5 w-5" />
        </Button>
      </header>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-4 pt-6">
          <SheetTitle className="sr-only">Navegação</SheetTitle>
          <div className="flex flex-col gap-8">
            <Brand />
            <NavList onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <main className="md:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-10 md:py-10">
          {status === "offline" && token && (
            <div role="status" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={retry}>Tentar de novo</Button>
            </div>
          )}
          {status === "invalid" ? (
            <RecoverPanel />
          ) : status === "error" ? (
            <div className="surface mx-auto max-w-md p-8 text-center">
              <p className="font-display text-xl">{error}</p>
              <Button className="mt-4" onClick={retry}>Tentar de novo</Button>
            </div>
          ) : !token ? (
            <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Abrindo seu espaço privado…
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function RecoverPanel() {
  const { error, retry, switchTo, createNew } = useWorkspace();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const run = async (fn: () => Promise<{ ok: true } | { ok: false; message: string }>) => {
    setBusy(true);
    setMsg(null);
    const r = await fn();
    setBusy(false);
    if (!r.ok) setMsg(r.message);
  };
  return (
    <div className="surface mx-auto grid max-w-lg gap-4 p-8" role="alert">
      <p className="font-display text-xl">{error}</p>
      <p className="text-sm text-muted-foreground">O código antigo continua guardado. Escolha o que fazer — nada é trocado sem sua ação.</p>
      <Button variant="outline" onClick={retry} disabled={busy}>Tentar de novo</Button>
      <form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); void run(() => switchTo(code)); }}>
        <label htmlFor="recover-code" className="text-sm font-medium">Recuperar com código de acesso</label>
        <input id="recover-code" value={code} onChange={(e) => setCode(e.target.value)} className="rounded-md border bg-background px-3 py-2 font-mono text-xs" autoComplete="off" />
        <Button type="submit" disabled={busy || !code.trim()}>Recuperar espaço</Button>
      </form>
      {confirmNew ? (
        <div className="grid gap-2 rounded-lg bg-muted p-3 text-sm">
          <p>Criar um espaço novo e vazio? O código antigo fica salvo neste navegador como anterior.</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void run(createNew)} disabled={busy}>Criar outro espaço</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmNew(false)}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" onClick={() => setConfirmNew(true)} disabled={busy}>Criar outro espaço</Button>
      )}
      {msg && <p className="text-sm text-destructive">{msg}</p>}
    </div>
  );
}
