import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UrgentAnnouncements, type UrgentAnnouncement } from '../../services/urgent-announcements';


@Component({
  selector: 'gssc-announcements-bar',
  templateUrl: './announcements-bar.html',
})
export class AnnouncementsBar {
  private readonly router = inject(Router);
  private readonly urgentAnnouncements = inject(UrgentAnnouncements);

  // @relation(GSSC-PLLR-15, scope=range_start, role=Implementation)
  protected readonly announcements = this.urgentAnnouncements.announcements;

  protected selectAnnouncement(announcement: UrgentAnnouncement): void {
    void this.router.navigate(['/'], {
      queryParams: { focusAnnouncement: announcement.id },
    });
  }
  // @relation(GSSC-PLLR-15, scope=range_end, role=Implementation)
}
