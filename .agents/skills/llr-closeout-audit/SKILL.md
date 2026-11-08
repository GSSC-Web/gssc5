---
name: llr-closeout-audit
description: >-
  Run an LLR Closeout Audit for a Kaneo/GSSC task before merge: scope in-ticket
  LLRs, verify parent XOR derived, Implementation/Test @relation (one each),
  SW and tests match requirements, then PASS (Approve) or FAIL (UID + proposed
  fix). Use when the owner says LLR Closeout Audit or equivalent at task end.
---

# LLR Closeout Audit

**When:** Owner says “LLR Closeout Audit” (or equivalent) at the end of a Kaneo/GSSC task before merge.

**Result:** **PASS** with in-scope LLRs marked `REVIEW_STATUS: Approved`, or **FAIL** with issues (`UID` + proposed fix). No silent non-trivial requirement rewrites.

**Prefs:** `/cursor/stores/self/preferences.md` and `docs/imported-preferences.md`. **AGENTS.md** wins on conflict.

**Example deliverable style:** `/cursor/stores/self/docs/gssc5-23-llr-closeout-audit.md`

## Inputs

- Kaneo ticket id (e.g. GSSC5-22)
- PR URL / branch tip SHA (audit the tip under review)
- Explicit scope notes (deferrals, out-of-scope siblings)

## Steps

1. **Scope**
   - Include LLRs with this task’s `CHANGE_DRIVER` (and any service LLRs **this PR owns** that the feature depends on).
   - Exclude unrelated drive-by edits unless the owner includes them.
   - Exclude deferred backlog tickets (placeholders may remain in Comments) unless they already have in-scope Approved LLRs the owner named.

2. **Parent XOR derived**
   - Each LLR has a **Parent** that actually requires the behavior, **or** is `DERIVED: True` with a rationale and **no** parent.
   - Prefer parent links over derived (`docs/AGENTS.md`).

3. **Traceability**
   - Exactly **one** Implementation `@relation(..., scope=range_start, role=Implementation)` per in-scope UID (template **or** class method — Footer Contact pattern: Semantic open-hook in `.ts`, Syntactic/Lexical in template).
   - Exactly **one** Test `@relation(..., scope=range_start, role=Test)` per UID; one `test()` per LLR.
   - `role` after `scope`. Markers immediately outside each `test()`.

4. **SW vs requirement**
   - Software realizes the SHALL. Status/behavior from the verb; assert body/contents only when the requirement names them.
   - LLRs stay **implementation-agnostic** (e.g. “small and above”); SW may use adopted third parties (Tailwind, Nerd Fonts, etc.).

5. **Test vs requirement**
   - The test validates the requirement (not the harness).
   - Public FE Lexical appearance: assert theme/utility **classes**, not `getComputedStyle` (jsdom does not reliably apply `@layer utilities`). Avoid weak `/rgb/i` fallbacks.

6. **Closeout fixes**
   - **Allowed without waiting:** trace gaps (missing/duplicate `@relation`), trivial wording, weak tests that do not change requirement intent.
   - **Not allowed silently:** non-trivial statement/rationale/scope changes. Propose `UID` + exact text; wait.

7. **Verdict**
   - **PASS:** set in-scope `REVIEW_STATUS` to `Approved`; run the relevant test task (`mise run //public:test` / `//backend:test` / `//:test` as appropriate); `mise run //:export` if `.sdoc` changed; commit/push to the task PR if needed.
   - **FAIL:** do **not** Approve; list each blocking `UID` with a concrete proposed fix; wait.

8. **ALM / next work**
   - Keep GitHub issue + Kaneo links current; do **not** start the next ticket until merge or owner feedback.
   - Approving LLRs ≠ Kaneo **Done**. Done only on merge to the landing target (**master** for final) with Fix Version set.

## Deliverable

Write `/cursor/stores/self/docs/gssc5-<n>-llr-closeout-audit.md` (or Project Agent Store `docs/` if directed), matching Footer audit structure:

- Scope (UID ranges, tip SHA, PR)
- Summary: **PASS** or **FAIL**
- Checks table (Parent XOR derived; Implementation; Test; SW; Test vs req)
- Approved UIDs **or** issue list (`UID` + proposed fix)
- Non-blocking notes
- Test count

## Return to owner

PASS/FAIL summary, tip SHA, Approved UIDs or issue list, test count, audit file path.
