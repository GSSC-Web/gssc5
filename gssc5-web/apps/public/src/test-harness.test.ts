import { Component } from "@angular/core";

import { nativeElement, setupPublicComponent, textContent } from "./test-harness";

@Component({
  selector: "gssc-harness-smoke",
  template: "<p class=\"smoke\">harness-ready</p>",
})
class HarnessSmoke {}

// @relation(GSSC-PLLR-1, scope=range_start, role=Test)
test("GSSC-PLLR-1 Shared Test Harness", async () => {
  const fixture = await setupPublicComponent(HarnessSmoke);
  expect(textContent(nativeElement(fixture), ".smoke")).toBe("harness-ready");
});
// @relation(GSSC-PLLR-1, scope=range_end, role=Test)

// @relation(GSSC-PLLR-2, scope=range_start, role=Test)
test("GSSC-PLLR-2 One Test Per Low Level Requirement", async () => {
  const fixture = await setupPublicComponent(HarnessSmoke);
  expect(fixture.componentInstance).toBeTruthy();
});
// @relation(GSSC-PLLR-2, scope=range_end, role=Test)

// @relation(GSSC-PLLR-3, scope=range_start, role=Test)
test("GSSC-PLLR-3 Public Frontend Test Runner", async () => {
  const fixture = await setupPublicComponent(HarnessSmoke);
  expect(nativeElement(fixture).querySelector(".smoke")).not.toBeNull();
});
// @relation(GSSC-PLLR-3, scope=range_end, role=Test)
