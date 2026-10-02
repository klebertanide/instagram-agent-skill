<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Instagram Studio
- Anonymous workspaces: browser keeps only `workspaceId.accessKey`; server stores SHA-256 of key and every server fn calls `requireWorkspace` before DB access — no Supabase Auth, tables have RLS with no policies and are reached only via service role.
- All AI runs server-side in `src/lib/ai.server.ts` (Responses API via gateway); deterministic review/reference math lives in pure `src/lib/editorial.ts` shared by client and server.
- Editorial core (analysis, grounding, guides, catalog) is vendored verbatim from klebertanide/instagram-agent-skill web/ under src/lib/core with its tests in src/test/core; adapt via src/lib/core-adapter.ts instead of editing it, so upstream updates stay diffable.
- Stored workspace credential is only changed by explicit user action (recover/create); startup decisions live in pure src/lib/workspace-startup.ts. Drafts' checks and options are always recomputed/kept server-side (client values ignored) via core-adapter reviewDraft/pickOptions; grounding facts = context + profile.proof + computed rankings only.
- Reference parsing uses core parseReferenceRows via core-adapter coreReferences; durations above the core's 180 s cap are re-evaluated in core-adapter against the user's target (max 600) — keeps one tested parser and no checks citing a value the user did not set.
- DraftEditor tags save/recalculate/delete with an editor session id and blocks closing while busy — late responses must never touch another draft.
