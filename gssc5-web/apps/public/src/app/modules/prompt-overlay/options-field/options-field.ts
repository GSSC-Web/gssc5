import { Component, computed, input, model, output } from '@angular/core';
import type { PromptChoice } from '../../../services/prompt-overlay/prompt-overlay';

@Component({
  selector: 'gssc-prompt-options-field',
  templateUrl: './options-field.html',
})
export class PromptOptionsField {
  readonly label = input.required<string>();
  readonly choices = input.required<PromptChoice[]>();
  readonly value = model<string>('');
  readonly required = input(false);
  readonly enabled = input(true);
  readonly invalid = input(false);
  readonly fieldChange = output<void>();
  readonly fieldSubmit = output<void>();
  readonly fieldEscape = output<void>();

  readonly groupName = computed(() => `prompt-options-${this.label().replace(/\s+/g, '-').toLowerCase()}`);

  // @relation(GSSC-PLLR-122, scope=range_start, role=Implementation)
  protected select(choice: string): void {
    if (!this.enabled()) return;
    this.value.set(choice);
    this.fieldChange.emit();
  }
  // @relation(GSSC-PLLR-122, scope=range_end, role=Implementation)
}
