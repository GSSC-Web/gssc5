import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { AnnouncementsEditorPage } from '../announcements-editor/announcements-editor';
import { EventsPage } from '../events/events';
import { PageSectionEditorPage } from '../page-section-editor/page-section-editor';

export type PageDataKind = 'sections' | 'announcements' | 'events';

export const PAGE_DATA_KIND_PATHS: Record<PageDataKind, string> = {
  sections: '/page-sections',
  announcements: '/announcements',
  events: '/events',
};

const KIND_LABELS: Record<PageDataKind, string> = {
  sections: 'Sections',
  announcements: 'Announcements',
  events: 'Events',
};

function normalizeKind(value: unknown): PageDataKind {
  if (value === 'announcements' || value === 'events' || value === 'sections') {
    return value;
  }
  return 'sections';
}

/**
 * Page Data Editor Unification (GSSC5-117): one shell hosts section, announcement,
 * and event editing panels; legacy paths remain entry points via route data.kind.
 */
@Component({
  selector: 'gssc-page-data-editor-page',
  imports: [PageSectionEditorPage, AnnouncementsEditorPage, EventsPage],
  templateUrl: './page-data-editor.html',
})
export class PageDataEditorPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // @relation(GSSC-MLLR-317, GSSC-MLLR-318, GSSC-MLLR-319, GSSC-MLLR-320, scope=range_start, role=Implementation)
  readonly kind = toSignal(
    this.route.data.pipe(map((data) => normalizeKind(data['kind']))),
    { initialValue: normalizeKind(this.route.snapshot.data['kind']) },
  );
  // @relation(GSSC-MLLR-317, GSSC-MLLR-318, GSSC-MLLR-319, GSSC-MLLR-320, scope=range_end, role=Implementation)

  readonly kinds: ReadonlyArray<{ id: PageDataKind; label: string }> = (
    Object.keys(KIND_LABELS) as PageDataKind[]
  ).map((id) => ({ id, label: KIND_LABELS[id] }));

  readonly kindLabel = computed(() => KIND_LABELS[this.kind()]);

  // @relation(GSSC-MLLR-317, GSSC-MLLR-318, GSSC-MLLR-319, scope=range_start, role=Implementation)
  selectKind(next: PageDataKind): void {
    if (next === this.kind()) return;
    void this.router.navigateByUrl(PAGE_DATA_KIND_PATHS[next]);
  }
  // @relation(GSSC-MLLR-317, GSSC-MLLR-318, GSSC-MLLR-319, scope=range_end, role=Implementation)
}
