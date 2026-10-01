---
name: ig-comment
description: >-
  Write comments on other people's Instagram posts and reels that read as a
  person with an opinion, not a bot. Use when the user pastes a post or a reel
  and wants a comment, says "comment on this", "engage with this", "what do I
  say here", or wants a batch for their daily engagement round.
---

# ig-comment

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

Commenting is the highest-leverage twenty minutes on Instagram and the easiest
to do badly. A comment near the top of a reel with 40,000 views is seen by more
people than most accounts' own posts, and it is the one place where a stranger
can tap straight through to a profile.

A generic comment is worse than none. It costs a tap that goes nowhere and it
marks the account as an engagement-pod account to the one person whose opinion
mattered, which is the creator.

## Input

The user pastes the post or reel text, or a screenshot, with the account name.
If they give a URL you cannot open, ask them to paste it. Do not use a browser
tool to scrape the feed and do not post anything.

## The nine comment types

Pick by what the post actually is. Never default to type 1.

| # | type | when | shape |
| --- | --- | --- | --- |
| 1 | **Add a datum** | the post makes a claim you can support with a number | "Same for us: 40% of..." |
| 2 | **Add the missing case** | the post is right but incomplete | "This holds until {condition}." |
| 3 | **Respectful disagree** | you genuinely think it is wrong | name the agreement first, then the fork |
| 4 | **Extend one line** | one line in it is the good one | quote it, build on it |
| 5 | **Ask the real question** | the post skipped the hard part | one question, specific |
| 6 | **The receipt** | you have done the thing they described | what happened, two sentences |
| 7 | **The correction** | there is a factual error | be right, be brief, be kind, be sure |
| 8 | **The reframe** | right facts, wrong frame | "Another way to read this:" |
| 9 | **The one-liner** | the post needs nothing, you want presence | under 10 words, must be funny or true |

## Rules

- **One to three sentences.** Instagram comments are read in a narrow column
  under a video. A paragraph gets collapsed behind "more" and nobody taps it.
- **Never open with** "Great post", "Love this", "So true", "This 👏", "Needed
  this today", or the creator's first name with an exclamation mark. All of
  them are invisible.
- **No emoji-only comments** and no emoji as the first character.
- **Never restate the reel.** Everybody watching just watched it.
- **One idea.** A comment with two points reads as a hijack.
- **Say the specific thing.** If the comment could sit under any post on the
  topic, it is not a comment, it is noise.
- **No pitching, ever.** Not the offer, not the link, not "check out my page".
  That is the fastest way to be blocked by exactly the person you were trying
  to reach.
- **Early matters more here than anywhere.** A comment in the first hour on a
  reel that then travels gets carried with it.

## Output

Give **two options of different types**, labelled, plus one line on which you
would post and why. Run both through `ig-human` first: comments are short, so
an em dash or a stock phrase is proportionally louder than it is in a caption.

```
COMMENT OPTIONS  (on @acct's reel about pricing)

[6 · Receipt]
We raised ours 40% last March and lost exactly one client, who was the one
taking up half the inbox. Took eight months to stop being scared of it.

[3 · Respectful disagree]
Agree on the anchoring. The part I would push back on is doing it mid-project.
We tried that and it cost us a renewal that was otherwise fine.

Post the first. It concedes something and it has a number in it.
```

## Batch mode

For an engagement round, use the provided posts, asking for missing post
content in one message if necessary. Return one comment each in a single block.
If maintaining `$INSTAGRAM_DATA_DIR/log.md`, label prepared comments `draft`.
Record `posted` and who was commented on only after the user confirms they
posted it. Drafts do not establish engagement history. Commenting on the same
three accounts every day is visible and it looks like exactly what it is.

## Never

Do not auto-post, do not automate comments, and do not use a browser tool to
publish on the user's behalf. Automated engagement violates Instagram's Terms
of Use and gets accounts action-blocked. This skill writes the comment. The
user posts it.
