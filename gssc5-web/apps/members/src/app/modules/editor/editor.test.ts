import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { nativeElement, textContent } from '../../../test-harness';
import { EditorSession } from '../../services/editor-session/editor-session';
import { FormSelectField } from '../form-select-field/form-select-field';
import { FormTextField } from '../form-text-field/form-text-field';
import { Editor } from './editor';

@Component({
  imports: [Editor, FormTextField, FormSelectField],
  template: `
    <gssc-editor
      [resourceId]="resourceId()"
      [permitted]="permitted()"
      [title]="title()"
      (saved)="savedCount.set(savedCount() + 1)"
      (cancelled)="cancelledCount.set(cancelledCount() + 1)"
    >
      <gssc-form-text-field label="Header" [(value)]="header" [enabled]="permitted()" />
      <gssc-form-select-field
        label="Image Position"
        [options]="positionOptions"
        [(value)]="imagePosition"
        [enabled]="permitted()"
      />
    </gssc-editor>
  `,
})
class EditorHostFixture {
  readonly resourceId = signal('resource-a');
  readonly permitted = signal(true);
  readonly title = signal<string | null>('Edit preview');
  readonly header = signal('Initial');
  readonly imagePosition = signal('none');
  readonly savedCount = signal(0);
  readonly cancelledCount = signal(0);
  readonly positionOptions = [
    { value: 'none', label: 'None' },
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
  ];
}

@Component({
  imports: [Editor],
  template: `
    <gssc-editor [resourceId]="firstId" title="First" />
    <gssc-editor [resourceId]="secondId" title="Second" />
  `,
})
class ConcurrentEditorsFixture {
  firstId = 'resource-a';
  secondId = 'resource-b';
}

@Component({
  imports: [Editor],
  template: `
    <gssc-editor [resourceId]="sharedId" title="Primary" />
    <gssc-editor [resourceId]="sharedId" title="Contender" />
  `,
})
class ContentionEditorsFixture {
  sharedId = 'resource-locked';
}

async function setupHost(options?: { resourceId?: string; permitted?: boolean }) {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [EditorHostFixture],
    providers: [EditorSession],
  }).compileComponents();
  const fixture = TestBed.createComponent(EditorHostFixture);
  if (options?.resourceId != null) fixture.componentInstance.resourceId.set(options.resourceId);
  if (options?.permitted != null) fixture.componentInstance.permitted.set(options.permitted);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, host: fixture.componentInstance, root: nativeElement(fixture) };
}

function editorEl(root: HTMLElement): HTMLElement {
  return root.querySelector('.gssc-editor')!;
}

async function typeInHeader(
  fixture: { detectChanges: () => void; whenStable: () => Promise<unknown> },
  root: HTMLElement,
  value: string,
): Promise<void> {
  const input = root.querySelector<HTMLInputElement>('.gssc-form-text-field__control')!;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  fixture.detectChanges();
  await fixture.whenStable();
}

// @relation(GSSC-MLLR-180, scope=range_start, role=Test)
test('GSSC-MLLR-180 Semantic', async () => {
  const { root, fixture, host } = await setupHost();
  const shell = editorEl(root);
  expect(shell.querySelector('.gssc-editor__fields')).not.toBeNull();
  expect(shell.querySelector('.gssc-editor__save')).not.toBeNull();
  expect(shell.querySelector('.gssc-editor__cancel')).not.toBeNull();
  expect(textContent(shell, '.gssc-editor__title')).toBe('Edit preview');
  expect(shell.querySelector('gssc-form-text-field')).not.toBeNull();
  expect(shell.querySelector('gssc-form-select-field')).not.toBeNull();

  host.permitted.set(false);
  fixture.detectChanges();
  expect(shell.querySelector('.gssc-editor__save')).toBeNull();
  expect(shell.getAttribute('data-editing')).toBe('false');
});
// @relation(GSSC-MLLR-180, scope=range_end, role=Test)

