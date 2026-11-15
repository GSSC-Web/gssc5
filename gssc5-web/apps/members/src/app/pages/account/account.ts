import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  accountApi,
  AccountRecord,
  evaluatePasswordCriteria,
  PASSWORD_MIN_LENGTH,
  passwordCriteriaSatisfied,
  PrivilegeKey,
  SITE_PRIVILEGES,
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

  // Signals mirrored from ngModel fields for live criteria.
  private readonly newPasswordSignal = signal('');
  private readonly confirmPasswordSignal = signal('');

  ngOnInit(): void {
    void this.bootstrap();
  }

  onNewPasswordInput(value: string): void {
    this.newPassword = value;
    this.newPasswordSignal.set(value);
  }

  onConfirmPasswordInput(value: string): void {
    this.confirmPassword = value;
    this.confirmPasswordSignal.set(value);
  }

  // @relation(GSSC-MLLR-133, scope=range_start, role=Implementation)
  resetMemberInfo(): void {
    this.memberInfo = { ...this.loadedMemberInfo };
    this.memberMessage.set('');
  }
  // @relation(GSSC-MLLR-133, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-134, scope=range_start, role=Implementation)
  async submitMemberInfo(): Promise<void> {
    if (this.memberSubmitting() || this.unavailable()) return;
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
  // @relation(GSSC-MLLR-134, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-141, scope=range_start, role=Implementation)
  async submitAccountInfo(): Promise<void> {
    if (this.accountSubmitting() || this.unavailable()) return;
    this.accountSubmitting.set(true);
    this.accountMessage.set('');
    try {
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
  // @relation(GSSC-MLLR-141, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-149, GSSC-MLLR-158, scope=range_start, role=Implementation)
  async submitPasswordChange(): Promise<void> {
    if (this.passwordSubmitting() || !this.canChangePassword()) return;
    const criteria = evaluatePasswordCriteria(this.newPassword, this.confirmPassword);
    if (!passwordCriteriaSatisfied(criteria) || !this.currentPassword) {
      this.passwordMessage.set('Password does not meet the required criteria.');
      return;
    }
    this.passwordSubmitting.set(true);
    this.passwordMessage.set('');
    try {
      const { error } = await accountApi.changePassword({
        currentPassword: this.currentPassword,
        newPassword: this.newPassword,
      });
      if (error) {
        this.passwordMessage.set('Password could not be changed.');
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
  // @relation(GSSC-MLLR-149, GSSC-MLLR-158, scope=range_end, role=Implementation)

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
    // Owner UX: membership status/position editable when viewer is admin|userMod; else grayed.
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
  };
  // accountPhoto is not yet writable on the users API; keep the control for UX.
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
