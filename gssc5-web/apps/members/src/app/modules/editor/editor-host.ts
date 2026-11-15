/** Parent Generic Editor surface that hosts or projected fields may notify on change. */
export abstract class EditorHost {
  abstract markDirty(): void;

  /** False when the editor is read-only or unavailable for modification. */
  abstract fieldsEnabled(): boolean;
}
