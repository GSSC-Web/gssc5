import { Routes } from '@angular/router';
import { HomePage } from './pages/home/home';

// @relation(GSSC-MLLR-13, scope=range_start, role=Implementation)
export const routes: Routes = [
  { path: '', pathMatch: 'full', component: HomePage },
];
// @relation(GSSC-MLLR-13, scope=range_end, role=Implementation)