// @relation(GSSC-MLLR-181, scope=range_start, role=Test)
test('GSSC-MLLR-181 Syntactic', async () => {
  const { root } = await setupHost();
  const shell = editorEl(root);
  expect(shell.classList.contains('flex')).toBe(true);
  expect(shell.classList.contains('w-full')).toBe(true);
  expect(shell.classList.contains('flex-col')).toBe(true);
  const fields = shell.querySelector('.gssc-editor__fields')!;
  const actions = shell.querySelector('.gssc-editor__actions')!;
  expect(shell.contains(fields)).toBe(true);
  expect(shell.contains(actions)).toBe(true);
  expect(fields.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
// @relation(GSSC-MLLR-181, scope=range_end, role=Test)

// @relation(GSSC-MLLR-182, scope=range_start, role=Test)
test('GSSC-MLLR-182 Lexical', async () => {
  const { root } = await setupHost();
  const shell = editorEl(root);
  expect(shell.classList.contains('bg-gssc-white')).toBe(true);
  expect(shell.classList.contains('border-gssc-gray')).toBe(true);
  expect(shell.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(shell.classList.contains('font-sans')).toBe(true);
});
// @relation(GSSC-MLLR-182, scope=range_end, role=Test)

// @relation(GSSC-MLLR-183, scope=range_start, role=Test)
test('GSSC-MLLR-183 Semantic', async () => {
  const { root } = await setupHost();
  const fields = root.querySelector('.gssc-editor__fields')!;
  expect(fields.querySelector('gssc-form-text-field')).not.toBeNull();
  expect(fields.querySelector('gssc-form-select-field')).not.toBeNull();
});
// @relation(GSSC-MLLR-183, scope=range_end, role=Test)

// @relation(GSSC-MLLR-184, scope=range_start, role=Test)
test('GSSC-MLLR-184 Syntactic', async () => {
  const { root } = await setupHost();
  const fields = root.querySelector<HTMLElement>('.gssc-editor__fields')!;
  expect(fields.classList.contains('flex')).toBe(true);
  expect(fields.classList.contains('w-full')).toBe(true);
  expect(fields.classList.contains('flex-col')).toBe(true);
});
// @relation(GSSC-MLLR-184, scope=range_end, role=Test)

// @relation(GSSC-MLLR-185, scope=range_start, role=Test)
test('GSSC-MLLR-185 Lexical', async () => {
  const { root } = await setupHost();
  const fields = root.querySelector<HTMLElement>('.gssc-editor__fields')!;
  expect(fields.classList.contains('gap-2')).toBe(true);
});
// @relation(GSSC-MLLR-185, scope=range_end, role=Test)

// @relation(GSSC-MLLR-186, scope=range_start, role=Test)
test('GSSC-MLLR-186 Semantic', async () => {
  const { root, fixture, host } = await setupHost();
  const save = root.querySelector<HTMLButtonElement>('.gssc-editor__save')!;
  expect(save.disabled).toBe(true);
  expect(host.savedCount()).toBe(0);

  await typeInHeader(fixture, root, 'Changed');
  expect(save.disabled).toBe(false);

  save.click();
  fixture.detectChanges();
  expect(host.savedCount()).toBe(1);
  expect(root.querySelector<HTMLButtonElement>('.gssc-editor__save')!.disabled).toBe(true);
});
// @relation(GSSC-MLLR-186, scope=range_end, role=Test)

// @relation(GSSC-MLLR-187, scope=range_start, role=Test)
test('GSSC-MLLR-187 Syntactic', async () => {
  const { root } = await setupHost();
  const actions = root.querySelector('.gssc-editor__actions')!;
  const cancel = actions.querySelector('.gssc-editor__cancel')!;
  const save = actions.querySelector('.gssc-editor__save')!;
  expect(cancel.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
// @relation(GSSC-MLLR-187, scope=range_end, role=Test)

// @relation(GSSC-MLLR-188, scope=range_start, role=Test)
test('GSSC-MLLR-188 Lexical', async () => {
  const { root } = await setupHost();
  const save = root.querySelector<HTMLElement>('.gssc-editor__save')!;
  expect(save.classList.contains('bg-gssc-light-green')).toBe(true);
  expect(save.classList.contains('border-gssc-dark-green')).toBe(true);
  expect(save.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(save.classList.contains('font-sans')).toBe(true);
  expect(save.textContent?.trim()).toBe('Save');
});
// @relation(GSSC-MLLR-188, scope=range_end, role=Test)

// @relation(GSSC-MLLR-189, scope=range_start, role=Test)
test('GSSC-MLLR-189 Semantic', async () => {
  const { root, fixture, host } = await setupHost();
  await typeInHeader(fixture, root, 'Dirty');
  root.querySelector<HTMLButtonElement>('.gssc-editor__cancel')!.click();
  fixture.detectChanges();
  expect(host.cancelledCount()).toBe(1);
  expect(root.querySelector<HTMLButtonElement>('.gssc-editor__save')!.disabled).toBe(true);
});
// @relation(GSSC-MLLR-189, scope=range_end, role=Test)

// @relation(GSSC-MLLR-190, scope=range_start, role=Test)
test('GSSC-MLLR-190 Syntactic', async () => {
  const { root } = await setupHost();
  const actions = root.querySelector('.gssc-editor__actions')!;
  expect(actions.querySelector('.gssc-editor__cancel')).not.toBeNull();
  expect(actions.classList.contains('flex')).toBe(true);
});
// @relation(GSSC-MLLR-190, scope=range_end, role=Test)

// @relation(GSSC-MLLR-191, scope=range_start, role=Test)
test('GSSC-MLLR-191 Lexical', async () => {
  const { root } = await setupHost();
  const cancel = root.querySelector<HTMLElement>('.gssc-editor__cancel')!;
  expect(cancel.classList.contains('bg-gssc-white')).toBe(true);
  expect(cancel.classList.contains('border-gssc-dark-green')).toBe(true);
  expect(cancel.classList.contains('text-gssc-dark-green')).toBe(true);
  expect(cancel.textContent?.trim()).toBe('Cancel');
});
// @relation(GSSC-MLLR-191, scope=range_end, role=Test)

// @relation(GSSC-MLLR-192, scope=range_start, role=Test)
test('GSSC-MLLR-192 Semantic', async () => {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [ContentionEditorsFixture],
    providers: [EditorSession],
  }).compileComponents();
  const fixture = TestBed.createComponent(ContentionEditorsFixture);
  fixture.detectChanges();
  await fixture.whenStable();
  const root = nativeElement(fixture);
  const editors = [...root.querySelectorAll('.gssc-editor')];
  expect(editors).toHaveLength(2);
  const unavailable = editors.filter((el) => el.getAttribute('data-unavailable') === 'true');
  expect(unavailable).toHaveLength(1);
  expect(unavailable[0]!.querySelector('.gssc-editor__unavailable')).not.toBeNull();
  expect(unavailable[0]!.querySelector('.gssc-editor__save')).toBeNull();
});
// @relation(GSSC-MLLR-192, scope=range_end, role=Test)

// @relation(GSSC-MLLR-193, scope=range_start, role=Test)
test('GSSC-MLLR-193 Syntactic', async () => {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [ContentionEditorsFixture],
    providers: [EditorSession],
  }).compileComponents();
  const fixture = TestBed.createComponent(ContentionEditorsFixture);
  fixture.detectChanges();
  await fixture.whenStable();
  const root = nativeElement(fixture);
  const message = root.querySelector<HTMLElement>('.gssc-editor__unavailable')!;
  const shell = message.closest('.gssc-editor')!;
  const fields = shell.querySelector('.gssc-editor__fields')!;
  expect(message.compareDocumentPosition(fields) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
// @relation(GSSC-MLLR-193, scope=range_end, role=Test)

// @relation(GSSC-MLLR-194, scope=range_start, role=Test)
test('GSSC-MLLR-194 Lexical', async () => {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [ContentionEditorsFixture],
    providers: [EditorSession],
  }).compileComponents();
  const fixture = TestBed.createComponent(ContentionEditorsFixture);
  fixture.detectChanges();
  await fixture.whenStable();
  const message = nativeElement(fixture).querySelector<HTMLElement>('.gssc-editor__unavailable')!;
  expect(message.classList.contains('bg-gssc-light-red')).toBe(true);
  expect(message.classList.contains('border-gssc-dark-red')).toBe(true);
  expect(message.classList.contains('text-gssc-dark-red')).toBe(true);
  expect(message.classList.contains('font-sans')).toBe(true);
});
// @relation(GSSC-MLLR-194, scope=range_end, role=Test)

// @relation(GSSC-MLLR-195, scope=range_start, role=Test)
test('GSSC-MLLR-195 Permission Gate', async () => {
  const { root, fixture, host } = await setupHost({ permitted: false });
  expect(editorEl(root).getAttribute('data-editing')).toBe('false');
  expect(root.querySelector('.gssc-editor__save')).toBeNull();

  host.permitted.set(true);
  fixture.detectChanges();
  expect(editorEl(root).getAttribute('data-editing')).toBe('true');
  expect(root.querySelector('.gssc-editor__save')).not.toBeNull();
});
// @relation(GSSC-MLLR-195, scope=range_end, role=Test)

// @relation(GSSC-MLLR-196, scope=range_start, role=Test)
test('GSSC-MLLR-196 Exclusive Resource Edit', async () => {
  // After exclusive modification is acquired, Save and Cancel are offered.
  const acquired = await setupHost({ resourceId: 'resource-owned' });
  expect(acquired.root.querySelector('.gssc-editor__save')).not.toBeNull();
  expect(acquired.root.querySelector('.gssc-editor__cancel')).not.toBeNull();
  expect(editorEl(acquired.root).getAttribute('data-unavailable')).toBe('false');

  // When exclusive modification is not acquired, Save and Cancel are withheld.
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [ContentionEditorsFixture],
    providers: [EditorSession],
  }).compileComponents();
  const fixture = TestBed.createComponent(ContentionEditorsFixture);
  fixture.detectChanges();
  await fixture.whenStable();
  const blocked = nativeElement(fixture).querySelector(
    '.gssc-editor[data-unavailable="true"]',
  )!;
  expect(blocked.querySelector('.gssc-editor__save')).toBeNull();
  expect(blocked.querySelector('.gssc-editor__cancel')).toBeNull();
  expect(blocked.querySelector('.gssc-editor__actions')).toBeNull();
});
// @relation(GSSC-MLLR-196, scope=range_end, role=Test)

// @relation(GSSC-MLLR-197, scope=range_start, role=Test)
test('GSSC-MLLR-197 Concurrent Different Resource Edits', async () => {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [ConcurrentEditorsFixture],
    providers: [EditorSession],
  }).compileComponents();
  const fixture = TestBed.createComponent(ConcurrentEditorsFixture);
  fixture.detectChanges();
  await fixture.whenStable();
  const editors = [...nativeElement(fixture).querySelectorAll('.gssc-editor')];
  expect(editors).toHaveLength(2);
  expect(editors.every((el) => el.getAttribute('data-unavailable') === 'false')).toBe(true);
  expect(editors.every((el) => el.getAttribute('data-editing') === 'true')).toBe(true);
});
// @relation(GSSC-MLLR-197, scope=range_end, role=Test)

// @relation(GSSC-MLLR-198, scope=range_start, role=Test)
test('GSSC-MLLR-198 Contention Block', async () => {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [ContentionEditorsFixture],
    providers: [EditorSession],
  }).compileComponents();
  const fixture = TestBed.createComponent(ContentionEditorsFixture);
  fixture.detectChanges();
  await fixture.whenStable();
  const blocked = nativeElement(fixture).querySelector(
    '.gssc-editor[data-unavailable="true"]',
  )!;
  expect(blocked.querySelector('.gssc-editor__unavailable')).not.toBeNull();
  expect(blocked.querySelector('.gssc-editor__actions')).toBeNull();
});
// @relation(GSSC-MLLR-198, scope=range_end, role=Test)

