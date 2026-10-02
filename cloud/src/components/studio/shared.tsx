import { CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { Check, Stats } from "@/lib/editorial";
import { getProfileFn } from "@/lib/studio.functions";
import { useWorkspace } from "@/lib/workspace-context";
import { EMPTY_VOICE, type VoiceProfile } from "@/lib/tools";

const ICON = { ok: CheckCircle2, warn: AlertTriangle, error: XCircle, info: Info } as const;
const COLOR = { ok: "text-success", warn: "text-warning", error: "text-destructive", info: "text-muted-foreground" } as const;

export function ChecksList({ checks }: { checks: Check[] }) {
  if (!checks?.length) return null;
  return (
    <ul className="space-y-2">
      {checks.map((c) => {
        const Icon = ICON[c.level] ?? Info;
        return (
          <li key={c.id} className="flex gap-2.5 text-sm">
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${COLOR[c.level] ?? ""}`} />
            <div>
              <div className="font-medium">{c.label}</div>
              {c.detail && <div className="text-muted-foreground">{c.detail}</div>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function StatsRow({ stats }: { stats: Stats | null | undefined }) {
  if (!stats) return null;
  const items = [
    ["Caracteres", stats.chars],
    ["Palavras", stats.words],
    ["Hashtags", stats.hashtags],
    ...(stats.speechSeconds != null ? [["Fala estimada", `≈${stats.speechSeconds}s`]] : []),
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(([k, v]) => (
        <div key={String(k)} className="rounded-full bg-muted px-3 py-1 text-xs">
          <span className="text-muted-foreground">{k}</span> <span className="font-semibold">{v}</span>
        </div>
      ))}
    </div>
  );
}

export function useProfile() {
  const { token, workspaceId } = useWorkspace();
  const get = useServerFn(getProfileFn);
  return useQuery({
    queryKey: ["profile", workspaceId],
    enabled: !!token,
    queryFn: async () => {
      const r = await get({ data: { token: token! } });
      return { ...EMPTY_VOICE, ...(r.profile ?? {}) } as VoiceProfile;
    },
  });
}

export function errMsg(e: unknown) {
  if (e instanceof Error) {
    if (/failed to fetch|networkerror|load failed/i.test(e.message)) return "Sem conexão com o servidor. Verifique a internet e tente de novo.";
    try {
      const parsed = JSON.parse(e.message);
      if (Array.isArray(parsed) && parsed[0]?.message) return parsed[0].message as string;
    } catch {
      /* not zod */
    }
    return e.message;
  }
  return "Algo deu errado.";
}
