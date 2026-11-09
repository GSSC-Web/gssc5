import {
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type {
  PromptFieldConfig,
  PromptValues,
} from '../../../services/prompt-overlay/prompt-overlay';
import { PromptButtonField } from '../button-field/button-field';
import { PromptFileField } from '../file-field/file-field';
import { PromptOptionsField } from '../options-field/options-field';
import { PromptOptionsListField } from '../options-list-field/options-list-field';
import { PromptSelectField } from '../select-field/select-field';
import { PromptTextField } from '../text-field/text-field';

@Component({
  selector: 'gssc-prompt-form',
  imports: [
    PromptTextField,
    PromptSelectField,
    PromptOptionsField,
    PromptButtonField,
    PromptFileField,
    PromptOptionsListField,
  ],
  templateUrl: './prompt-form.html',
})
export class PromptForm {
  readonly fields = input.required<PromptFieldConfig[]>();
  readonly submitted = output<PromptValues>();
  readonly cancelled = output<void>();

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly formEl = viewChild<ElementRef<HTMLFormElement>>('formEl');

  readonly values = signal<PromptValues>({});
  readonly invalidIds = signal<ReadonlySet<string>>(new Set());

  constructor() {
    effect(() => {
      const configs = this.fields();
      const next: PromptValues = {};
      for (const field of configs) {
        if (field.kind === 'button') continue;
        if (field.kind === 'select') next[field.id] = false;
        else if (field.kind === 'file') next[field.id] = null;
        else next[field.id] = '';
      }
      this.values.set(next);
      this.invalidIds.set(new Set());
      queueMicrotask(() => this.focusFirstControl());
    });
  }

  // @relation(GSSC-PLLR-113, scope=range_start, role=Implementation)
  protected setValue(id: string, value: unknown): void {
    this.values.update((current) => ({ ...current, [id]: value }));
    if (this.invalidIds().has(id)) {
      const next = new Set(this.invalidIds());
      next.delete(id);
      this.invalidIds.set(next);
    }
  }

  protected isInvalid(id: string): boolean {
    return this.invalidIds().has(id);
  }

  protected enabled(field: PromptFieldConfig): boolean {
    return field.enabled !== false;
  }

  protected stringValue(id: string): string {
    const value = this.values()[id];
    return typeof value === 'string' ? value : '';
  }

  protected boolValue(id: string): boolean {
    return this.values()[id] === true;
  }

  protected fileValue(id: string): File | null {
    const value = this.values()[id];
    return value instanceof File ? value : null;
  }

  protected onButton(role: 'submit' | 'action' | undefined): void {
    if (role === 'submit') this.onSubmit();
  }

  protected onSubmit(): void {
    const configs = this.fields();
    const current = this.values();
    const failed = new Set<string>();

    for (const field of configs) {
      if (field.kind === 'button') continue;
      if (!field.required) continue;
      const value = current[field.id];
      if (field.kind === 'select') {
        if (value !== true) failed.add(field.id);
        continue;
      }
      if (field.kind === 'file') {
        if (!(value instanceof File)) failed.add(field.id);
        continue;
      }
      if (typeof value !== 'string' || value.trim() === '') {
        failed.add(field.id);
        continue;
      }
      if (field.kind === 'text' && field.inputType === 'email') {
        const probe = document.createElement('input');
        probe.type = 'email';
        probe.value = value;
        if (!probe.checkValidity()) failed.add(field.id);
      }
    }

    this.invalidIds.set(failed);
    if (failed.size > 0) return;
    this.submitted.emit({ ...current });
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }

  private focusFirstControl(): void {
    const root: HTMLElement = this.formEl()?.nativeElement ?? this.host.nativeElement;
    const control = root.querySelector(
      'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])',
    ) as HTMLElement | null;
    control?.focus();
  }
  // @relation(GSSC-PLLR-113, scope=range_end, role=Implementation)
}