// @relation(GSSC-MLLR-199, scope=range_start, role=Test)
test('GSSC-MLLR-199 Save Persistence', async () => {
  const { root, fixture, host } = await setupHost();
  await typeInHeader(fixture, root, 'Persist me');
  root.querySelector<HTMLButtonElement>('.gssc-editor__save')!.click();
  fixture.detectChanges();
  expect(host.savedCount()).toBe(1);
});
// @relation(GSSC-MLLR-199, scope=range_end, role=Test)

// @relation(GSSC-MLLR-200, scope=range_start, role=Test)
test('GSSC-MLLR-200 Cancel Discard', async () => {
  const { root, fixture, host } = await setupHost();
  await typeInHeader(fixture, root, 'Throw away');
  root.querySelector<HTMLButtonElement>('.gssc-editor__cancel')!.click();
  fixture.detectChanges();
  expect(host.cancelledCount()).toBe(1);
});
// @relation(GSSC-MLLR-200, scope=range_end, role=Test)

// @relation(GSSC-MLLR-201, scope=range_start, role=Test)
test('GSSC-MLLR-201 Dirty Change Tracking', async () => {
  const { root, fixture } = await setupHost();
  const save = () => root.querySelector<HTMLButtonElement>('.gssc-editor__save')!;
  expect(save().disabled).toBe(true);
  await typeInHeader(fixture, root, 'Now dirty');
  expect(save().disabled).toBe(false);
  save().click();
  fixture.detectChanges();
  expect(save().disabled).toBe(true);
});
// @relation(GSSC-MLLR-201, scope=range_end, role=Test)
