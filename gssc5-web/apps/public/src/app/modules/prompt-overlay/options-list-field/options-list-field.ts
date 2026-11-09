import { Component, computed, input, model, output } from '@angular/core';
import type { PromptChoice } from '../../../services/prompt-overlay/prompt-overlay';

@Component({
  selector: 'gssc-prompt-options-list-field',
  templateUrl: './options-list-field.html',
})
export class PromptOptionsListField {
  readonly label = input.required<string>();
  readonly choices = input.required<PromptChoice[]>();
  readonly value = model<string>('');
  readonly required = input(false);
  readonly enabled = input(true);
  readonly invalid = input(false);
  readonly fieldChange = output<void>();
  readonly fieldSubmit = output<void>();
  readonly fieldEscape = output<void>();

  readonly controlId = computed(
    () => `prompt-options-list-${this.label().replace(/\s+/g, '-').toLowerCase()}`,
  );

  // @relation(GSSC-PLLR-131, scope=range_start, role=Implementation)
  protected onSelect(value: string): void {
    this.value.set(value);
    this.fieldChange.emit();
  }
  // @relation(GSSC-PLLR-131, scope=range_end, role=Implementation)
}
