import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createWorkspaceFn, verifyWorkspaceFn } from "./studio.functions";
import { decideStartup, type StartupStatus } from "./workspace-startup";

export const STORAGE_KEY = "instagram-studio.credential";
const PREVIOUS_KEY = "instagram-studio.previous-credential";

type SwitchResult = { ok: true } | { ok: false; message: string };

type Ctx = {
  token: string | null;
  workspaceId: string | null;
  status: StartupStatus;
  error: string | null;
  retry: () => void;
  switchTo: (code: string) => Promise<SwitchResult>;
  createNew: () => Promise<SwitchResult>;
};

const WorkspaceContext = createContext<Ctx | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<StartupStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const qc = useQueryClient();
  const create = useServerFn(createWorkspaceFn);
  const verify = useServerFn(verifyWorkspaceFn);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus("loading");
      setError(null);
      const stored = localStorage.getItem(STORAGE_KEY);
      let outcome: "valid" | "invalid" | "unreachable" | "none" = "none";
      if (stored) {
        try {
          const r = await verify({ data: { token: stored } });
          outcome = r.valid ? "valid" : "invalid";
        } catch {
          outcome = "unreachable";
        }
      }
      if (cancelled) return;
      const d = decideStartup(stored, outcome);
      // The stored credential is never removed or replaced here; only explicit user actions change it.
      if (d.action === "use") {
        setToken(stored);
        setStatus(d.status);
        if (d.status === "offline") setError("Não conseguimos confirmar seu espaço agora. Seu código continua guardado neste navegador.");
        return;
      }
      if (d.action === "ask") {
        setToken(null);
        setStatus("invalid");
        setError("Não encontramos o espaço guardado neste navegador.");
        return;
      }
      try {
        const res = await create();
        if (cancelled) return;
        localStorage.setItem(STORAGE_KEY, res.token);
        setToken(res.token);
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setError("Não foi possível abrir seu espaço na nuvem.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt, create, verify]);

  const adopt = useCallback(
    (next: string) => {
      const prev = localStorage.getItem(STORAGE_KEY);
      if (prev && prev !== next) localStorage.setItem(PREVIOUS_KEY, prev);
      localStorage.setItem(STORAGE_KEY, next);
      qc.clear();
      setToken(next);
      setStatus("ready");
      setError(null);
    },
    [qc],
  );

  const switchTo = useCallback(
    async (code: string): Promise<SwitchResult> => {
      const c = code.trim();
      if (!c) return { ok: false, message: "Cole o código de acesso." };
      try {
        const r = await verify({ data: { token: c } });
        if (!r.valid) return { ok: false, message: "Código inválido. Você continua no seu espaço atual." };
      } catch {
        return { ok: false, message: "Não foi possível verificar agora. Você continua no seu espaço atual; tente de novo." };
      }
      adopt(c);
      return { ok: true };
    },
    [verify, adopt],
  );

  const createNew = useCallback(async (): Promise<SwitchResult> => {
    try {
      const res = await create();
      adopt(res.token);
      return { ok: true };
    } catch {
      return { ok: false, message: "Não foi possível criar outro espaço agora. Nada foi alterado." };
    }
  }, [create, adopt]);

  const workspaceId = token ? (token.split(".")[0] ?? null) : null;
  return (
    <WorkspaceContext.Provider value={{ token, workspaceId, status, error, retry: () => setAttempt((a) => a + 1), switchTo, createNew }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const c = useContext(WorkspaceContext);
  if (!c) throw new Error("WorkspaceProvider ausente");
  return c;
}
