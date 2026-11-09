import { Component, computed, input, model, output } from '@angular/core';

@Component({
  selector: 'gssc-prompt-file-field',
  templateUrl: './file-field.html',
})
export class PromptFileField {
  readonly label = input.required<string>();
  readonly value = model<File | null>(null);
  readonly required = input(false);
  readonly enabled = input(true);
  readonly invalid = input(false);
  readonly accept = input<string | undefined>(undefined);
  readonly fieldChange = output<void>();
  readonly fieldSubmit = output<void>();
  readonly fieldEscape = output<void>();

  readonly controlId = computed(() => `prompt-file-${this.label().replace(/\s+/g, '-').toLowerCase()}`);

  // @relation(GSSC-PLLR-128, scope=range_start, role=Implementation)
  protected onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.value.set(file);
    this.fieldChange.emit();
  }
  // @relation(GSSC-PLLR-128, scope=range_end, role=Implementation)
}
