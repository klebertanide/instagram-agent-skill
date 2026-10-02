# Instagram Studio web app

The cloud app uses the AppDeploy React/Vite scaffold and Node/TypeScript backend.
Use `@appdeploy/client` only in frontend and `@appdeploy/sdk` only in backend.
The platform injects those SDK packages; do not add them to package.json.
Reference SDK declarations in `/workspace/scratch/instagram-cloud-sdk.json` while developing.

No terminal commands, API keys or platform plumbing belong in the product UI.
All AI calls and deterministic checks execute in backend. Each anonymous
workspace has an opaque access credential; verify it before every data operation,
and scope tables by the verified workspace ID. Keep record sizes and page reads bounded.
Never log credentials, prompts or complete drafts.

Retain user facts and language. Unknown claims stay placeholders; generated
research never implies browsing took place. Dates use America/Sao_Paulo unless
the user's workspace specifies otherwise. Calendar entries organize drafts;
the app does not publish to Instagram.

Use conventional readable source, accessible labels, useful error messages,
responsive layout and real copy/download/export actions. QA contract is
`tests/tests.json`; backend tests must check validation, scope and real behavior.
