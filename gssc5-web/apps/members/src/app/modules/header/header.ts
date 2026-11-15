import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MemberSession } from '../../services/member-session';

@Component({
  selector: 'gssc-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  private readonly memberSession = inject(MemberSession);
  private readonly router = inject(Router);

  readonly loggedIn = this.memberSession.loggedIn;
  readonly displayName = this.memberSession.displayName;

  /**
   * Session end Implementation owned by MemberSession.logout (GSSC-MLLR-26).
   * Explicit Header logout navigates to login without a return-path query
   * (GSSC-MLLR-93).
   */
  // @relation(GSSC-MLLR-93, scope=range_start, role=Implementation)
  protected async logout(): Promise<void> {
    const ended = await this.memberSession.logout();
    if (ended) {
      await this.router.navigateByUrl('/login');
    }
  }
  // @relation(GSSC-MLLR-93, scope=range_end, role=Implementation)
}
