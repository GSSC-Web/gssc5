import { Component, computed, input, model, output, signal } from '@angular/core';

@Component({
  selector: 'gssc-prompt-text-field',
  templateUrl: './text-field.html',
})
export class PromptTextField {
  readonly label = input.required<string>();
  readonly value = model<string>('');
  readonly inputType = input<'text' | 'email' | 'password'>('text');
  readonly multiline = input(false);
  readonly required = input(false);
  readonly enabled = input(true);
  readonly invalid = input(false);
  readonly peekable = input(false);

  readonly fieldSubmit = output<void>();
  readonly fieldEscape = output<void>();
  readonly fieldChange = output<void>();

  readonly peek = signal(false);
  readonly controlId = computed(() => `prompt-text-${this.label().replace(/\s+/g, '-').toLowerCase()}`);

  // @relation(GSSC-PLLR-116, scope=range_start, role=Implementation)
  readonly resolvedType = computed(() => {
    const type = this.inputType();
    if (type !== 'password') return type;
    if (this.peekable() && this.peek()) return 'text';
    return 'password';
  });

  protected onInput(value: string): void {
    this.value.set(value);
    this.fieldChange.emit();
  }

  protected onEnter(event: Event): void {
    if (this.multiline()) return;
    event.preventDefault();
    this.fieldSubmit.emit();
  }
  // @relation(GSSC-PLLR-116, scope=range_end, role=Implementation)
}
