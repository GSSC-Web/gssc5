import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

/** One contact method shown in a Contact Row. */
export type ContactMethod = {
  /** Display text (email address, phone number, etc.). */
  label: string;
  /** Activatable destination when available (`mailto:`, `tel:`, or URL). */
  href?: string | null;
};

/** Contents placed by the Contact Row primitive. */
export type ContactRowContents = {
  displayName: string;
  /** Linted Position titles when the directory projects Position (GSSC5-135). */
  positions?: readonly string[];
  methods: readonly ContactMethod[];
};

@Component({
  selector: 'gssc-contact-row',
  imports: [RouterLink],
  templateUrl: './contact-row.html',
})
export class ContactRow {
  /** Person name and available contact methods. */
  readonly contents = input.required<ContactRowContents>();

  /**
   * When true, render the square photo (or silhouette) on the left for directory cards.
   * Leave false for the plain Contact Row used outside the directory card layout.
   */
  readonly showPhoto = input(false);
  /** Resolved account photo URL; null/empty shows the silhouette placeholder. */
  readonly photoUrl = input<string | null>(null);

  /** When true, show the Edit control linking to `editHref`. */
  readonly showEdit = input(false);
  /** Router path for Edit (e.g. `/accounts/:cuid`). */
  readonly editHref = input<string | null>(null);

  /** When true, show soft-delete / undelete (administrator). */
  readonly showSoftDelete = input(false);
  /** When true, the soft-delete control labels and emits undelete. */
  readonly isDeleted = input(false);

  readonly softDelete = output<void>();
  readonly undelete = output<void>();

  protected hasHref(method: ContactMethod): boolean {
    return method.href != null && method.href.length > 0;
  }

  protected cardLayout(): boolean {
    return this.showPhoto() || this.showEdit() || this.showSoftDelete();
  }

  protected hasPhotoImage(): boolean {
    const url = this.photoUrl()?.trim() ?? '';
    return url.length > 0;
  }

  protected onSoftDeleteClick(): void {
    if (this.isDeleted()) this.undelete.emit();
    else this.softDelete.emit();
  }
}
