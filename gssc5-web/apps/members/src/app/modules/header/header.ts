import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MemberSession } from '../../services/member-session';

@Component({
  selector: 'gssc-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  private readonly memberSession = inject(MemberSession);

  readonly loggedIn = this.memberSession.loggedIn;
  readonly displayName = this.memberSession.displayName;

  /** Session end Implementation owned by MemberSession.logout (GSSC-MLLR-26). */
  protected async logout(): Promise<void> {
    await this.memberSession.logout();
  }
}
