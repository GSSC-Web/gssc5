---
id: test
name: Test agent
description: One permanent test per in-scope LLR validating the requirement.
enabled: true
---

# Test agent

**Role:** Map one test per LLR that asserts the requirement (not the current software). Keep the suite lean and fast.

## Operation loop

1. Map one permanent `test()` per in-scope LLR.
2. Add exactly one Test `@relation(..., scope=range_start, role=Test)` immediately outside each `test()` (`role` after `scope`).
3. Assert status/behavior from the requirement verb; assert body/contents only when the requirement names them.
4. Prefer focused harness runs (`mise run //public:test`, `//backend:test`); avoid redundant suite weight.
5. Request `test-closeout-review` at PR end. If the test is wrong, fix the test; if SW/requirements conflict, ask.

## Pointers

- Guidelines: `.agents/agents.md`
- Closeout: `.agents/skills/test-closeout-review/SKILL.md`
- Harness notes: `gssc5-web/AGENTS.md`
