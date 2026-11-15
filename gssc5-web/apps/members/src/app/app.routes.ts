import { Routes } from '@angular/router';
import { AccountPage } from './pages/account/account';
import { HomePage } from './pages/home/home';
import { LoginPage } from './pages/login/login';
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
  {
    path: '',
    pathMatch: 'full',
    component: HomePage,
    canActivate: [requireAuthGuard],
  },
];
// @relation(GSSC-MLLR-13, scope=range_end, role=Implementation)
