import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/studio/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveProfileFn } from "@/lib/studio.functions";
import { useWorkspace } from "@/lib/workspace-context";
import { EMPTY_VOICE, VOICE_FIELDS, type VoiceProfile } from "@/lib/tools";
import { errMsg, useProfile } from "@/components/studio/shared";

export const Route = createFileRoute("/voz")({
  head: () => ({
    meta: [
      { title: "Minha voz — Instagram Studio" },
      { name: "description", content: "Defina tom, público e provas reais usados em toda geração." },
      { property: "og:title", content: "Minha voz — Instagram Studio" },
      { property: "og:description", content: "Seu perfil de voz para a IA escrever do seu jeito." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VoicePage,
});

function VoicePage() {
  const { token, workspaceId } = useWorkspace();
  const qc = useQueryClient();
  const profile = useProfile();
  const saveFn = useServerFn(saveProfileFn);
  const [form, setForm] = useState<VoiceProfile>(EMPTY_VOICE);
  const [dirty, setDirty] = useState(false);

  // Server data only fills the form while there are no unsaved edits (refetch/focus never overwrites typing).
  useEffect(() => {
    if (profile.data && !dirty) setForm(profile.data);
  }, [profile.data, dirty]);

  const m = useMutation({
    mutationFn: (snapshot: VoiceProfile) => saveFn({ data: { token: token!, profile: snapshot } }),
    onSuccess: (_r, snapshot) => {
      qc.setQueryData(["profile", workspaceId], snapshot);
      setForm(snapshot);
      setDirty(false);
      toast.success("Voz salva");
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const edit = (key: keyof VoiceProfile, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };
  const locked = m.isPending;

  return (
    <div>
      <PageHeader title="Minha voz" subtitle="Usada em todas as gerações. Só os números em “Provas” podem aparecer nos textos." />
      {profile.isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : profile.isError && !profile.data ? (
        <div className="surface p-6 text-center"><p>{errMsg(profile.error)}</p><Button className="mt-3" onClick={() => profile.refetch()}>Tentar de novo</Button></div>
      ) : (
        <form className="surface grid gap-5 p-5 md:grid-cols-2 md:p-8" onSubmit={(e) => { e.preventDefault(); m.mutate({ ...form }); }}>
          {VOICE_FIELDS.map((f) => (
            <div key={f.key} className={`grid gap-1.5 ${f.multiline ? "md:col-span-2" : ""}`}>
              <Label htmlFor={`v-${f.key}`}>{f.label}</Label>
              {f.multiline ? (
                <Textarea id={`v-${f.key}`} rows={3} maxLength={4000} value={form[f.key]} disabled={locked} onChange={(e) => edit(f.key, e.target.value)} />
              ) : (
                <Input id={`v-${f.key}`} maxLength={200} value={form[f.key]} disabled={locked} onChange={(e) => edit(f.key, e.target.value)} />
              )}
            </div>
          ))}
          <div className="flex items-center gap-3 md:col-span-2">
            <Button type="submit" size="lg" disabled={locked}>{locked && <Loader2 className="h-4 w-4 animate-spin" />} Salvar voz</Button>
            {dirty && !locked && <span className="text-sm text-muted-foreground" data-testid="unsaved">Alterações não salvas</span>}
          </div>
        </form>
      )}
    </div>
  );
}
