# Weekly test optimize — 2026-11-25

Master tip `416e08b` (merge of #316). No application, requirement, or test files were changed. Counts: **created 14**, **refined 0**, **unchanged-skipped 1**.

## Phase A — suite vs requirements

1477 LLRs use verification method Test. 1460 UIDs have a single-UID Test `@relation`. 1549 `test()` calls in 115 files. No `getComputedStyle(` calls remain in tests.

Findings filed (Planned backlog, DoR Satisfied false, Fix Version Future):

| Ticket | Issue |
| --- | --- |
| GSSC5-174 | User soft-delete behaviors share one test (BLLR-460, 461, 462, 463, 466) |
| GSSC5-175 | Soft-deleted login and session share one test (BLLR-491, 492) |
| GSSC5-176 | Login token lifetime is split across two tests (BLLR-11) |
| GSSC5-177 | Newsletter upload test asserts a forbid the LLR omits (BLLR-494) |
| GSSC5-178 | Account photo overwrite LLR has two tests (BLLR-458) |
| GSSC5-179 | Copy to New tests skip the draft and collapse the triad (MLLR-757–759, 761–763) |
| GSSC5-180 | Page-data kind intro tests share two LLRs (MLLR-687, 690) |
| GSSC5-181 | Newsletter invalid-field tests share two LLRs (MLLR-706, 707) |
| GSSC5-182 | Directory name helper also claims the card layout LLR (MLLR-228, 768) |
| GSSC5-183 | Members site tree filter has three tests for one LLR (MLLR-562) |
| GSSC5-184 | Leadership lint test claims officers, directors, and chairs (PLLR-389, 162, 165, 231) |
| GSSC5-185 | StrictDoc `include_source_paths` omits members Test relations |

Combined `@relation` markers list several UIDs in one call, so a single-UID trace scan does not see them. About 80 other `test()` calls have no Test relation. They are harness helpers (query builders, session plumbing, schema smoke) and were not filed.

## Phase B — full suite

`mise test` on this tip:

| Target | Result |
| --- | --- |
| `//public:test` | 396 passed |
| `//members:test` | 657 passed |
| `//backend:test` | 500 passed, 0 failed |

Playwright (`gssc5-web/test`, 2 smokes) passed after the dev servers were already listening. `scripts/start-stack.sh` ran `bunx ng serve` on Bun 1.3.14's runtime (Node v24.3.0). Angular CLI 22.2.5 rejected that version and did not bootstrap either frontend. Filed as **GSSC5-186**. The same `bunx ng serve` succeeds when mise Node 22.23.5 is the `node` on PATH.

No product failure tickets. The suite itself was green.

## Phase C — ten pages

Seeded random sample (`Random(20261125)`) of public and members routes. Login as the dev admin on `http://127.0.0.1:4201/login` succeeded and returned to the members home (the loopback cookie host fix still holds).

| # | Page | Result |
| --- | --- | --- |
| 1 | Public home | Shell only. No announcements or sections in this database. |
| 2 | Members home | Login redirect, then shell only. |
| 3 | Members events | Catalog and create form. "No events yet." |
| 4 | Members newsletters | Empty catalog and new-newsletter form. Save stayed disabled. |
| 5 | Public sitemap | Nine links. |
| 6 | Public membership | Shell only. No `membership-info` sections in this database. |
| 7 | Members announcements | Empty catalog and idle copy. |
| 8 | Members directory | Filters and the admin card, with edit and soft-delete. |
| 9 | Public research tools | Shell only. An empty catalog omits the grid (requirements text). |
| 10 | Members page sections | Empty catalog and idle copy. |

This database had not had website KVS seed applied, so `GET /kvs/society.organizationName` (and acronym and phone) returned 404 and the header had no organization name. The footer copyright still uses its hardcoded fallback. That is environment, not a new defect. `mise run //backend:db:prepare` upserts those keys.

**GSSC5-187** (Enhancement): browser tab titles are the static strings "Public" and "Members" on every route.

**Unchanged-skipped:** GSSC5-171. Members search for `zzzqqq` still leaves the area under the form blank, which matches that open enhancement. No edit.

## Not refiled

The 2026-11-23 test-optimize defects that are already Done (section `getComputedStyle`, delete-control clicks, newsletter issue-file triad, SMTP extra tests, logout's second test, events time-filter select) were not opened again. `getComputedStyle(` is gone from the suite.
