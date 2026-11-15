import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  accountApi,
  AccountFieldKey,
  AccountRecord,
  accountPhotoUrl,
  evaluatePasswordCriteria,
  MemberFieldKey,
  PASSWORD_MIN_LENGTH,
  passwordCriteriaSatisfied,
  PrivilegeKey,
  SITE_PRIVILEGES,
  validateAccountInfoFields,
  validateMemberInfoFields,
} from '../../services/account-api';
import { MemberSession } from '../../services/member-session';

type MemberInfoForm = {
  firstName: string;
  middleName: string;
  lastName: string;
  primaryEmail: string;
  secondaryEmail: string;
  primaryPhone: string;
  secondaryPhone: string;
  preferredContactMethod: string;
  secondaryEmailDisplay: boolean;
  secondaryPhoneDisplay: boolean;
  homeLine1: string;
  homeLine2: string;
  homeLine3: string;
  homeCity: string;
  homeState: string;
  homeZip: string;
  homeZipExtension: string;
  homeAddressDisplay: string;
  mailingLine1: string;
  mailingLine2: string;
  mailingLine3: string;
  mailingCity: string;
  mailingState: string;
  mailingZip: string;
  mailingZipExtension: string;
};

type AccountInfoForm = {
  accountPhoto: string;
  username: string;
  membershipStatus: string;
  position: string;
  isAdmin: boolean;
  isUserMod: boolean;
  isToolEditor: boolean;
  isPublicationEditor: boolean;
  isNewsletterEditor: boolean;
};

const emptyMemberInfo = (): MemberInfoForm => ({
  firstName: '',
  middleName: '',
  lastName: '',
  primaryEmail: '',
  secondaryEmail: '',
  primaryPhone: '',
  secondaryPhone: '',
  preferredContactMethod: 'None',
  secondaryEmailDisplay: false,
  secondaryPhoneDisplay: false,
  homeLine1: '',
  homeLine2: '',
  homeLine3: '',
  homeCity: '',
  homeState: '',
  homeZip: '',
  homeZipExtension: '',
  homeAddressDisplay: 'redacted',
  mailingLine1: '',
  mailingLine2: '',
  mailingLine3: '',
  mailingCity: '',
  mailingState: '',
  mailingZip: '',
  mailingZipExtension: '',
});

const emptyAccountInfo = (): AccountInfoForm => ({
  accountPhoto: '',
  username: '',
  membershipStatus: '',
  position: '',
  isAdmin: false,
  isUserMod: false,
  isToolEditor: false,
  isPublicationEditor: false,
  isNewsletterEditor: false,
});

