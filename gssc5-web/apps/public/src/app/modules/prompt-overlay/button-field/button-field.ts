import { Component, input, output } from '@angular/core';

@Component({
  selector: 'gssc-prompt-button-field',
  templateUrl: './button-field.html',
})
export class PromptButtonField {
  readonly label = input.required<string>();
  readonly role = input<'submit' | 'action'>('action');
  readonly enabled = input(true);
  readonly invalid = input(false);
  readonly activate = output<void>();
  readonly fieldEscape = output<void>();

  // @relation(GSSC-PLLR-125, scope=range_start, role=Implementation)
  protected onActivate(): void {
    if (!this.enabled()) return;
    this.activate.emit();
  }
  // @relation(GSSC-PLLR-125, scope=range_end, role=Implementation)
}
