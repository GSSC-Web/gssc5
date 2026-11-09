import { TestBed } from '@angular/core/testing';
import { MemberSession } from '../../services/member-session';
import { PublicError } from '../../services/public-error/public-error';
import { nativeElement, setupPublicComponent } from '../../../test-harness';
import { ErrorContainer } from './error';

const sampleApplication = {
  kind: 'application' as const,
  name: 'Membership Sync Failed',
  description: 'The public frontend could not refresh membership data.',
  referenceNumber: 'GSSC-ERR-1001',
  debuggingInformation: 'stack: syncMembership',
};

const sampleHttp = {
  kind: 'http' as const,
  code: '503',
  name: 'Service Unavailable',
  description: 'The upstream service did not respond in time.',
  requestInformation: 'GET /api/status',
  responseInformation: 'HTTP/1.1 503',
};

async function setupError() {
  const fixture = await setupPublicComponent(ErrorContainer);
  const publicError = TestBed.inject(PublicError);
  const memberSession = TestBed.inject(MemberSession);
  const root = nativeElement(fixture);
  return { fixture, publicError, memberSession, root };
}

async function renderApplication(
  options: {
    administrator?: boolean;
    debuggingInformation?: string;
  } = {},
) {
  const ctx = await setupError();
  if (options.administrator) {
    ctx.memberSession.loggedIn.set(true);
    ctx.memberSession.isAdministrator.set(true);
  }
  ctx.publicError.setContents({
    ...sampleApplication,
    debuggingInformation: options.debuggingInformation ?? sampleApplication.debuggingInformation,
  });
  ctx.fixture.detectChanges();
  await ctx.fixture.whenStable();
  return ctx;
}

async function renderHttp(
  options: {
    administrator?: boolean;
    requestInformation?: string;
    responseInformation?: string;
  } = {},
) {
  const ctx = await setupError();
  if (options.administrator) {
    ctx.memberSession.loggedIn.set(true);
    ctx.memberSession.isAdministrator.set(true);
  }
  ctx.publicError.setContents({
    ...sampleHttp,
    requestInformation: options.requestInformation ?? sampleHttp.requestInformation,
    responseInformation: options.responseInformation ?? sampleHttp.responseInformation,
  });
  ctx.fixture.detectChanges();
  await ctx.fixture.whenStable();
  return ctx;
}

// @relation(GSSC-PLLR-95, scope=range_start, role=Test)
test('GSSC-PLLR-95 Semantic', async () => {
  const { fixture, publicError, root } = await setupError();
  expect(root.querySelector('.gssc-error')).toBeNull();

  publicError.setContents(sampleApplication);
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-error__application')).not.toBeNull();
  expect(root.querySelector('.gssc-error__http')).toBeNull();

  publicError.setContents(sampleHttp);
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-error__http')).not.toBeNull();
  expect(root.querySelector('.gssc-error__application')).toBeNull();

  publicError.clear();
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-error')).toBeNull();
});
// @relation(GSSC-PLLR-95, scope=range_end, role=Test)

// @relation(GSSC-PLLR-97, scope=range_start, role=Test)
test('GSSC-PLLR-97 Lexical', async () => {
  const { root } = await renderApplication();
  const container = root.querySelector<HTMLElement>('.gssc-error')!;
  expect(container.classList.contains('bg-gssc-cream')).toBe(true);
  expect(container.classList.contains('border-gssc-gray')).toBe(true);
});
// @relation(GSSC-PLLR-97, scope=range_end, role=Test)

// @relation(GSSC-PLLR-98, scope=range_start, role=Test)
test('GSSC-PLLR-98 Semantic', async () => {
  const { fixture, memberSession, root } = await renderApplication({ administrator: false });
  expect(root.querySelector('.gssc-error__application-name')!.textContent?.trim()).toBe(
    sampleApplication.name,
  );
  expect(root.querySelector('.gssc-error__application-description')!.textContent?.trim()).toBe(
    sampleApplication.description,
  );
  expect(root.querySelector('.gssc-error__application-reference')!.textContent?.trim()).toBe(
    sampleApplication.referenceNumber,
  );
  expect(root.querySelector('.gssc-error__application-debugging')).toBeNull();

  memberSession.loggedIn.set(true);
  memberSession.isAdministrator.set(true);
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-error__application-debugging')!.textContent?.trim()).toBe(
    sampleApplication.debuggingInformation,
  );
});
// @relation(GSSC-PLLR-98, scope=range_end, role=Test)

