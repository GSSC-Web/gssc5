import { Component, input } from '@angular/core';
import type { ContactCardContents } from '../contact-card-large/contact-card-large';

export type { ContactCardContents };

/**
 * Generic small contact card: photo left full height, text column on the right.
 * GSSC5-16 — reused by Directors at Large and Committee Chairs grids.
 */
@Component({
  selector: 'gssc-contact-card-small',
  templateUrl: './contact-card-small.html',
})
export class ContactCardSmall {
  readonly contents = input.required<ContactCardContents>();
}
