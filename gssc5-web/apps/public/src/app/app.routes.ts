import { Routes } from '@angular/router';
import {
  CalendarPage,
  HomePage,
  LeadershipPage,
  MembershipPage,
} from './pages/page-stubs';
import { NewslettersPage } from './pages/newsletters/newsletters';
import { PublicationsPage } from './pages/publications/publications-page';
import { ResearchToolsPage } from './pages/research-tools/research-tools';

// @relation(GSSC-PLLR-8, GSSC-PLLR-9, GSSC-PLLR-10, GSSC-PLLR-11, GSSC-PLLR-12, GSSC-PLLR-13, GSSC-PLLR-14, scope=range_start, role=Implementation)
export const routes: Routes = [
  { path: '', pathMatch: 'full', component: HomePage },
  { path: 'membership', component: MembershipPage },
  { path: 'leadership', component: LeadershipPage },
  { path: 'calendar', component: CalendarPage },
  { path: 'publications', component: PublicationsPage },
  { path: 'research-tools', component: ResearchToolsPage },
  { path: 'newsletters', component: NewslettersPage },
];
// @relation(GSSC-PLLR-8, GSSC-PLLR-9, GSSC-PLLR-10, GSSC-PLLR-11, GSSC-PLLR-12, GSSC-PLLR-13, GSSC-PLLR-14, scope=range_end, role=Implementation)
