import { Injectable, signal } from '@angular/core';

export type UrgentAnnouncement = {
  id: string;
  title: string;
  text: string;
};

/** Holds urgent announcements for the Announcements Bar. Backend fetch is out of this ticket. */
@Injectable({ providedIn: 'root' })
export class UrgentAnnouncements {
  readonly announcements = signal<UrgentAnnouncement[]>([]);

  setAnnouncements(announcements: UrgentAnnouncement[]): void {
    this.announcements.set(announcements);
  }
}
