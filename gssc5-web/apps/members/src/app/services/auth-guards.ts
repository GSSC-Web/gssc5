import { inject } from '@angular/core';
import {
  type CanActivateFn,
  type ActivatedRouteSnapshot,
  type RouterStateSnapshot,
  Router,
  type UrlTree,
} from '@angular/router';
import { MemberSession } from './member-session';

/** Query key carrying the Member Frontend path to open after login. */
export const RETURN_URL_QUERY = 'returnUrl';

/**
 * Resolve a safe in-app return path from the login query string.
 * Rejects absolute URLs and the login experience itself.
 */
export function resolveReturnUrl(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const value = raw.trim();
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  const pathOnly = value.split('?')[0]?.split('#')[0] ?? '';
  if (pathOnly === '/login') return null;
  return value;
}

function loginRedirect(router: Router, returnUrl: string): UrlTree {
  return router.createUrlTree(['/login'], {
    queryParams: { [RETURN_URL_QUERY]: returnUrl },
  });
}

function homeOrReturn(router: Router, route: ActivatedRouteSnapshot): UrlTree | string {
  const fromQuery = resolveReturnUrl(route.queryParamMap.get(RETURN_URL_QUERY));
  return fromQuery ?? '/';
}

/**
 * Protect Member Frontend contents: logged-out visitors go to login with the
 * attempted path in the query string.
 */
// @relation(GSSC-MLLR-92, scope=range_start, role=Implementation)
export const requireAuthGuard: CanActivateFn = async (
  _route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const session = inject(MemberSession);
  const router = inject(Router);
  await session.whenReady();
  if (session.loggedIn()) {
    return true;
  }
  const attempted = state.url || '/';
  const safe = resolveReturnUrl(attempted) ?? (attempted === '/login' ? null : attempted);
  if (safe && safe !== '/login') {
    return loginRedirect(router, safe);
  }
  return router.createUrlTree(['/login']);
};
// @relation(GSSC-MLLR-92, scope=range_end, role=Implementation)

/**
 * Login experience: already-authenticated members leave login for home or the
 * return path in the query string.
 */
// @relation(GSSC-MLLR-94, scope=range_start, role=Implementation)
export const redirectIfAuthenticatedGuard: CanActivateFn = async (
  route: ActivatedRouteSnapshot,
) => {
  const session = inject(MemberSession);
  const router = inject(Router);
  await session.whenReady();
  if (!session.loggedIn()) {
    return true;
  }
  const dest = homeOrReturn(router, route);
  return typeof dest === 'string' ? router.parseUrl(dest) : dest;
};
// @relation(GSSC-MLLR-94, scope=range_end, role=Implementation)
