import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContactOverlay } from '../../services/contact-overlay/contact-overlay';
import { MemberSession } from '../../services/member-session';
import { MembersApp } from '../../services/members-app';

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
export class Header {
  private readonly memberSession = inject(MemberSession);
  private readonly membersApp = inject(MembersApp);
  private readonly contactOverlay = inject(ContactOverlay);

  /** Viewport/host width used for organization-name layout bands. */
  readonly layoutWidthPx = signal(
    typeof globalThis.innerWidth === 'number' ? globalThis.innerWidth : FULL_NAME_MIN_PX,
  );

  // @relation(GSSC-PLLR-52, GSSC-PLLR-53, scope=range_start, role=Implementation)
  readonly organizationNameMode = computed<OrganizationNameMode>(() => {
    const width = this.layoutWidthPx();
    if (width >= FULL_NAME_MIN_PX) return 'full';
    if (width >= ACRONYM_MIN_PX) return 'acronym';
    return 'omit';
  });
  // @relation(GSSC-PLLR-52, GSSC-PLLR-53, scope=range_end, role=Implementation)

  // @relation(GSSC-PLLR-55, GSSC-PLLR-56, GSSC-PLLR-58, GSSC-PLLR-59, GSSC-PLLR-61, GSSC-PLLR-62, GSSC-PLLR-64, GSSC-PLLR-65, scope=range_start, role=Implementation)
  readonly loggedIn = this.memberSession.loggedIn;
  // @relation(GSSC-PLLR-55, GSSC-PLLR-56, GSSC-PLLR-58, GSSC-PLLR-59, GSSC-PLLR-61, GSSC-PLLR-62, GSSC-PLLR-64, GSSC-PLLR-65, scope=range_end, role=Implementation)

  // @relation(GSSC-PLLR-70, scope=range_start, role=Implementation)
  readonly searchQuery = signal('');
  // @relation(GSSC-PLLR-70, scope=range_end, role=Implementation)

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
  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  protected onSearchSubmit(event: Event): void {
    event.preventDefault();
  }
  // @relation(GSSC-PLLR-70, scope=range_end, role=Implementation)
}
