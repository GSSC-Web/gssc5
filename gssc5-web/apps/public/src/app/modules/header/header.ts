import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContactOverlay } from '../../services/contact-overlay/contact-overlay';
import { MemberSession } from '../../services/member-session';
import { MembersApp } from '../../services/members-app';
import { SocietyContact } from '../../services/society-contact/society-contact';

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

  readonly loggedIn = this.memberSession.loggedIn;
  readonly displayName = this.memberSession.displayName;
  readonly searchOpen = signal(false);

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
