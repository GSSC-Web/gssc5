import { Component, inject, signal } from '@angular/core';
import {
  COMMITTEE_CHAIR_OFFICES,
  LEADERSHIP_LIST_GET,
  OFFICER_AND_DIRECTOR_OFFICES,
  rowsForRoster,
  type LeadershipRow,
} from '../../services/leadership/leadership';

/**
 * Public leadership page: Officers and Directors + Committee Chairs from
 * Unified Backend GET /leadership (GSSC5-16). Route: GSSC-PLLR-10.
 */
// @relation(GSSC-PLLR-10, scope=range_start, role=Implementation)
@Component({
  selector: 'gssc-leadership-page',
  templateUrl: './leadership.html',
})
export class LeadershipPage {
  private readonly leadershipListGet = inject(LEADERSHIP_LIST_GET);

  /** Officers and Directors rows (Vacant when name is null). */
  readonly officersAndDirectors = signal<LeadershipRow[]>([]);

  /** Committee Chairs rows (Vacant when name is null). */
  readonly committeeChairs = signal<LeadershipRow[]>([]);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    // @relation(GSSC-PLLR-159, GSSC-PLLR-162, scope=range_start, role=Implementation)
    const leaders = await this.leadershipListGet();
    this.officersAndDirectors.set(rowsForRoster(OFFICER_AND_DIRECTOR_OFFICES, leaders));
    this.committeeChairs.set(rowsForRoster(COMMITTEE_CHAIR_OFFICES, leaders));
    // @relation(GSSC-PLLR-159, GSSC-PLLR-162, scope=range_end, role=Implementation)
  }
}
// @relation(GSSC-PLLR-10, scope=range_end, role=Implementation)
