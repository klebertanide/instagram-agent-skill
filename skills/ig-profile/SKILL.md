---
name: ig-profile
description: >-
  Score an Instagram profile out of 100 against a 12-part rubric and rewrite
  the parts that lose points - name field, bio, link, highlights, pinned three,
  grid. Use when the user says "optimize my profile", "fix my bio", "score my
  Instagram", "why don't people follow me", or pastes their profile and asks how
  it reads.
---

# ig-profile

## Runtime (Codex and Claude)

- `SKILL_DIR` is the absolute directory of this loaded `SKILL.md`; resolve all
  scripts/resources there, never the working directory. Siblings use `../ig-human/`
  or `../ig-reel/`. Substitute real absolute paths for `$SKILL_DIR` and
  `$INSTAGRAM_DATA_DIR` before executing, or explicitly assign/quote those variables.
- Select the absolute data directory: explicit `INSTAGRAM_AGENT_HOME` > nearest
  existing `.instagram` in the user's project ancestry > `data_dir` from
  `instagram-config.json` beside this skill > `~/.agents/instagram` (Codex) or
  `~/.claude/instagram` (Claude). Create it for writes. Codex may read a missing
  state file from the matching `~/.claude/instagram/` file; always write selected dir.
- Cross-skill names mean follow their instructions, not execute shell/slash
  commands. Codex user prompts can invoke `$ig-reel`, for example.
- Use an available Python 3.10+ interpreter (`python3`, `python`, or `py -3`).
  If it is unavailable, explain the missing requirement; never invent tool scores.
- Read `voice.md` when present and use the user's language and supplied context;
  ask only for missing essentials.
  Requested local drafts/files need no repeated approval. The user publishes.
- Script language heuristics are English-focused. For other languages, preserve
  natural wording, review manually and explain score limits; do not chase English PASS.

Almost everybody optimises the wrong thing here. The profile is not a
storefront people browse. It is a **decision screen**, arrived at from one
reel, and it gets about three seconds to answer one question: is there more of
that here, and is it for me.

## Input

Use the supplied profile information. For missing items, ask the user to
paste or screenshot: the name field, handle, bio, link destination, highlight
names, pinned posts and first nine grid covers. A screenshot of the top of the
profile plus the first two grid rows is enough for a first pass. Mark unseen
rubric items unknown and report the observed score/coverage instead of making
up profile details or awarding a full score without evidence.

Do not log into Instagram on their behalf.

## Score it

Read `rubric.json` in this folder. Twelve items, 100 points, each with what
full marks looks like and how it usually fails. Score every item, show the
table, give the total. Be honest. Most profiles land in the 30s and 40s on the
first pass and a generous score is useless.

```
PROFILE SCORE  38/100

  name field       2/12   name only, no words anyone searches
  bio first line   3/12   three nouns and a coffee emoji
  pinned three     0/10   nothing pinned
  highlights       2/8    "Random", "Life", "2023"
  grid legibility  4/8    six of nine covers are a face mid-sentence
  ...
```

## Then rewrite, in this order

Fix in descending order of points lost. Do not rewrite everything at once, the
user has to actually go and change each of these.

**1. The name field (30 characters).** The bold line under the photo, not the
handle. This is the field Instagram search matches against, and most accounts
put a name in it and nothing else. Format that works:
`{Name} | {what you do, in searched words}`. Give three options.

**2. Bio line one.** Who this is for and what changes. Not a job title, not
adjectives, not a pipe-separated list of identities. The rest of the 150
characters carries one piece of proof or one plain offer.

**3. The pinned three.** Three slots, three different jobs: the best proof, the
clearest explanation of the offer, the best introduction to the person. This is
the highest-leverage fix on the whole profile and it takes four taps. An
unpinned grid shows whatever was posted last, which is a coin flip.

**4. Highlights.** Four to six, named for the questions a buyer asks: Pricing,
Results, How it works, About. Not "Random". Delete the rest.

**5. The link.** One destination that matches what the bio just promised. Five
are allowed; two is already a menu and a menu converts worse than a door.

**6. Grid covers.** The first nine at thumbnail size. Reel covers get chosen,
not left as whatever frame one was. Four words of text on a cover makes a grid
readable in one glance.

## Output

Score table, then the rewrites as copy-ready blocks in fix-first order, each
run through `ig-human`. Re-score at the end and show the delta honestly. If
the rewrite reaches 84 and not 98, say 84, and say what the rest needs, which
is usually a grid, a story habit and a pinned post that does not exist yet.
None of that is a rewrite.

Nothing is saved to Instagram by this skill. The user edits each field.
