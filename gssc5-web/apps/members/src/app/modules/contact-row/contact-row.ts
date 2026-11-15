import { Component, input } from '@angular/core';

/** One contact method shown in a Contact Row. */
export type ContactMethod = {
  /** Display text (email address, phone number, etc.). */
  label: string;
  /** Activatable destination when available (`mailto:`, `tel:`, or URL). */
  href?: string | null;
};

/** Contents placed by the Contact Row primitive. */
export type ContactRowContents = {
  displayName: string;
  methods: readonly ContactMethod[];
};

@Component({
  selector: 'gssc-contact-row',
  templateUrl: './contact-row.html',
})
export class ContactRow {
  /** Person name and available contact methods. */
  readonly contents = input.required<ContactRowContents>();

  protected hasHref(method: ContactMethod): boolean {
    return method.href != null && method.href.length > 0;
  }
}
