// Shared helpers for public frontend unit tests. Expected outcomes stay in the test files.
import {
  type EnvironmentProviders,
  type Provider,
  type Type,
} from "@angular/core";
import { type ComponentFixture, TestBed } from "@angular/core/testing";

export type PublicComponentSetupOptions = {
  imports?: Type<unknown>[];
  providers?: Array<Provider | EnvironmentProviders>;
};

export async function setupPublicComponent<T>(
  component: Type<T>,
  options: PublicComponentSetupOptions = {},
): Promise<ComponentFixture<T>> {
  await TestBed.configureTestingModule({
    imports: [component, ...(options.imports ?? [])],
    providers: options.providers ?? [],
  }).compileComponents();

  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

export function nativeElement(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

export function textContent(root: ParentNode, selector: string): string | null {
  return root.querySelector(selector)?.textContent?.trim() ?? null;
}
