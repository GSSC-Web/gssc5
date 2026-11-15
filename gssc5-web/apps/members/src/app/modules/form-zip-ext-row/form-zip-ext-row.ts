import { Component, input, model } from '@angular/core';
import { FormTextField } from '../form-text-field/form-text-field';

@Component({
  selector: 'gssc-form-zip-ext-row',
  imports: [FormTextField],
  templateUrl: './form-zip-ext-row.html',
})
export class FormZipExtRow {
  readonly zip = model<string>('');
  readonly zipExtension = model<string>('');
  readonly zipRequired = input(true);
  readonly enabled = input(true);
  readonly zipControlId = input('gssc-form-zip');
  readonly zipExtControlId = input('gssc-form-zip-ext');
  readonly zipName = input<string | null>('zip');
  readonly zipExtName = input<string | null>('zipExtension');
}
