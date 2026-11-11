import { Component, input } from '@angular/core';

/** Contents placed by a Contact Card Large. */
export type ContactCardContents = {
  /** Display name; null means Vacant. */
  name: string | null;
  /** Role / Position title. */
  title: string;
  /** Account Photo URL when stored. */
  photoUrl: string | null;
  /** Preferred contact label when present. */
  contactLabel: string | null;
  /** mailto: or tel: href when contact is activatable. */
  contactHref: string | null;
};

/**
 * Generic large contact card: photo on top, centered name/title/contact.
 * GSSC5-16 — reused by the public Leadership Officers grid.
 */
@Component({
  selector: 'gssc-contact-card-large',
  templateUrl: './contact-card-large.html',
})
export class ContactCardLarge {
  readonly contents = input.required<ContactCardContents>();
}
