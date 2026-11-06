import { Component } from "@angular/core";

import { nativeElement, setupPublicComponent, textContent } from "./test-harness";

@Component({
  selector: "gssc-harness-smoke",
  template: "<p class=\"smoke\">harness-ready</p>",
})
class HarnessSmoke {}

test("shared public harness mounts a component", async () => {
  const fixture = await setupPublicComponent(HarnessSmoke);
  expect(fixture.componentInstance).toBeTruthy();
  expect(textContent(nativeElement(fixture), ".smoke")).toBe("harness-ready");
});
