# Health Coach Chat Import Plan — 2026-07-31

Status: feasibility and ingestion plan, not implemented.

## Question

Can Dylan import prior Health Hub/Kloc/Claude chats so a dedicated Health Coach agent starts with the foundation of everything already discussed?

## Short answer

Yes, if the chats can be exported or otherwise provided as files. But they should not all be pasted into the active coach prompt.

The right target is:

- raw archive preserved privately
- searchable/retrievable source material
- curated coaching memory distilled from the raw chats
- compact baseline docs the Health Coach loads by default

## Why not paste everything into the prompt?

Large chat dumps will be noisy, expensive, repetitive, and easy to misread. They also contain outdated decisions, corrected assumptions, dead ends, and casual context.

The coach needs the corrected, current foundation plus retrieval access to sources. It does not need every token live in context at all times.

## Ingestion pipeline

### 1. Collect exports

Possible sources:

- Claude project chat exports
- pasted transcripts
- markdown/text files
- screenshots only if no text export exists
- Health Hub docs and handoffs
- OpenClaw memory/session transcripts where available

Preferred formats:

- `.md`
- `.txt`
- `.json`
- `.html` if exported from a chat app and then converted

Avoid screenshots unless necessary, because they require OCR/vision and are harder to cite.

### 2. Store raw archive privately

Proposed location:

`docs/coach-system/imports/raw/`

But this folder should probably be gitignored if it contains personal/private chat exports.

Better durable structure:

```text
docs/coach-system/
  imports/
    README.md
    raw/              # private, ignored if sensitive
    extracted/        # cleaned text chunks, maybe ignored
    summaries/        # curated summaries safe to commit if Dylan approves
```

### 3. Normalize and chunk

For each chat:

- identify date/source if available
- remove boilerplate UI chrome
- preserve Dylan corrections and final decisions
- chunk by topic/date/session
- keep source references

### 4. Extract durable coaching facts

Summarize into these categories:

- current goals and block constraints
- training program decisions
- exercise removals/substitutions
- anchor-lift numbers and progression rules
- body-feel/injury history
- mobility prescriptions
- nutrition targets and protocols
- restaurant/fast food preferences
- Costco/Sam's/grocery patterns
- supplement rules and rejected ideas
- adherence failures and structures that died on contact with real life
- weekly adjustment rules
- Health Hub bugs/open items
- Dylan communication preferences
- corrections that supersede old assumptions

### 5. Produce curated artifacts

Recommended committed docs:

- `coach-baseline-profile.md`
- `coach-decision-log.md`
- `training-program-current.md`
- `injury-and-mobility-history.md`
- `nutrition-adherence-profile.md`
- `food-preferences-and-orders.md`
- `form-cue-library.md`
- `open-items.md`

These become the Health Coach's foundation.

### 6. Preserve retrieval access

The coach should be able to search the raw archive when uncertain, but default to curated docs.

Retrieval rule:

1. Current direct Dylan instruction wins.
2. Current coach baseline docs.
3. Decision log/corrections.
4. Raw chats for evidence/backstory.
5. Generic fitness knowledge last.

## Privacy and safety

- Do not commit raw private chat exports unless Dylan explicitly approves.
- Do not expose tokens, credentials, personal identifiers, or unrelated private conversations.
- If using screenshots, store them privately and summarize only what matters.
- Keep source citations so bad summaries can be corrected.

## Practical starting point

Minimum viable import:

1. Save the current Claude project instructions as `coach-baseline-profile.md`.
2. Export the biggest Health Hub/Kloc chats into raw files.
3. Run one summarization pass per chat.
4. Merge summaries into a decision log and current baseline.
5. Have Dylan review only the compact baseline, not the raw archive.

## Open questions

- Where exactly are the Kloc/Claude chats accessible from?
- Can Dylan export them as text/markdown/json?
- Should raw imports live outside git entirely, or in a gitignored folder under the repo?
- Which parts are safe to commit to the Health Hub repo?
- Should the dedicated Health Coach use OpenClaw session memory, repo docs, or both as its primary context source?
