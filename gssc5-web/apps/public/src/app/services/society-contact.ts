import { Injectable } from '@angular/core';

/** Public society contact fields shown in the Footer. No backend in this ticket. */
@Injectable({ providedIn: 'root' })
export class SocietyContact {
  readonly organizationName = 'Genealogical Society of Stanislaus County';
  readonly phoneNumber = '(209) 529-9430';
  readonly phoneDialHref = 'tel:+12095299430';
  readonly emailAddress = 'gsscfounded1968@gmail.com';
  readonly emailMailtoHref = 'mailto:gsscfounded1968@gmail.com';
  readonly postalAddress = 'P.O. Box 1352 Modesto, CA 95353-1352';
}
