import { Routes } from '@angular/router';
import { AccountPage } from './pages/account/account';
import { DirectoryPage } from './pages/directory/directory';
import { HomePage } from './pages/home/home';
import { LoginPage } from './pages/login/login';
import { NewslettersPage } from './pages/newsletters/newsletters';
import { PageDataEditorPage } from './pages/page-data-editor/page-data-editor';
import { PublicationsPage } from './pages/publications/publications';
import { ResearchToolsPage } from './pages/research-tools/research-tools';
import { SearchPage } from './pages/search/search';
import { SiteTreeEditorPage } from './pages/site-tree-editor/site-tree-editor';
import { TemplatesPage } from './pages/templates/templates';
import { KvsEditorPage } from './pages/kvs-editor/kvs-editor';
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
  // @relation(GSSC-MLLR-320, scope=range_start, role=Implementation)
  {
    path: 'page-data',
    pathMatch: 'full',
    redirectTo: 'page-sections',
  },
  // @relation(GSSC-MLLR-320, scope=range_end, role=Implementation)
  // @relation(GSSC-MLLR-345, GSSC-MLLR-319, scope=range_start, role=Implementation)
  {
    path: 'events',
    pathMatch: 'full',
    component: PageDataEditorPage,
    data: { kind: 'events' },
    canActivate: [requireAuthGuard],
  },
  // @relation(GSSC-MLLR-345, GSSC-MLLR-319, scope=range_end, role=Implementation)
  // @relation(GSSC-MLLR-317, scope=range_start, role=Implementation)
  {
    path: 'page-sections',
    pathMatch: 'full',
    component: PageDataEditorPage,
    data: { kind: 'sections' },
    canActivate: [requireAuthGuard],
  },
  // @relation(GSSC-MLLR-317, scope=range_end, role=Implementation)
  // @relation(GSSC-MLLR-318, scope=range_start, role=Implementation)
  {
    path: 'announcements',
    pathMatch: 'full',
    component: PageDataEditorPage,
    data: { kind: 'announcements' },
    canActivate: [requireAuthGuard],
  },
  // @relation(GSSC-MLLR-318, scope=range_end, role=Implementation)
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
  // @relation(GSSC-MLLR-558, scope=range_start, role=Implementation)
  {
    path: 'templates',
    pathMatch: 'full',
    component: TemplatesPage,
    canActivate: [requireAuthGuard],
  },
  // @relation(GSSC-MLLR-558, scope=range_end, role=Implementation)
  // @relation(GSSC-MLLR-729, scope=range_start, role=Implementation)
  {
    path: 'kvs',
    pathMatch: 'full',
    component: KvsEditorPage,
    canActivate: [requireAuthGuard],
  },
  // @relation(GSSC-MLLR-729, scope=range_end, role=Implementation)
  // @relation(GSSC-MLLR-510, scope=range_start, role=Implementation)
  {
    path: 'sitemap',
    pathMatch: 'full',
    component: SitemapPage,
    canActivate: [requireAuthGuard],
  },
  // @relation(GSSC-MLLR-510, scope=range_end, role=Implementation)
  // @relation(GSSC-MLLR-540, scope=range_start, role=Implementation)
  {
    path: 'site-trees',
    pathMatch: 'full',
    component: SiteTreeEditorPage,
    canActivate: [requireAuthGuard],
  },
  // @relation(GSSC-MLLR-540, scope=range_end, role=Implementation)
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
