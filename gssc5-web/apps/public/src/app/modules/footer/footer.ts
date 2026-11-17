import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContactOverlay } from '../../services/contact-overlay/contact-overlay';
import { SocietyContact } from '../../services/society-contact/society-contact';

@Component({
  selector: 'gssc-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
})
export class Footer implements OnInit {
  private readonly contactOverlay = inject(ContactOverlay);
  protected readonly societyContact = inject(SocietyContact);

  async ngOnInit(): Promise<void> {
    await this.societyContact.refresh();
  }

  // @relation(GSSC-PLLR-43, scope=range_start, role=Implementation)
  protected openContact(): void {
    this.contactOverlay.open();
  }
  // @relation(GSSC-PLLR-43, scope=range_end, role=Implementation)
}
