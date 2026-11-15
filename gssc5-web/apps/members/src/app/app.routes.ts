import { Routes } from '@angular/router';
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
    path: '',
    pathMatch: 'full',
    component: HomePage,
    canActivate: [requireAuthGuard],
  },
];
// @relation(GSSC-MLLR-13, scope=range_end, role=Implementation)
