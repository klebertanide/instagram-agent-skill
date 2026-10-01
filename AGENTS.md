# Working on this repository

This pack supports Codex and Claude through the same thirteen `skills/ig-*`
directories. Each `SKILL.md` is self-contained; its bundled scripts and JSON
resources resolve from the skill directory, not the caller's working directory.
Install the whole pack together: `ig-viral` uses its sibling `ig-reel`.

Keep the Python helpers and installer dependency-free (Python 3.10+). Preserve
existing user profiles, plans, swipe files and logs during installation. Runtime
paths and language behavior are documented in each skill. Drafts are local
artifacts; the pack never posts, comments or sends DMs on Instagram.

Validate changes with `python3 -m unittest discover -s tests -v`. When Codex CLI
is available, run `python3 scripts/check_codex.py` to verify native skill and
plugin discovery in an isolated temporary installation. This check does not
call a model or require a login.

Keep `README.md`, `README.pt-BR.md`, both plugin manifests and the thirteen
`agents/openai.yaml` files consistent with the supported installation flow.