@Component({
  selector: 'gssc-account-page',
  imports: [FormsModule],
  templateUrl: './account.html',
  styleUrl: './account.css',
})
export class AccountPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly memberSession = inject(MemberSession);

  readonly privileges = SITE_PRIVILEGES;
  readonly passwordMinLength = PASSWORD_MIN_LENGTH;

  readonly loading = signal(true);
  readonly unavailable = signal(false);
  readonly loadError = signal('');
  readonly memberMessage = signal('');
  readonly accountMessage = signal('');
  readonly passwordMessage = signal('');
  readonly memberSubmitting = signal(false);
  readonly accountSubmitting = signal(false);
  readonly passwordSubmitting = signal(false);

  readonly targetCuid = signal('');
  readonly isOwnAccount = signal(true);
  readonly canEditMembership = signal(false);
  readonly isAdminViewer = signal(false);
  readonly canChangePassword = signal(true);

  // @relation(GSSC-MLLR-415, GSSC-MLLR-416, scope=range_start, role=Implementation)
  readonly memberSectionOpen = signal(true);
  readonly accountSectionOpen = signal(true);
  readonly passwordSectionOpen = signal(true);

  toggleMemberSection(): void {
    this.memberSectionOpen.update((open) => !open);
  }

  toggleAccountSection(): void {
    this.accountSectionOpen.update((open) => !open);
  }

  togglePasswordSection(): void {
    this.passwordSectionOpen.update((open) => !open);
  }
  // @relation(GSSC-MLLR-415, GSSC-MLLR-416, scope=range_end, role=Implementation)

  readonly memberInvalid = signal<ReadonlySet<MemberFieldKey>>(new Set());
  readonly accountInvalid = signal<ReadonlySet<AccountFieldKey>>(new Set());
  readonly passwordInvalid = signal(false);

  readonly photoPreviewUrl = signal<string | null>(null);
  private pendingPhotoFile: File | null = null;
  private localPreviewObjectUrl: string | null = null;

  memberInfo = emptyMemberInfo();
  accountInfo = emptyAccountInfo();
  private loadedMemberInfo = emptyMemberInfo();
  private loadedAccountInfo = emptyAccountInfo();

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  readonly passwordCriteria = computed(() =>
    evaluatePasswordCriteria(this.newPasswordSignal(), this.confirmPasswordSignal()),
  );

  private readonly newPasswordSignal = signal('');
  private readonly confirmPasswordSignal = signal('');

  ngOnInit(): void {
    void this.bootstrap();
  }

  // @relation(GSSC-MLLR-420, scope=range_start, role=Implementation)
  fieldInvalid(key: MemberFieldKey | AccountFieldKey): boolean {
    if (key === 'username') return this.accountInvalid().has('username');
    return this.memberInvalid().has(key as MemberFieldKey);
  }
  // @relation(GSSC-MLLR-420, scope=range_end, role=Implementation)

  onNewPasswordInput(value: string): void {
    this.newPassword = value;
    this.newPasswordSignal.set(value);
    this.passwordInvalid.set(false);
  }

  onConfirmPasswordInput(value: string): void {
    this.confirmPassword = value;
    this.confirmPasswordSignal.set(value);
    this.passwordInvalid.set(false);
  }

  // @relation(GSSC-MLLR-424, GSSC-MLLR-425, scope=range_start, role=Implementation)
  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.pendingPhotoFile = file;
    if (this.localPreviewObjectUrl) {
      URL.revokeObjectURL(this.localPreviewObjectUrl);
      this.localPreviewObjectUrl = null;
    }
    if (file) {
      this.localPreviewObjectUrl = URL.createObjectURL(file);
      this.photoPreviewUrl.set(this.localPreviewObjectUrl);
    } else {
      this.photoPreviewUrl.set(accountPhotoUrl(this.accountInfo.accountPhoto));
    }
  }
  // @relation(GSSC-MLLR-424, GSSC-MLLR-425, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-133, scope=range_start, role=Implementation)
  resetMemberInfo(): void {
    this.memberInfo = { ...this.loadedMemberInfo };
    this.memberMessage.set('');
    this.memberInvalid.set(new Set());
  }
  // @relation(GSSC-MLLR-133, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-134, GSSC-MLLR-418, GSSC-MLLR-419, scope=range_start, role=Implementation)
  async submitMemberInfo(): Promise<void> {
    if (this.memberSubmitting() || this.unavailable()) return;
    const failed = validateMemberInfoFields(this.memberInfo);
    this.memberInvalid.set(failed);
    if (failed.size > 0) {
      this.memberMessage.set('Fix the highlighted fields before submitting.');
      return;
    }
    this.memberSubmitting.set(true);
    this.memberMessage.set('');
    try {
      const body = memberInfoBody(this.memberInfo);
      const { error } = await accountApi.updateUser(this.targetCuid(), body);
      if (error) {
        this.memberMessage.set('Member information could not be saved.');
        return;
      }
      this.loadedMemberInfo = { ...this.memberInfo };
      this.memberMessage.set('Member information saved.');
    } catch {
      this.memberMessage.set('Member information could not be saved.');
    } finally {
      this.memberSubmitting.set(false);
    }
  }
  // @relation(GSSC-MLLR-134, GSSC-MLLR-418, GSSC-MLLR-419, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-141, GSSC-MLLR-421, GSSC-MLLR-426, scope=range_start, role=Implementation)
  async submitAccountInfo(): Promise<void> {
    if (this.accountSubmitting() || this.unavailable()) return;
    const failed = validateAccountInfoFields(this.accountInfo);
    this.accountInvalid.set(failed);
    if (failed.size > 0) {
      this.accountMessage.set('Fix the highlighted fields before submitting.');
      return;
    }
    this.accountSubmitting.set(true);
    this.accountMessage.set('');
    try {
      if (this.pendingPhotoFile) {
        const uploaded = await accountApi.uploadAccountPhoto(this.pendingPhotoFile);
        if (uploaded.error || !uploaded.data) {
          this.accountMessage.set('Account photo could not be uploaded.');
          return;
        }
        this.accountInfo.accountPhoto = uploaded.data.cuid;
        this.pendingPhotoFile = null;
        if (this.localPreviewObjectUrl) {
          URL.revokeObjectURL(this.localPreviewObjectUrl);
          this.localPreviewObjectUrl = null;
        }
        this.photoPreviewUrl.set(accountPhotoUrl(uploaded.data.cuid));
      }
      const body = accountInfoBody(
        this.accountInfo,
        this.canEditMembership(),
        this.isAdminViewer(),
      );
      const { error } = await accountApi.updateUser(this.targetCuid(), body);
      if (error) {
        this.accountMessage.set('Account information could not be saved.');
        return;
      }
      this.loadedAccountInfo = { ...this.accountInfo };
      this.accountMessage.set('Account information saved.');
      if (this.isOwnAccount()) {
        await this.memberSession.refresh();
      }
    } catch {
      this.accountMessage.set('Account information could not be saved.');
    } finally {
      this.accountSubmitting.set(false);
    }
  }
  // @relation(GSSC-MLLR-141, GSSC-MLLR-421, GSSC-MLLR-426, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-149, GSSC-MLLR-158, GSSC-MLLR-427, GSSC-MLLR-428, scope=range_start, role=Implementation)
  async submitPasswordChange(): Promise<void> {
    if (this.passwordSubmitting() || !this.canChangePassword()) return;
    const criteria = evaluatePasswordCriteria(this.newPassword, this.confirmPassword);
    const equalsCurrent =
      this.currentPassword.length > 0 && this.newPassword === this.currentPassword;
    if (!passwordCriteriaSatisfied(criteria) || !this.currentPassword || equalsCurrent) {
      this.passwordInvalid.set(true);
      this.passwordMessage.set(
        equalsCurrent
          ? 'New password must differ from the current password.'
          : 'Password does not meet the required criteria.',
      );
      return;
    }
    this.passwordSubmitting.set(true);
    this.passwordMessage.set('');
    this.passwordInvalid.set(false);
    try {
      const { error } = await accountApi.changePassword({
        currentPassword: this.currentPassword,
        newPassword: this.newPassword,
      });
      if (error) {
        this.passwordInvalid.set(true);
        this.passwordMessage.set(
          error.status === 422
            ? 'New password must differ from the current and previous passwords.'
            : 'Password could not be changed.',
        );
        return;
      }
      this.currentPassword = '';
      this.onNewPasswordInput('');
      this.onConfirmPasswordInput('');
      this.passwordMessage.set('Password changed.');
    } catch {
      this.passwordMessage.set('Password could not be changed.');
    } finally {
      this.passwordSubmitting.set(false);
    }
  }
  // @relation(GSSC-MLLR-149, GSSC-MLLR-158, GSSC-MLLR-427, GSSC-MLLR-428, scope=range_end, role=Implementation)

  activePrivilegeLabels(): string[] {
    return SITE_PRIVILEGES.filter((p) => this.accountInfo[p.key]).map((p) => p.label);
  }

  privilegeChecked(key: PrivilegeKey): boolean {
    return this.accountInfo[key];
  }

  setPrivilege(key: PrivilegeKey, checked: boolean): void {
    this.accountInfo[key] = checked;
  }

  /** Load (or reload) the account for the current route and viewer. */
  async bootstrap(): Promise<void> {
    await this.memberSession.whenReady();
    const paramCuid = this.route.snapshot.paramMap.get('cuid');
    const ownCuid = this.memberSession.cuid();
    const isOwn = !paramCuid || paramCuid === ownCuid;
    const viewerIsUserMod = this.memberSession.isUserMod();
    const viewerIsAdmin = this.memberSession.isAdmin();

    // @relation(GSSC-MLLR-128, GSSC-MLLR-129, scope=range_start, role=Implementation)
    if (!isOwn && !viewerIsUserMod) {
      this.unavailable.set(true);
      this.loading.set(false);
      this.loadError.set('This account is unavailable.');
      return;
    }
    // @relation(GSSC-MLLR-128, GSSC-MLLR-129, scope=range_end, role=Implementation)

    const cuid = isOwn ? ownCuid : (paramCuid as string);
    if (!cuid) {
      this.unavailable.set(true);
      this.loading.set(false);
      this.loadError.set('This account is unavailable.');
      return;
    }

    this.targetCuid.set(cuid);
    this.isOwnAccount.set(isOwn);
    this.canEditMembership.set(viewerIsUserMod);
    this.isAdminViewer.set(viewerIsAdmin);
    this.canChangePassword.set(isOwn);

    try {
      const { data, error } = await accountApi.getUser(cuid);
      if (error || !data) {
        this.unavailable.set(true);
        this.loadError.set('This account is unavailable.');
        return;
      }
      this.applyLoaded(data as AccountRecord);
    } catch {
      this.unavailable.set(true);
      this.loadError.set('This account is unavailable.');
    } finally {
      this.loading.set(false);
    }
  }

  private applyLoaded(account: AccountRecord): void {
    const member = memberInfoFromAccount(account);
    const info = accountInfoFromAccount(account);
    this.memberInfo = { ...member };
    this.accountInfo = { ...info };
    this.loadedMemberInfo = { ...member };
    this.loadedAccountInfo = { ...info };
    this.pendingPhotoFile = null;
    if (this.localPreviewObjectUrl) {
      URL.revokeObjectURL(this.localPreviewObjectUrl);
      this.localPreviewObjectUrl = null;
    }
    this.photoPreviewUrl.set(accountPhotoUrl(info.accountPhoto));
    this.memberInvalid.set(new Set());
    this.accountInvalid.set(new Set());
    this.passwordInvalid.set(false);
  }
}

