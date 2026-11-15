import {
  Component,
  DestroyRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { EditorSession } from '../../services/editor-session/editor-session';
import { EditorHost } from './editor-host';

let editorHolderSeq = 0;

/**
 * Generic Editor shell for Wave 7 content editors.
 * Project field controls into the field area (prefer GSSC5-85
 * `gssc-form-text-field` / `gssc-form-select-field` when available).
 */
@Component({
  selector: 'gssc-editor',
  templateUrl: './editor.html',
  providers: [{ provide: EditorHost, useExisting: Editor }],
})
export class Editor extends EditorHost {
  private readonly session = inject(EditorSession);
  private readonly destroyRef = inject(DestroyRef);

  /** Stable identity for exclusive-edit registry (per Editor instance). */
  private readonly holderId = `editor-holder-${++editorHolderSeq}`;

  /**
   * Resource key for exclusive edit (page, section, announcement, …).
   * Distinct keys may be edited concurrently; the same key is exclusive.
   */
  readonly resourceId = input.required<string>();

  /** Host-supplied permission: false forces read-only even when the lock is free. */
  readonly permitted = input(true);

  /** Optional heading shown above the field area. */
  readonly title = input<string | null>(null);

  /** Host requests persistence of the projected field values. */
  readonly saved = output<void>();

  /** Host requests discard of unsaved changes (restore baseline). */
  readonly cancelled = output<void>();

  /** True after a field change since the last save or cancel. */
  readonly dirty = signal(false);

  /** True when another holder already owns exclusive edit for this resource. */
  readonly unavailable = signal(false);

  // @relation(GSSC-MLLR-195, scope=range_start, role=Implementation)
  /** Fields accept input when permitted and the resource is not contention-blocked. */
  readonly editing = computed(() => this.permitted() && !this.unavailable());
  // @relation(GSSC-MLLR-195, scope=range_end, role=Implementation)

  readonly canSave = computed(() => this.editing() && this.dirty());

  constructor() {
    super();

    effect(() => {
      const id = this.resourceId();
      this.acquireFor(id);
    });

    this.destroyRef.onDestroy(() => {
      this.session.release(this.resourceId(), this.holderId);
    });
  }

  override markDirty(): void {
    if (!this.editing()) return;
    this.dirty.set(true);
  }

  override fieldsEnabled(): boolean {
    return this.editing();
  }

  // @relation(GSSC-MLLR-201, scope=range_start, role=Implementation)
  /** Bubbled input/change from projected form fields (GSSC5-85 or host-local). */
  @HostListener('input')
  @HostListener('change')
  protected onProjectedFieldEvent(): void {
    this.markDirty();
  }
  // @relation(GSSC-MLLR-201, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-199, scope=range_start, role=Implementation)
  protected onSave(): void {
    if (!this.canSave()) return;
    this.saved.emit();
    this.dirty.set(false);
  }
  // @relation(GSSC-MLLR-199, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-200, scope=range_start, role=Implementation)
  protected onCancel(): void {
    if (!this.editing()) return;
    this.cancelled.emit();
    this.dirty.set(false);
  }
  // @relation(GSSC-MLLR-200, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-196, GSSC-MLLR-198, scope=range_start, role=Implementation)
  private acquireFor(resourceId: string): void {
    const acquired = this.session.tryAcquire(resourceId, this.holderId);
    this.unavailable.set(!acquired);
    if (!acquired) this.dirty.set(false);
  }
  // @relation(GSSC-MLLR-196, GSSC-MLLR-198, scope=range_end, role=Implementation)
}
