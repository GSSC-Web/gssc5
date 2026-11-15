import { Component, effect, inject, model, OnInit, signal } from '@angular/core';
import { ContactRow } from '../../modules/contact-row/contact-row';
import { FormTextField } from '../../modules/form-text-field/form-text-field';
import type { AccountRecord } from '../../services/account-api';
import {
  directoryApi,
  directoryIsDeleted,
  directoryPhotoUrl,
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

  readonly name = model('');
  readonly email = model('');
  readonly phone = model('');
  readonly address = model('');

  readonly entries = signal<AccountRecord[]>([]);
  readonly loadError = signal(false);
  readonly loading = signal(false);

  // @relation(GSSC-MLLR-214, scope=range_start, role=Implementation)
  /** True when the viewer is an administrator (registered-member projection). */
  readonly isAdministrator = this.memberSession.isAdmin;
  // @relation(GSSC-MLLR-214, scope=range_end, role=Implementation)

  /** True when the viewer may open another member's Account Page (admin ⊃ userMod). */
  readonly isUserMod = this.memberSession.isUserMod;

  constructor() {
    // @relation(GSSC-MLLR-212, GSSC-MLLR-226, GSSC-MLLR-227, scope=range_start, role=Implementation)
    effect(() => {
      if (!this.filtersReady()) return;
      const filters: DirectorySearchFilters = {
        name: this.name(),
        email: this.email(),
        phone: this.phone(),
        address: this.address(),
      };
      void this.reload(filters);
    });
    // @relation(GSSC-MLLR-212, GSSC-MLLR-226, GSSC-MLLR-227, scope=range_end, role=Implementation)
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

  photoUrl(entry: AccountRecord): string | null {
    return directoryPhotoUrl(entry);
  }

  isDeleted(entry: AccountRecord): boolean {
    return directoryIsDeleted(entry);
  }

  editHref(entry: AccountRecord): string {
    return `/accounts/${entry.cuid}`;
  }

  async clearSearch(): Promise<void> {
    this.name.set('');
    this.email.set('');
    this.phone.set('');
    this.address.set('');
  }

  // @relation(GSSC-MLLR-224, GSSC-MLLR-225, scope=range_start, role=Implementation)
  async onSoftDelete(entry: AccountRecord): Promise<void> {
    try {
      const { error } = await directoryApi.softDeleteUser(entry.cuid);
      if (error) return;
      await this.reload(this.currentFilters());
    } catch {
      // leave current list; next filter change will retry
    }
  }

  async onUndelete(entry: AccountRecord): Promise<void> {
    try {
      const { error } = await directoryApi.undeleteUser(entry.cuid);
      if (error) return;
      await this.reload(this.currentFilters());
    } catch {
      // leave current list; next filter change will retry
    }
  }
  // @relation(GSSC-MLLR-224, GSSC-MLLR-225, scope=range_end, role=Implementation)

  private currentFilters(): DirectorySearchFilters {
    return {
      name: this.name(),
      email: this.email(),
      phone: this.phone(),
      address: this.address(),
    };
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
