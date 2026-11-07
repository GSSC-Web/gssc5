import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AnnouncementsBar } from './modules/announcements-bar/announcements-bar';
import { UrgentAnnouncements } from './services/urgent-announcements';

@Component({
  imports: [RouterOutlet, AnnouncementsBar],
  selector: 'gssc-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  private readonly urgentAnnouncements = inject(UrgentAnnouncements);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  private readonly isHome = computed(() => {
    const path = this.url().split('?')[0] ?? '';
    return path === '/' || path === '';
  });

  // @relation(GSSC-PLLR-16, scope=range_start, role=Implementation)
  protected readonly showAnnouncementsBar = computed(
    () => !this.isHome() && this.urgentAnnouncements.announcements().length > 0,
  );
  // @relation(GSSC-PLLR-16, scope=range_end, role=Implementation)
}
