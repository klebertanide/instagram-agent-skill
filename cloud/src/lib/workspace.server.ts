import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function hash(key: string) {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

export async function createWorkspace() {
  const key = randomBytes(32).toString("base64url");
  const { data, error } = await supabaseAdmin.from("workspaces").insert({ key_hash: hash(key) }).select("id").single();
  if (error || !data) throw new Error("Não foi possível criar seu espaço agora.");
  return { workspaceId: data.id, token: `${data.id}.${key}` };
}

export class InvalidWorkspaceError extends Error {
  constructor() {
    super("Código de acesso inválido.");
    this.name = "InvalidWorkspaceError";
  }
}

/** Returns the workspace id, null for a wrong credential; throws only when the service is unavailable. */
export async function checkWorkspace(token: string): Promise<string | null> {
  const t = (token ?? "").trim();
  const dot = t.indexOf(".");
  const id = t.slice(0, dot);
  const key = t.slice(dot + 1);
  if (dot < 0 || !UUID.test(id) || key.length < 20 || key.length > 200) return null;
  const { data, error } = await supabaseAdmin.from("workspaces").select("id,key_hash").eq("id", id).maybeSingle();
  if (error) throw new Error("O serviço está indisponível agora. Seu código continua guardado; tente de novo.");
  const expected = Buffer.from(data?.key_hash ?? "0".repeat(64), "hex");
  const got = Buffer.from(hash(key), "hex");
  if (!data || expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  return data.id;
}

/** Verifies an opaque "workspaceId.accessKey" credential. Must be called before any read/write. */
export async function requireWorkspace(token: string): Promise<string> {
  const id = await checkWorkspace(token);
  if (!id) throw new InvalidWorkspaceError();
  return id;
}
