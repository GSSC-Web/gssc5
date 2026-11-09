import { computed, Injectable, signal } from '@angular/core';

export type PromptChoice = { value: string; label: string };

export type PromptFieldConfig =
  | {
      kind: 'text';
      id: string;
      label: string;
      required?: boolean;
      enabled?: boolean;
      inputType?: 'text' | 'email' | 'password';
      multiline?: boolean;
      peek?: boolean;
    }
  | {
      kind: 'select';
      id: string;
      label: string;
      required?: boolean;
      enabled?: boolean;
    }
  | {
      kind: 'options';
      id: string;
      label: string;
      choices: PromptChoice[];
      required?: boolean;
      enabled?: boolean;
    }
  | {
      kind: 'button';
      id: string;
      label: string;
      role?: 'submit' | 'action';
      enabled?: boolean;
    }
  | {
      kind: 'file';
      id: string;
      label: string;
      required?: boolean;
      enabled?: boolean;
      accept?: string;
    }
  | {
      kind: 'options-list';
      id: string;
      label: string;
      choices: PromptChoice[];
      required?: boolean;
      enabled?: boolean;
    };

export type PromptValues = Record<string, unknown>;

/** A queued prompt form. Successful submit always advances the queue. */
export type PromptRequest = {
  title: string;
  fields: PromptFieldConfig[];
  onSubmit?: (values: PromptValues) => void;
  onCancel?: () => void;
};

/**
 * Queue of prompt form requests for the Public Prompt Overlay (GSSC5-27).
 */
@Injectable({ providedIn: 'root' })
export class PromptOverlay {
  private readonly queue = signal<PromptRequest[]>([]);

  // @relation(GSSC-PLLR-107, scope=range_start, role=Implementation)
  readonly current = computed(() => this.queue()[0] ?? null);
  readonly isOpen = computed(() => this.current() !== null);

  enqueue(request: PromptRequest): void {
    this.queue.update((items) => [...items, request]);
  }

  /** Remove the current prompt and show the next, if any. */
  complete(): void {
    this.queue.update((items) => items.slice(1));
  }

  /** After the form validates, invoke `onSubmit` and advance the queue. */
  submit(values: PromptValues): void {
    const current = this.current();
    if (!current) return;
    current.onSubmit?.(values);
    this.complete();
  }

  /** Cancel the current prompt (Dismiss / Escape). */
  cancel(): void {
    const current = this.current();
    if (!current) return;
    current.onCancel?.();
    this.complete();
  }
  // @relation(GSSC-PLLR-107, scope=range_end, role=Implementation)

  /** @deprecated Prefer enqueue / cancel; kept for transitional call sites. */
  open(): void {
    if (!this.isOpen()) {
      this.enqueue({ title: '', fields: [] });
    }
  }

  /** @deprecated Prefer cancel. */
  close(): void {
    while (this.isOpen()) this.cancel();
  }
}

/** Software-only contact form PoC (no LLR / no tests). Submit closes with no backend. */
export function contactPromptRequest(): PromptRequest {
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
}
