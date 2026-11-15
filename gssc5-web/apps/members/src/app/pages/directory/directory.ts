import { Component, effect, inject, model, OnInit, signal } from '@angular/core';
import { ContactRow } from '../../modules/contact-row/contact-row';
import { FormTextField } from '../../modules/form-text-field/form-text-field';
import type { AccountRecord } from '../../services/account-api';
import {
  directoryApi,
  toContactRowContents,
  toDirectoryQuery,
  type DirectorySearchFilters,
} from '../../services/directory-api';
import { MemberSession } from '../../services/member-session';

@Component({
  selector: 'gssc-directory-page',
  imports: [ContactRow, FormTextField],
  templateUrl: './directory.html',
})
export class DirectoryPage implements OnInit {
  private readonly memberSession = inject(MemberSession);
  private readonly filtersReady = signal(false);
  private reloadGeneration = 0;

  readonly firstName = model('');
  readonly lastName = model('');
  readonly email = model('');
  readonly phone = model('');
  readonly homeCity = model('');
  readonly homeState = model('');

  readonly entries = signal<AccountRecord[]>([]);
  readonly loadError = signal(false);
  readonly loading = signal(false);

  // @relation(GSSC-MLLR-214, scope=range_start, role=Implementation)
  /** True when the viewer is an administrator (registered-member projection). */
  readonly isAdministrator = this.memberSession.isAdmin;
  // @relation(GSSC-MLLR-214, scope=range_end, role=Implementation)

  constructor() {
    // @relation(GSSC-MLLR-212, scope=range_start, role=Implementation)
    effect(() => {
      if (!this.filtersReady()) return;
      const filters: DirectorySearchFilters = {
        firstName: this.firstName(),
        lastName: this.lastName(),
        email: this.email(),
        phone: this.phone(),
        homeCity: this.homeCity(),
        homeState: this.homeState(),
      };
      void this.reload(filters);
    });
    // @relation(GSSC-MLLR-212, scope=range_end, role=Implementation)
  }

  async ngOnInit(): Promise<void> {
    await this.memberSession.whenReady();
    this.filtersReady.set(true);
  }

  // @relation(GSSC-MLLR-213, scope=range_start, role=Implementation)
  contactContents(entry: AccountRecord) {
    return toContactRowContents(entry);
  }
  // @relation(GSSC-MLLR-213, scope=range_end, role=Implementation)

  async clearSearch(): Promise<void> {
    this.firstName.set('');
    this.lastName.set('');
    this.email.set('');
    this.phone.set('');
    this.homeCity.set('');
    this.homeState.set('');
  }

  private async reload(filters: DirectorySearchFilters): Promise<void> {
    const generation = ++this.reloadGeneration;
    this.loading.set(true);
    this.loadError.set(false);
    try {
      const { data, error } = await directoryApi.listUsers(toDirectoryQuery(filters));
      if (generation !== this.reloadGeneration) return;
      if (error || !Array.isArray(data)) {
        this.entries.set([]);
        this.loadError.set(true);
        return;
      }
      this.entries.set(data as AccountRecord[]);
    } catch {
      if (generation !== this.reloadGeneration) return;
      this.entries.set([]);
      this.loadError.set(true);
    } finally {
      if (generation === this.reloadGeneration) {
        this.loading.set(false);
      }
    }
  }
}
