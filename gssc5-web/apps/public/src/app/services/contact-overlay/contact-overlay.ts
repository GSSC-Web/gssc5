import { inject, Injectable, signal } from '@angular/core';
import {
  PromptOverlay,
  type PromptRequest,
} from '../prompt-overlay/prompt-overlay';

/** Contact Overlay form request queued on the Prompt Overlay (GSSC5-31). */
export function contactFormRequest(): PromptRequest {
  // @relation(GSSC-PLLR-156, scope=range_start, role=Implementation)
  // @relation(GSSC-PLLR-158, scope=range_start, role=Implementation)
  return {
    title: 'Contact',
    fields: [
      { kind: 'text', id: 'name', label: 'Name', required: true },
      {
        kind: 'text',
        id: 'email',
        label: 'Email',
        required: true,
        inputType: 'email',
      },
      {
        kind: 'options-list',
        id: 'reason',
        label: 'Contact reason',
        required: true,
        choices: [
          { value: 'general', label: 'General inquiry' },
          { value: 'membership', label: 'Membership' },
          { value: 'research', label: 'Research help' },
          { value: 'other', label: 'Other' },
        ],
      },
      {
        kind: 'text',
        id: 'content',
        label: 'Message',
        required: true,
        multiline: true,
      },
      { kind: 'button', id: 'submit', label: 'Submit', role: 'submit' },
    ],
  };
  // @relation(GSSC-PLLR-158, scope=range_end, role=Implementation)
  // @relation(GSSC-PLLR-156, scope=range_end, role=Implementation)
}

/**
 * Public Contact Overlay open hook (GSSC5-31).
 * Header and Footer Contact enqueue the contact form on the Prompt Overlay.
 */
@Injectable({ providedIn: 'root' })
export class ContactOverlay {
  private readonly promptOverlay = inject(PromptOverlay);
  readonly openCount = signal(0);

  // @relation(GSSC-PLLR-155, scope=range_start, role=Implementation)
  // @relation(GSSC-PLLR-157, scope=range_start, role=Implementation)
  open(): void {
    this.openCount.update((count) => count + 1);
    this.promptOverlay.enqueue(contactFormRequest());
  }
  // @relation(GSSC-PLLR-157, scope=range_end, role=Implementation)
  // @relation(GSSC-PLLR-155, scope=range_end, role=Implementation)
}
