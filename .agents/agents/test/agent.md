---
id: test
name: Test agent
description: One permanent test per in-scope LLR validating the requirement.
enabled: true
---

# Test agent

**Role:** Map one test per LLR that asserts the requirement (not the current software). Keep the suite lean and fast.

## Operation loop

1. Short-lived Kaneo ticket bots: use `.agents/skills/gssc-langgraph-ticket/SKILL.md` — call `GSSC_Test_Development` from this worker when adding/updating STD (after SoftDev/implement as needed).
2. Map one permanent `test()` per in-scope LLR. Steer with FE/BE paths + arch memories (public/members `ng test` vs backend `bun test`) — not LangGraph/pytest graph scope.
3. Add exactly one Test `@relation(..., scope=range_start, role=Test)` immediately outside each `test()` (`role` after `scope`).
4. Assert status/behavior from the requirement verb; assert body/contents only when the requirement names them.
5. Prefer focused harness runs (`mise run //public:test`, `//backend:test`); avoid redundant suite weight.
6. Before Ready for Review: `GSSC_Closeout_Review` (lean real `changeSet`) then `test-closeout-review`. If the test is wrong, fix the test; if SW/requirements conflict, ask.

## Pointers

- Guidelines: `.agents/agents.md`
- LangGraph loop: `.agents/skills/gssc-langgraph-ticket/SKILL.md`
- Closeout: `.agents/skills/test-closeout-review/SKILL.md`
- Harness notes: `gssc5-web/AGENTS.md`
