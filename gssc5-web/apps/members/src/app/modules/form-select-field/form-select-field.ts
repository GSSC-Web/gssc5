import { Component, computed, input, model } from '@angular/core';

export type FormSelectOption = {
  value: string;
  label: string;
};

@Component({
  selector: 'gssc-form-select-field',
  templateUrl: './form-select-field.html',
})
export class FormSelectField {
  /** Title Case floating label text. */
  readonly label = input.required<string>();
  readonly options = input.required<readonly FormSelectOption[]>();
  readonly value = model<string>('');
  readonly required = input(false);
  readonly enabled = input(true);
  readonly controlId = input<string | null>(null);
  readonly name = input<string | null>(null);

  readonly resolvedId = computed(
    () => this.controlId() ?? `gssc-form-select-${this.label().replace(/\s+/g, '-').toLowerCase()}`,
  );

  // @relation(GSSC-MLLR-171, scope=range_start, role=Implementation)
  protected onChange(next: string): void {
    this.value.set(next);
  }
  // @relation(GSSC-MLLR-171, scope=range_end, role=Implementation)
}