function memberInfoFromAccount(account: AccountRecord): MemberInfoForm {
  return {
    firstName: account.firstName ?? '',
    middleName: account.middleName ?? '',
    lastName: account.lastName ?? '',
    primaryEmail: account.primaryEmail ?? '',
    secondaryEmail: account.secondaryEmail ?? '',
    primaryPhone: account.primaryPhone ?? '',
    secondaryPhone: account.secondaryPhone ?? '',
    preferredContactMethod: account.preferredContactMethod ?? 'None',
    secondaryEmailDisplay: account.secondaryEmailDisplay === true,
    secondaryPhoneDisplay: account.secondaryPhoneDisplay === true,
    homeLine1: account.homeLine1 ?? '',
    homeLine2: account.homeLine2 ?? '',
    homeLine3: account.homeLine3 ?? '',
    homeCity: account.homeCity ?? '',
    homeState: account.homeState ?? '',
    homeZip: account.homeZip ?? '',
    homeZipExtension: account.homeZipExtension ?? '',
    homeAddressDisplay: account.homeAddressDisplay ?? 'redacted',
    mailingLine1: account.mailingLine1 ?? '',
    mailingLine2: account.mailingLine2 ?? '',
    mailingLine3: account.mailingLine3 ?? '',
    mailingCity: account.mailingCity ?? '',
    mailingState: account.mailingState ?? '',
    mailingZip: account.mailingZip ?? '',
    mailingZipExtension: account.mailingZipExtension ?? '',
  };
}

