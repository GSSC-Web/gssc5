import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MemberSession } from '../../services/member-session';
import { RETURN_URL_QUERY, resolveReturnUrl } from '../../services/auth-guards';

@Component({
  selector: 'gssc-login-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginPage {
  private readonly memberSession = inject(MemberSession);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  identity = '';
  password = '';
  readonly submitting = signal(false);
  readonly failureMessage = signal('');
  readonly identityInvalid = signal(false);
  readonly passwordInvalid = signal(false);

  // @relation(GSSC-MLLR-90, GSSC-MLLR-91, GSSC-MLLR-95, scope=range_start, role=Implementation)
  async onSubmit(): Promise<void> {
    if (this.submitting()) return;

    const identity = this.identity.trim();
    const password = this.password;
    const identityOk = identity.length > 0;
    const passwordOk = password.length > 0;
    this.identityInvalid.set(!identityOk);
    this.passwordInvalid.set(!passwordOk);
    this.failureMessage.set('');

    if (!identityOk || !passwordOk) {
      return;
    }

    this.submitting.set(true);
    try {
      const ok = await this.memberSession.login({ identity, password });
      if (!ok) {
        this.failureMessage.set('Login did not succeed.');
        return;
      }
      await this.router.navigateByUrl(this.postLoginDestination());
    } finally {
      this.submitting.set(false);
    }
  }
  // @relation(GSSC-MLLR-90, GSSC-MLLR-91, GSSC-MLLR-95, scope=range_end, role=Implementation)

  private postLoginDestination(): string {
    const raw = this.route.snapshot.queryParamMap.get(RETURN_URL_QUERY);
    return resolveReturnUrl(raw) ?? '/';
  }
}
