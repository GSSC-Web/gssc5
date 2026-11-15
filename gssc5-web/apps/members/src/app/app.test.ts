import { App } from "./app";
import { nativeElement, setupMembersComponent, textContent } from "../test-harness";

// Baseline STD hook for the members testing harness (GSSC5-80).
// Feature LLR tests (GSSC5-79+) own @relation markers; do not test the harness itself.
test("members harness mounts App shell", async () => {
  const fixture = await setupMembersComponent(App);
  const root = nativeElement(fixture);
  expect(textContent(root, '[data-slot="header"]')).toContain("Members");
  expect(root.querySelector("router-outlet")).not.toBeNull();
});
