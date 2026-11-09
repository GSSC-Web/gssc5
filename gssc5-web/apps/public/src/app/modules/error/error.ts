import { Component, computed, inject } from '@angular/core';
import { MemberSession } from '../../services/member-session';
import {
  PublicError,
  type ApplicationErrorContents,
  type HttpErrorContents,
} from '../../services/public-error/public-error';

@Component({
  selector: 'gssc-error',
  templateUrl: './error.html',
})
export class ErrorContainer {
  private readonly publicError = inject(PublicError);
  private readonly memberSession = inject(MemberSession);

  protected readonly contents = this.publicError.contents;

  protected readonly applicationContents = computed(() => {
    const contents = this.contents();
    return contents?.kind === 'application' ? contents : null;
  });

  protected readonly httpContents = computed(() => {
    const contents = this.contents();
    return contents?.kind === 'http' ? contents : null;
  });

  protected showApplicationDebugging(contents: ApplicationErrorContents): boolean {
    return (
      this.memberSession.loggedIn() &&
      this.memberSession.isAdministrator() &&
      contents.debuggingInformation != null &&
      contents.debuggingInformation.length > 0
    );
  }

  protected showHttpAdministratorDetails(contents: HttpErrorContents): boolean {
    return (
      this.memberSession.loggedIn() &&
      this.memberSession.isAdministrator() &&
      ((contents.requestInformation != null && contents.requestInformation.length > 0) ||
        (contents.responseInformation != null && contents.responseInformation.length > 0))
    );
  }
}
