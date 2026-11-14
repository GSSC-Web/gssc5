import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AnnouncementsBar } from './modules/announcements-bar/announcements-bar';
import { ErrorContainer } from './modules/error/error';
import { Footer } from './modules/footer/footer';
import { Header } from './modules/header/header';
import { PromptOverlayView } from './modules/prompt-overlay/prompt-overlay';
import { UrgentAnnouncements } from './services/urgent-announcements';

@Component({
  imports: [RouterOutlet, AnnouncementsBar, ErrorContainer, Header, Footer, PromptOverlayView],
  selector: 'gssc-root',
  // @relation(GSSC-PLLR-20, GSSC-PLLR-21, scope=range_start, role=Implementation)
  host: {
    class: 'min-h-dvh bg-gssc-white text-gssc-black font-sans',
  },
  // @relation(GSSC-PLLR-20, GSSC-PLLR-21, scope=range_end, role=Implementation)
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
