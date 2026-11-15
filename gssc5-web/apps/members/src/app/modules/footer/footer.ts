import { Component } from '@angular/core';

/** Full society name shown in the Member Footer (GSSC-MHLR-21 / GSSC-MLLR-43). */
export const MEMBER_FOOTER_ORGANIZATION_NAME =
  'Genealogical Society of Stanislaus County';

@Component({
  selector: 'gssc-footer',
  templateUrl: './footer.html',
})
export class Footer {
  protected readonly organizationName = MEMBER_FOOTER_ORGANIZATION_NAME;

  protected readonly copyrightStatement = `© ${new Date().getFullYear()} ${MEMBER_FOOTER_ORGANIZATION_NAME}. All Rights Reserved.`;
}
