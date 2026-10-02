import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { LIMITS, TOOLS, VOICE_FIELDS } from "./tools";
import { isValidISODate } from "./editorial";

const token = z.string().min(30).max(300);
const toolId = z.enum(TOOLS.map((t) => t.id) as [string, ...string[]]);
const isoDate = z.string().refine(isValidISODate, "Data inválida (use AAAA-MM-DD).");

export const createWorkspaceFn = createServerFn({ method: "POST" }).handler(async () => {
  const { createWorkspace } = await import("./workspace.server");
  return createWorkspace();
});

export const verifyWorkspaceFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token }).parse(d))
  .handler(async ({ data }) => {
    const { checkWorkspace } = await import("./workspace.server");
    const workspaceId = await checkWorkspace(data.token);
    return { valid: !!workspaceId, workspaceId };
  });

const voiceSchema = z.object(
  Object.fromEntries(VOICE_FIELDS.map((f) => [f.key, z.string().max(4000).default("")])) as Record<string, z.ZodDefault<z.ZodString>>,
);

export const getProfileFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token }).parse(d))
  .handler(async ({ data }) => {
    const { requireWorkspace } = await import("./workspace.server");
    const ws = await requireWorkspace(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("voice_profiles").select("data").eq("workspace_id", ws).maybeSingle();
    if (error) throw new Error("Não foi possível carregar sua voz agora. Tente de novo.");
    return { profile: (row?.data ?? null) as Record<string, string> | null };
  });

export const saveProfileFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token, profile: voiceSchema }).parse(d))
  .handler(async ({ data }) => {
    const { requireWorkspace } = await import("./workspace.server");
    const ws = await requireWorkspace(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("voice_profiles")
      .upsert({ workspace_id: ws, data: data.profile, updated_at: new Date().toISOString() });
    if (error) throw new Error("Não foi possível salvar o perfil.");
    return { ok: true };
  });

export const generateFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        token,
        tool: toolId,
        context: z.string().trim().min(3, "Escreva o contexto.").max(LIMITS.context),
        goal: z.string().max(LIMITS.goal).default(""),
        duration: z.number().int().min(5).max(600).nullable().default(null),
        wpm: z.number().int().min(80).max(260).nullable().default(null),
        keywords: z.string().max(LIMITS.keywords).default(""),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireWorkspace } = await import("./workspace.server");
    const ws = await requireWorkspace(data.token);
    if (data.tool === "references") throw new Error("Referências usam apenas os dados enviados.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error: profileError } = await supabaseAdmin.from("voice_profiles").select("data").eq("workspace_id", ws).maybeSingle();
    // A failed read must not silently generate with an empty voice/proof.
    if (profileError) throw new Error("Não foi possível carregar sua voz agora, então nada foi gerado. Seu contexto está preservado; tente de novo.");
    const { generate } = await import("./ai.server");
    const out = await generate(
      { tool: data.tool as never, context: data.context, goal: data.goal, duration: data.duration, wpm: data.wpm, keywords: data.keywords },
      (row?.data ?? {}) as Record<string, string>,
    );
    const { reviewDraft } = await import("./core-adapter");
    const options = { duration: data.duration, wpm: data.wpm, keywords: data.keywords, goal: data.goal };
    return { ...out, ...reviewDraft(data.tool, out.content, out.slides, options), options };
  });

export const analyzeFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        token,
        text: z.string().max(LIMITS.content),
        kind: z.string().max(30),
        wpm: z.number().int().min(80).max(260).nullable().default(null),
        duration: z.number().int().min(5).max(600).nullable().default(null),
        goal: z.string().max(LIMITS.goal).default(""),
        keywords: z.string().max(LIMITS.keywords).default(""),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireWorkspace } = await import("./workspace.server");
    await requireWorkspace(data.token);
    const { reviewDraft } = await import("./core-adapter");
    return reviewDraft(data.kind, data.text, [], { wpm: data.wpm, duration: data.duration, goal: data.goal, keywords: data.keywords });
  });

export const referencesFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token, text: z.string().min(1).max(LIMITS.references) }).parse(d))
  .handler(async ({ data }) => {
    const { requireWorkspace } = await import("./workspace.server");
    await requireWorkspace(data.token);
    const { coreReferences } = await import("./core-adapter");
    return coreReferences(data.text);
  });

// ---------- Drafts ----------

const draftInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().max(LIMITS.title).default(""),
  content: z.string().max(LIMITS.content).default(""),
  kind: toolId,
  status: z.enum(["draft", "ready", "planned"]).default("draft"),
  scheduled_date: isoDate.nullable().default(null),
  checks: z.array(z.any()).max(50).default([]),
  slides: z.array(z.string().max(1000)).max(12).default([]),
  schedule: z.array(z.object({ day: z.string().max(40), format: z.string().max(100), idea: z.string().max(1000) })).max(14).default([]),
  notes: z.string().max(LIMITS.content).default(""),
  options: z.record(z.any()).default({}),
});

const refRows = z
  .array(
    z.object({
      account: z.string().max(100),
      hook: z.string().max(2000),
      views: z.number().finite().nonnegative().nullable(),
      median: z.number().finite().positive().nullable(),
      ratio: z.number().nullable().optional(),
    }),
  )
  .max(500);

export type DraftRow = z.infer<typeof draftInput> & { id: string; created_at: string; updated_at: string };

export const listDraftsFn = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        token,
        offset: z.number().int().min(0).default(0),
        limit: z.number().int().min(1).max(100).default(20),
        q: z.string().max(100).default(""),
        kind: z.string().max(30).default(""),
        status: z.string().max(20).default(""),
        from: isoDate.optional(),
        to: isoDate.optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireWorkspace } = await import("./workspace.server");
    const ws = await requireWorkspace(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("drafts").select("*", { count: "exact" }).eq("workspace_id", ws);
    if (data.kind) q = q.eq("kind", data.kind);
    if (data.status) q = q.eq("status", data.status);
    if (data.from) q = q.gte("scheduled_date", data.from);
    if (data.to) q = q.lte("scheduled_date", data.to);
    if (data.q.trim()) {
      const term = data.q.trim().replace(/[%,()*\\]/g, " ");
      q = q.or(`title.ilike.%${term}%,content.ilike.%${term}%`);
    }
    const { data: rows, error, count } = await q
      .order(data.from ? "scheduled_date" : "updated_at", { ascending: !!data.from })
      .order("id", { ascending: true })
      .range(data.offset, data.offset + data.limit - 1);
    if (error) throw new Error("Não foi possível carregar a biblioteca.");
    return { rows: (rows ?? []) as unknown as DraftRow[], total: count ?? 0 };
  });

export const saveDraftFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token, draft: draftInput }).parse(d))
  .handler(async ({ data }) => {
    const { requireWorkspace } = await import("./workspace.server");
    const ws = await requireWorkspace(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, checks: _clientChecks, ...rest } = data.draft;
    if (!rest.title.trim() && !rest.content.trim() && !rest.slides.length) throw new Error("Rascunho vazio não pode ser salvo.");
    const { pickOptions, reviewDraft } = await import("./core-adapter");
    let options: Record<string, unknown>;
    if (id) {
      // Updates keep the options recorded when the draft was created; the client cannot rewrite them.
      const { data: existing, error: readError } = await supabaseAdmin.from("drafts").select("options").eq("id", id).eq("workspace_id", ws).maybeSingle();
      if (readError) throw new Error("Não foi possível salvar o rascunho.");
      if (!existing) throw new Error("Esse rascunho não foi encontrado no seu espaço.");
      options = (existing.options ?? {}) as Record<string, unknown>;
    } else {
      options = { ...pickOptions(rest.options) };
      if (rest.kind === "references") {
        const parsed = refRows.safeParse((rest.options as Record<string, unknown>)["references"] ?? []);
        if (!parsed.success) throw new Error("Confira os números das referências.");
        options["references"] = parsed.data.map((r) => ({ ...r, ratio: r.views != null && r.median ? r.views / r.median : null }));
      }
    }
    const checks = reviewDraft(rest.kind, rest.content, rest.slides, pickOptions(options)).checks;
    const payload = { ...rest, options: options as never, checks: checks as never, workspace_id: ws, updated_at: new Date().toISOString() };
    const res = id
      ? await supabaseAdmin.from("drafts").update(payload).eq("id", id).eq("workspace_id", ws).select("*").maybeSingle()
      : await supabaseAdmin.from("drafts").insert(payload).select("*").single();
    if (res.error || !res.data) throw new Error("Não foi possível salvar o rascunho.");
    return res.data as unknown as DraftRow;
  });

export const deleteDraftFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token, id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireWorkspace } = await import("./workspace.server");
    const ws = await requireWorkspace(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("drafts").delete().eq("id", data.id).eq("workspace_id", ws);
    if (error) throw new Error("Não foi possível excluir.");
    return { ok: true };
  });
