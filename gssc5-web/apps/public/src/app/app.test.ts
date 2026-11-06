// Sample public-app smoke using the shared harness. GSSC5-38 and later feature
// tickets follow this pattern: one *.test.ts beside the source, harness helpers,
// and @relation markers outside each test().
import { App } from "./app";
import { nativeElement, setupPublicComponent, textContent } from "../test-harness";

test("public app root mounts through the shared harness", async () => {
  const fixture = await setupPublicComponent(App);
  expect(fixture.componentInstance).toBeTruthy();
  expect(textContent(nativeElement(fixture), "h1")).toContain("Hello, public");
});
