import { Component, inject, signal } from '@angular/core';
import type { ContactCardContents } from '../../modules/contact-card-large/contact-card-large';
import { ContactCardLarge } from '../../modules/contact-card-large/contact-card-large';
import { ContactCardSmall } from '../../modules/contact-card-small/contact-card-small';
import { SectionFromCuid } from '../../modules/section-from-cuid/section-from-cuid';
import {
  cardsForRoster,
  committeeChairCards,
  DIRECTOR_AT_LARGE_OFFICES,
  LEADERSHIP_INTRO_TAG,
  LEADERSHIP_LIST_GET,
  LEADERSHIP_SECTION_LIST_BY_TAG,
  OFFICER_OFFICES,
  sortLeadershipSectionsByIndex,
} from '../../services/leadership/leadership';

/**
 * Public leadership page (GSSC5-16): intro sections + Officers / Directors /
 * Committee Chairs contact-card grids from GET /leadership. Route: GSSC-PLLR-10.
 */
// @relation(GSSC-PLLR-10, scope=range_start, role=Implementation)
@Component({
  selector: 'gssc-leadership-page',
  imports: [SectionFromCuid, ContactCardLarge, ContactCardSmall],
  templateUrl: './leadership.html',
})
export class LeadershipPage {
  private readonly leadershipListGet = inject(LEADERSHIP_LIST_GET);
  private readonly sectionListByTag = inject(LEADERSHIP_SECTION_LIST_BY_TAG);
  private loadGeneration = 0;

  /** Leadership Intro section cuids in backend index order. */
  readonly introCuids = signal<string[]>([]);

  /** Officers cards (Vacant when name is null). */
  readonly officers = signal<ContactCardContents[]>([]);

  /** Directors at Large cards in seat order. */
  readonly directors = signal<ContactCardContents[]>([]);

  /** Committee Chairs cards alphabetically by title. */
  readonly chairs = signal<ContactCardContents[]>([]);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    const generation = ++this.loadGeneration;
    // @relation(GSSC-PLLR-234, GSSC-PLLR-162, GSSC-PLLR-165, GSSC-PLLR-231, scope=range_start, role=Implementation)
    const [intro, leaders] = await Promise.all([
      this.sectionListByTag(LEADERSHIP_INTRO_TAG),
      this.leadershipListGet(),
    ]);
    if (generation !== this.loadGeneration) return;
    this.introCuids.set(
      sortLeadershipSectionsByIndex(intro).map((entry) => entry.cuid),
    );
    this.officers.set(cardsForRoster(OFFICER_OFFICES, leaders));
    this.directors.set(cardsForRoster(DIRECTOR_AT_LARGE_OFFICES, leaders));
    this.chairs.set(committeeChairCards(leaders));
    // @relation(GSSC-PLLR-234, GSSC-PLLR-162, GSSC-PLLR-165, GSSC-PLLR-231, scope=range_end, role=Implementation)
  }
}
// @relation(GSSC-PLLR-10, scope=range_end, role=Implementation)
