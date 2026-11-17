import { Routes } from '@angular/router';
import { AccountPage } from './pages/account/account';
import { AnnouncementsEditorPage } from './pages/announcements-editor/announcements-editor';
import { DirectoryPage } from './pages/directory/directory';
import { EventsPage } from './pages/events/events';
import { HomePage } from './pages/home/home';
import { LoginPage } from './pages/login/login';
import { NewslettersPage } from './pages/newsletters/newsletters';
import { PageSectionEditorPage } from './pages/page-section-editor/page-section-editor';
import { PublicationsPage } from './pages/publications/publications';
import { ResearchToolsPage } from './pages/research-tools/research-tools';
import { SearchPage } from './pages/search/search';
import { SitemapPage } from './pages/sitemap/sitemap';
import {
  redirectIfAuthenticatedGuard,
  requireAuthGuard,
} from './services/auth-guards';

// @relation(GSSC-MLLR-13, scope=range_start, role=Implementation)
export const routes: Routes = [
  {
    path: 'login',
    pathMatch: 'full',
    component: LoginPage,
    canActivate: [redirectIfAuthenticatedGuard],
  },
  {
    path: 'account',
    pathMatch: 'full',
    component: AccountPage,
    canActivate: [requireAuthGuard],
  },
  {
    path: 'accounts/:cuid',
    component: AccountPage,
    canActivate: [requireAuthGuard],
  },
  // @relation(GSSC-MLLR-211, scope=range_start, role=Implementation)
  {
    path: 'directory',
    pathMatch: 'full',
    component: DirectoryPage,
    canActivate: [requireAuthGuard],
  },
  // @relation(GSSC-MLLR-211, scope=range_end, role=Implementation)
  // @relation(GSSC-MLLR-345, scope=range_start, role=Implementation)
  {
    path: 'events',
    pathMatch: 'full',
    component: EventsPage,
    canActivate: [requireAuthGuard],
  },
  // @relation(GSSC-MLLR-345, scope=range_end, role=Implementation)
  {
    path: 'page-sections',
    pathMatch: 'full',
    component: PageSectionEditorPage,
    canActivate: [requireAuthGuard],
  },
  {
    path: 'announcements',
    pathMatch: 'full',
    component: AnnouncementsEditorPage,
    canActivate: [requireAuthGuard],
  },
  // @relation(GSSC-MLLR-366, scope=range_start, role=Implementation)
  {
    path: 'newsletters',
    pathMatch: 'full',
    component: NewslettersPage,
    canActivate: [requireAuthGuard],
  },
  // @relation(GSSC-MLLR-366, scope=range_end, role=Implementation)
  {
    path: 'publications',
    pathMatch: 'full',
    component: PublicationsPage,
    canActivate: [requireAuthGuard],
  },
  {
    path: 'research-tools',
    pathMatch: 'full',
    component: ResearchToolsPage,
    canActivate: [requireAuthGuard],
  },
  // @relation(GSSC-MLLR-510, scope=range_start, role=Implementation)
  {
    path: 'sitemap',
    pathMatch: 'full',
    component: SitemapPage,
    canActivate: [requireAuthGuard],
  },
  // @relation(GSSC-MLLR-510, scope=range_end, role=Implementation)
  // @relation(GSSC-MLLR-483, scope=range_start, role=Implementation)
  {
    path: 'search',
    pathMatch: 'full',
    component: SearchPage,
    canActivate: [requireAuthGuard],
  },
  // @relation(GSSC-MLLR-483, scope=range_end, role=Implementation)
  {
    path: '',
    pathMatch: 'full',
    component: HomePage,
    canActivate: [requireAuthGuard],
  },
];
// @relation(GSSC-MLLR-13, scope=range_end, role=Implementation)
