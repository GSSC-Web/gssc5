import { Routes } from '@angular/router';
import { AccountPage } from './pages/account/account';
import { AnnouncementsEditorPage } from './pages/announcements-editor/announcements-editor';
import { DirectoryPage } from './pages/directory/directory';
import { HomePage } from './pages/home/home';
import { LoginPage } from './pages/login/login';
import { PageSectionEditorPage } from './pages/page-section-editor/page-section-editor';
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
  {
    path: '',
    pathMatch: 'full',
    component: HomePage,
    canActivate: [requireAuthGuard],
  },
];
// @relation(GSSC-MLLR-13, scope=range_end, role=Implementation)
