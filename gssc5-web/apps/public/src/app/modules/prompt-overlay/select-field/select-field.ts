import { Component, computed, input, model, output } from '@angular/core';

@Component({
  selector: 'gssc-prompt-select-field',
  templateUrl: './select-field.html',
})
export class PromptSelectField {
  readonly label = input.required<string>();
  readonly value = model<boolean>(false);
  readonly required = input(false);
  readonly enabled = input(true);
  readonly invalid = input(false);
  readonly fieldChange = output<void>();
  readonly fieldSubmit = output<void>();
  readonly fieldEscape = output<void>();

  readonly controlId = computed(() => `prompt-select-${this.label().replace(/\s+/g, '-').toLowerCase()}`);

  // @relation(GSSC-PLLR-119, scope=range_start, role=Implementation)
  protected toggle(): void {
    if (!this.enabled()) return;
    this.value.update((checked) => !checked);
    this.fieldChange.emit();
  }
  // @relation(GSSC-PLLR-119, scope=range_end, role=Implementation)
}
