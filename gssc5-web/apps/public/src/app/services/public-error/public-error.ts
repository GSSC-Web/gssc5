import { Injectable, computed, signal } from '@angular/core';

export type ApplicationErrorContents = {
  kind: 'application';
  name: string;
  description: string;
  referenceNumber: string;
  debuggingInformation?: string;
};

export type HttpErrorContents = {
  kind: 'http';
  code: string;
  name: string;
  description: string;
  requestInformation?: string;
  responseInformation?: string;
};

export type PublicErrorContents = ApplicationErrorContents | HttpErrorContents;

/**
 * Holds the current public error Contents for the Error Container.
 * Callers supply Contents; this ticket does not invent backend error APIs.
 */
@Injectable({ providedIn: 'root' })
export class PublicError {
  private readonly current = signal<PublicErrorContents | null>(null);

  readonly contents = this.current.asReadonly();
  readonly hasError = computed(() => this.current() !== null);

  setContents(contents: PublicErrorContents): void {
    this.current.set(contents);
  }

  clear(): void {
    this.current.set(null);
  }
}
