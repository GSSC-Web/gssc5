import { Component, inject } from '@angular/core';
import { ContactOverlay } from '../../services/contact-overlay';
import { SocietyContact } from '../../services/society-contact';

@Component({
  selector: 'gssc-footer',
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  private readonly contactOverlay = inject(ContactOverlay);
  protected readonly societyContact = inject(SocietyContact);

  // @relation(GSSC-PLLR-43, scope=range_start, role=Implementation)
  protected openContact(): void {
    this.contactOverlay.open();
  }
  // @relation(GSSC-PLLR-43, scope=range_end, role=Implementation)
}
