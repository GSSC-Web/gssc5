import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandingAssets } from '../../services/branding-assets/branding-assets';
import { ContactOverlay } from '../../services/contact-overlay/contact-overlay';
import { MembersApp } from '../../services/members-app';
import { SocietyContact } from '../../services/society-contact/society-contact';

@Component({
  selector: 'gssc-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
})
export class Footer implements OnInit {
  private readonly contactOverlay = inject(ContactOverlay);
  private readonly membersApp = inject(MembersApp);
  protected readonly societyContact = inject(SocietyContact);
  protected readonly brandingAssets = inject(BrandingAssets);

  protected readonly copyrightStatement = computed(() => {
    const name = this.societyContact.organizationName().trim();
    const label = name || 'Genealogical Society of Stanislaus County';
    return `© ${new Date().getFullYear()} ${label}. All Rights Reserved.`;
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.societyContact.refresh(), this.brandingAssets.refresh()]);
  }

  // @relation(GSSC-PLLR-43, scope=range_start, role=Implementation)
  protected openContact(): void {
    this.contactOverlay.open();
  }
  // @relation(GSSC-PLLR-43, scope=range_end, role=Implementation)

  // @relation(GSSC-PLLR-379, scope=range_start, role=Implementation)
  protected openMembersApp(): void {
    this.membersApp.navigate();
  }
  // @relation(GSSC-PLLR-379, scope=range_end, role=Implementation)
}
