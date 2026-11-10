import { Component, computed, effect, ElementRef, inject, viewChild } from '@angular/core';
import { MemberSession } from '../../services/member-session';
import {
  PublicError,
  type ApplicationErrorContents,
  type HttpErrorContents,
} from '../../services/public-error/public-error';

@Component({
  selector: 'gssc-error',
  templateUrl: './error.html',
  host: { class: 'contents' },
})
export class ErrorContainer {
  private readonly publicError = inject(PublicError);
  private readonly memberSession = inject(MemberSession);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('errorPanel');

  private previousFocus: HTMLElement | null = null;

  protected readonly contents = this.publicError.contents;

  protected readonly applicationContents = computed(() => {
    const contents = this.contents();
    return contents?.kind === 'application' ? contents : null;
  });

  protected readonly httpContents = computed(() => {
    const contents = this.contents();
    return contents?.kind === 'http' ? contents : null;
  });

  constructor() {
    effect(() => {
      if (this.contents()) {
        this.captureFocusAndFocusPanel();
      }
    });
  }

  protected showApplicationDebugging(contents: ApplicationErrorContents): boolean {
    return (
      this.memberSession.loggedIn() &&
      this.memberSession.isAdministrator() &&
      contents.debuggingInformation != null &&
      contents.debuggingInformation.length > 0
    );
  }

  protected showHttpRequest(contents: HttpErrorContents): boolean {
    return (
      this.memberSession.loggedIn() &&
      this.memberSession.isAdministrator() &&
      contents.requestInformation != null &&
      contents.requestInformation.length > 0
    );
  }

  protected showHttpResponse(contents: HttpErrorContents): boolean {
    return (
      this.memberSession.loggedIn() &&
      this.memberSession.isAdministrator() &&
      contents.responseInformation != null &&
      contents.responseInformation.length > 0
    );
  }

  // @relation(GSSC-PLLR-146, GSSC-PLLR-149, scope=range_start, role=Implementation)
  protected dismiss(): void {
    this.publicError.clear();
    this.restoreFocus();
  }
  // @relation(GSSC-PLLR-146, GSSC-PLLR-149, scope=range_end, role=Implementation)

  // @relation(GSSC-PLLR-147, scope=range_start, role=Implementation)
  protected onPanelEscape(event: Event): void {
    event.preventDefault();
    this.dismiss();
  }

  private captureFocusAndFocusPanel(): void {
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      this.previousFocus = active;
    }
    queueMicrotask(() => {
      this.panel()?.nativeElement.focus();
    });
  }

  private restoreFocus(): void {
    const target = this.previousFocus;
    this.previousFocus = null;
    queueMicrotask(() => {
      target?.focus();
    });
  }
  // @relation(GSSC-PLLR-147, scope=range_end, role=Implementation)
}