// @relation(GSSC-PLLR-99, scope=range_start, role=Test)
test('GSSC-PLLR-99 Syntactic', async () => {
  const { root } = await renderApplication({ administrator: true });
  const block = root.querySelector('.gssc-error__application')!;
  const children = [...block.children];
  expect(children[0]?.classList.contains('gssc-error__application-name')).toBe(true);
  expect(children[1]?.classList.contains('gssc-error__application-description')).toBe(true);
  expect(children[2]?.classList.contains('gssc-error__application-reference')).toBe(true);
  expect(children[3]?.classList.contains('gssc-error__application-debugging')).toBe(true);
});
// @relation(GSSC-PLLR-99, scope=range_end, role=Test)

// @relation(GSSC-PLLR-100, scope=range_start, role=Test)
test('GSSC-PLLR-100 Lexical', async () => {
  const { root } = await renderApplication({ administrator: true });
  const name = root.querySelector<HTMLElement>('.gssc-error__application-name')!;
  const description = root.querySelector<HTMLElement>('.gssc-error__application-description')!;
  const reference = root.querySelector<HTMLElement>('.gssc-error__application-reference')!;
  const debugging = root.querySelector<HTMLElement>('.gssc-error__application-debugging')!;
  expect(name.classList.contains('font-semibold')).toBe(true);
  expect(name.classList.contains('text-gssc-dark-green')).toBe(true);
  for (const field of [description, reference, debugging]) {
    expect(field.classList.contains('font-normal')).toBe(true);
    expect(field.classList.contains('text-gssc-dark-brown')).toBe(true);
  }
});
// @relation(GSSC-PLLR-100, scope=range_end, role=Test)

// @relation(GSSC-PLLR-101, scope=range_start, role=Test)
test('GSSC-PLLR-101 Semantic', async () => {
  const { fixture, memberSession, root } = await renderHttp({ administrator: false });
  expect(root.querySelector('.gssc-error__http-code')!.textContent?.trim()).toBe(sampleHttp.code);
  expect(root.querySelector('.gssc-error__http-name')!.textContent?.trim()).toBe(sampleHttp.name);
  expect(root.querySelector('.gssc-error__http-description')!.textContent?.trim()).toBe(
    sampleHttp.description,
  );
  expect(root.querySelector('.gssc-error__http-request')).toBeNull();
  expect(root.querySelector('.gssc-error__http-response')).toBeNull();

  memberSession.loggedIn.set(true);
  memberSession.isAdministrator.set(true);
  fixture.detectChanges();
  await fixture.whenStable();
  expect(root.querySelector('.gssc-error__http-request')!.textContent?.trim()).toBe(
    sampleHttp.requestInformation,
  );
  expect(root.querySelector('.gssc-error__http-response')!.textContent?.trim()).toBe(
    sampleHttp.responseInformation,
  );
});
// @relation(GSSC-PLLR-101, scope=range_end, role=Test)

// @relation(GSSC-PLLR-102, scope=range_start, role=Test)
test('GSSC-PLLR-102 Syntactic', async () => {
  const { root } = await renderHttp({ administrator: true });
  const block = root.querySelector('.gssc-error__http')!;
  const children = [...block.children];
  expect(children[0]?.classList.contains('gssc-error__http-code')).toBe(true);
  expect(children[1]?.classList.contains('gssc-error__http-name')).toBe(true);
  expect(children[2]?.classList.contains('gssc-error__http-description')).toBe(true);
  expect(children[3]?.classList.contains('gssc-error__http-request')).toBe(true);
  expect(children[4]?.classList.contains('gssc-error__http-response')).toBe(true);
});
// @relation(GSSC-PLLR-102, scope=range_end, role=Test)

// @relation(GSSC-PLLR-103, scope=range_start, role=Test)
test('GSSC-PLLR-103 Lexical', async () => {
  const { root } = await renderHttp({ administrator: true });
  const code = root.querySelector<HTMLElement>('.gssc-error__http-code')!;
  const name = root.querySelector<HTMLElement>('.gssc-error__http-name')!;
  const description = root.querySelector<HTMLElement>('.gssc-error__http-description')!;
  const request = root.querySelector<HTMLElement>('.gssc-error__http-request')!;
  const response = root.querySelector<HTMLElement>('.gssc-error__http-response')!;
  for (const field of [code, name]) {
    expect(field.classList.contains('font-semibold')).toBe(true);
    expect(field.classList.contains('text-gssc-dark-green')).toBe(true);
  }
  for (const field of [description, request, response]) {
    expect(field.classList.contains('font-normal')).toBe(true);
    expect(field.classList.contains('text-gssc-dark-brown')).toBe(true);
  }
});
// @relation(GSSC-PLLR-103, scope=range_end, role=Test)
