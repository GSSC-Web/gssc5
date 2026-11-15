import { Component, input } from '@angular/core';

/** One password rule with live satisfied state. */
export type PasswordCriterion = {
  id: string;
  label: string;
  satisfied: boolean;
};

@Component({
  selector: 'gssc-form-password-criteria',
  templateUrl: './form-password-criteria.html',
})
export class FormPasswordCriteria {
  readonly criteria = input.required<readonly PasswordCriterion[]>();
}
