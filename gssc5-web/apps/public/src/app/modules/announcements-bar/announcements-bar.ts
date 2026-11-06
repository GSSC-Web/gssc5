import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UrgentAnnouncements, type UrgentAnnouncement } from '../../services/urgent-announcements';


@Component({
  selector: 'gssc-announcements-bar',
  templateUrl: './announcements-bar.html',
  styleUrl: './announcements-bar.css',
})
export class AnnouncementsBar {
  private readonly router = inject(Router);
  private readonly urgentAnnouncements = inject(UrgentAnnouncements);

  protected readonly announcements = this.urgentAnnouncements.announcements;

  // @relation(GSSC-PLLR-19, scope=range_start, role=Implementation)
  protected selectAnnouncement(announcement: UrgentAnnouncement): void {
    void this.router.navigate(['/'], {
      queryParams: { focusAnnouncement: announcement.id },
    });
  }
  // @relation(GSSC-PLLR-19, scope=range_end, role=Implementation)
}
