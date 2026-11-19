import { Component, computed, input, model } from '@angular/core';

@Component({
  selector: 'gssc-form-text-field',
  templateUrl: './form-text-field.html',
})
export class FormTextField {
  /** Title Case floating label text. */
  readonly label = input.required<string>();
  readonly value = model<string>('');
  readonly inputType = input<'text' | 'email' | 'password' | 'tel'>('text');
  readonly required = input(false);
  readonly enabled = input(true);
  readonly controlId = input<string | null>(null);
  readonly autocomplete = input<string | null>(null);
  readonly name = input<string | null>(null);
  /** Host submit-time invalid mark (dark-red border + light-red background). */
  readonly invalid = input(false);

  readonly resolvedId = computed(
    () => this.controlId() ?? `gssc-form-text-${this.label().replace(/\s+/g, '-').toLowerCase()}`,
  );

  // @relation(GSSC-MLLR-168, scope=range_start, role=Implementation)
  protected onInput(next: string): void {
    this.value.set(next);
  }
  // @relation(GSSC-MLLR-168, scope=range_end, role=Implementation)
}
