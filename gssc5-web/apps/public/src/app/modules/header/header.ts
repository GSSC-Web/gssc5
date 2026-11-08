import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContactOverlay } from '../../services/contact-overlay/contact-overlay';
import { MemberSession } from '../../services/member-session';
import { MembersApp } from '../../services/members-app';
import { SocietyContact } from '../../services/society-contact/society-contact';

/** Full name at ≥48rem; acronym at ≥30rem; omit below (logo remains). */
const FULL_NAME_MIN_PX = 48 * 16;
const ACRONYM_MIN_PX = 30 * 16;

export type OrganizationNameMode = 'full' | 'acronym' | 'omit';

@Component({
  selector: 'gssc-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit {
  private readonly memberSession = inject(MemberSession);
  private readonly membersApp = inject(MembersApp);
  private readonly contactOverlay = inject(ContactOverlay);
  protected readonly societyContact = inject(SocietyContact);

  readonly layoutWidthPx = signal(
    typeof globalThis.innerWidth === 'number' ? globalThis.innerWidth : FULL_NAME_MIN_PX,
  );

  // @relation(GSSC-PLLR-52, GSSC-PLLR-53, GSSC-PLLR-54, scope=range_start, role=Implementation)
  readonly organizationNameMode = computed<OrganizationNameMode>(() => {
    const width = this.layoutWidthPx();
    if (width >= FULL_NAME_MIN_PX) return 'full';
    if (width >= ACRONYM_MIN_PX) return 'acronym';
    return 'omit';
  });
  // @relation(GSSC-PLLR-52, GSSC-PLLR-53, GSSC-PLLR-54, scope=range_end, role=Implementation)

  // @relation(GSSC-PLLR-55, GSSC-PLLR-56, GSSC-PLLR-58, GSSC-PLLR-59, GSSC-PLLR-61, GSSC-PLLR-62, GSSC-PLLR-64, GSSC-PLLR-65, scope=range_start, role=Implementation)
  readonly loggedIn = this.memberSession.loggedIn;
  readonly displayName = this.memberSession.displayName;
  // @relation(GSSC-PLLR-55, GSSC-PLLR-56, GSSC-PLLR-58, GSSC-PLLR-59, GSSC-PLLR-61, GSSC-PLLR-62, GSSC-PLLR-64, GSSC-PLLR-65, scope=range_end, role=Implementation)

  // @relation(GSSC-PLLR-70, GSSC-PLLR-71, scope=range_start, role=Implementation)
  readonly searchOpen = signal(false);
  // @relation(GSSC-PLLR-70, GSSC-PLLR-71, scope=range_end, role=Implementation)

  async ngOnInit(): Promise<void> {
    await this.societyContact.refresh();
  }

  // @relation(GSSC-PLLR-55, GSSC-PLLR-58, scope=range_start, role=Implementation)
  protected openMembersApp(): void {
    this.membersApp.navigate();
  }
  // @relation(GSSC-PLLR-55, GSSC-PLLR-58, scope=range_end, role=Implementation)

  // @relation(GSSC-PLLR-64, scope=range_start, role=Implementation)
  protected async logout(): Promise<void> {
    await this.memberSession.logout();
  }
  // @relation(GSSC-PLLR-64, scope=range_end, role=Implementation)

  // @relation(GSSC-PLLR-67, scope=range_start, role=Implementation)
  protected openContact(): void {
    this.contactOverlay.open();
  }
  // @relation(GSSC-PLLR-67, scope=range_end, role=Implementation)

  // @relation(GSSC-PLLR-70, scope=range_start, role=Implementation)
  protected toggleSearch(): void {
    this.searchOpen.update((open) => !open);
  }

  protected closeSearch(): void {
    this.searchOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.searchOpen()) this.closeSearch();
  }
  // @relation(GSSC-PLLR-70, scope=range_end, role=Implementation)
}
