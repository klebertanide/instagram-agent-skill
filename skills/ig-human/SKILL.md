---
name: ig-human
description: >-
  Strip the machine fingerprint out of any draft - em dashes, AI slop words,
  invisible watermark characters - and score it against a five-check detection
  panel before it goes out. Use whenever text needs to sound human, when the
  user says humanize, "does this sound like AI", "remove the em dashes",
  "de-slop this", "this sounds like ChatGPT", or before any caption, script,
  comment, reply or DM is shown to the user.
---

# ig-human

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

Two tools live in this folder and they both actually run. Use them. Do not
eyeball this.

```bash
python3 "$SKILL_DIR/humanize.py" "/absolute/path/draft.txt" --report        # clean it, show what changed
python3 "$SKILL_DIR/detect.py" "/absolute/path/draft.txt"                    # score it, five checks
python3 "$SKILL_DIR/detect.py" "/absolute/path/before.txt" "/absolute/path/after.txt"         # prove the delta
```

For non-English text, first review whether the automatic substitutions apply:
English words, contractions and structures do not establish human authorship.
Preserve meaningful Unicode joiners and punctuation used by the user's language;
do not accept automatic deletions that change words or meaning. Compare the
original and cleaned output and restore such characters when necessary.

Both read `slop.json`: 154 stock words and phrases with plain-English
replacements, 18 invisible character classes, 11 typographic substitutions and
16 structural tells. The last block of each list is Instagram-specific, the
vocabulary that only shows up in captions and voiceovers. It is meant to be
edited. If the user has a word they always use that the lexicon strips, take it
out of the file.

## Why this matters more on Instagram than it looks

Captions are short and scripts get said out loud. A written-sounding line in a
600-character caption is a larger share of the text than the same line in an
essay, and a voiceover that nobody could say naturally is obvious in the first
take. The tell here is not a detector flagging the post. The tell is a person
scrolling past something that reads like a brand, or a creator stumbling over
their own script.

## What gets fixed automatically

**1. Invisible characters.** Zero-width spaces and joiners, word joiners, soft
hyphens, byte-order marks, Unicode tag characters, invisible separators,
non-breaking and narrow spaces. Review what these characters mean before
removing them. `humanize.py` preserves zero-width joiners/non-joiners by default
because emoji and some writing systems need them; `--strip-joiners` is an
explicit opt-in only when their removal is appropriate. Other invisible format
characters are cleaned, so compare the output with the original.

**2. Typography.** Em dash to comma, en dash to hyphen, curly quotes to
straight, ellipsis to three dots, bullet character to hyphen. The em dash pass
is the one that matters: it collapses the dash to a comma and then cleans up
the double punctuation and orphaned periods that leaves behind.

**3. The slop lexicon.** delve, leverage, robust, seamless, crucial, testament
to, "in today's fast-paced world", plus the Instagram block: "stop scrolling",
"in today's video", "follow for more", "tag someone who needs this", "the
algorithm loves", "run don't walk". Each swapped for a plain word or deleted,
with capitalisation preserved and URLs left untouched.

## What does NOT get fixed automatically

Structural tells get **flagged, not rewritten**, because changing the shape of
a sentence needs judgement:

- "It's not just X, it's Y" and "not only X but also Y"
- Rule-of-three triads
- Rhetorical one-word question lines: "The result?"
- The video preamble: "in this video I'm going to show you"
- Emoji bullet lists
- Three or more shouted words in a row
- Hashtag walls
- Reflex bait: "follow for more", "tag someone who", "double tap if"

That list is your job. Review each flagged line by hand, keeping the meaning
and the user's voice, then re-run `detect.py` when it is useful. A flag can be
intentional; do not rewrite natural language solely to earn PASS.

## The five checks

`detect.py` scores five signals 0-100, higher is more human:

| check | what it measures | machine looks like |
| --- | --- | --- |
| BURSTINESS | sentence-length variation | every sentence the same length |
| SPECIFICITY | numbers, names, concrete markers per 100 words | abstract nouns, no figures |
| SLOP DENSITY | lexicon hits per 100 words | stock vocabulary |
| FINGERPRINT | invisible chars, em dashes, curly quotes per 1k chars | typographically perfect |
| VOICE | contractions, person, structural tells | no contractions, staged reveals |

The verdict weights the mean at 60% and the **weakest single check** at 40%.
PASS needs an overall of 70+ with no check below 55. These are the script's
thresholds, not evidence of whether a person or model wrote the text.

## Say this honestly

These are five local heuristics modelled on the signals public detectors key
on. They run entirely on the user's machine and nothing is uploaded. They are
**not** GPTZero, Originality, Copyleaks, Winston or Turnitin, they do not call
those APIs, and they cannot predict those verdicts or prove human authorship.
The lexicon and voice checks focus on English and are not calibrated against
other languages or commercial detectors. Describe scores as editing signals;
never claim the text is undetectable or that a score guarantees performance.

## Order of operations

1. `python3 "$SKILL_DIR/humanize.py" "/absolute/path/draft.txt" -o
   "/absolute/path/clean.txt" --report` (on one line).
2. Read the structural flags. Revise only when the change improves the writing.
3. `python3 "$SKILL_DIR/detect.py" "/absolute/path/draft.txt"
   "/absolute/path/clean.txt"` (on one line) to show the before and after.
4. If the verdict is not PASS, inspect the weakest check and revise only when
   it improves the draft. Stop when the writing is natural; explain heuristic
   limits for non-English text instead of chasing an English PASS. For drafts
   under 25 words, VOICE is fixed at 50, so PASS is impossible; use manual
   review. Limit revisions to two useful rounds instead of looping for a score.
5. Show the user the cleaned text and the score. Never the score alone.