function accountInfoFromAccount(account: AccountRecord): AccountInfoForm {
  return {
    accountPhoto: account.accountPhoto ?? '',
    username: account.username ?? '',
    membershipStatus: account.membershipStatus ?? '',
    position: account.position ?? '',
    isAdmin: account.isAdmin === true,
    isUserMod: account.isUserMod === true,
    isToolEditor: account.isToolEditor === true,
    isPublicationEditor: account.isPublicationEditor === true,
    isNewsletterEditor: account.isNewsletterEditor === true,
  };
}

function memberInfoBody(form: MemberInfoForm): Record<string, string | boolean | null> {
  return {
    firstName: form.firstName,
    middleName: form.middleName,
    lastName: form.lastName,
    primaryEmail: form.primaryEmail,
    secondaryEmail: form.secondaryEmail,
    primaryPhone: form.primaryPhone,
    secondaryPhone: form.secondaryPhone,
    preferredContactMethod: form.preferredContactMethod,
    secondaryEmailDisplay: form.secondaryEmailDisplay,
    secondaryPhoneDisplay: form.secondaryPhoneDisplay,
    homeLine1: form.homeLine1,
    homeLine2: form.homeLine2,
    homeLine3: form.homeLine3,
    homeCity: form.homeCity,
    homeState: form.homeState,
    homeZip: form.homeZip,
    homeZipExtension: form.homeZipExtension,
    homeAddressDisplay: form.homeAddressDisplay,
    mailingLine1: form.mailingLine1,
    mailingLine2: form.mailingLine2,
    mailingLine3: form.mailingLine3,
    mailingCity: form.mailingCity,
    mailingState: form.mailingState,
    mailingZip: form.mailingZip,
    mailingZipExtension: form.mailingZipExtension,
  };
}

function accountInfoBody(
  form: AccountInfoForm,
  canEditMembership: boolean,
  isAdminViewer: boolean,
): Record<string, string | boolean | null> {
  const body: Record<string, string | boolean | null> = {
    username: form.username,
    accountPhoto: form.accountPhoto === '' ? null : form.accountPhoto,
  };
  if (canEditMembership) {
    body['membershipStatus'] = form.membershipStatus;
    body['position'] = form.position;
  }
  if (isAdminViewer) {
    body['isAdmin'] = form.isAdmin;
    body['isUserMod'] = form.isUserMod;
    body['isToolEditor'] = form.isToolEditor;
    body['isPublicationEditor'] = form.isPublicationEditor;
    body['isNewsletterEditor'] = form.isNewsletterEditor;
  }
  return body;
}
