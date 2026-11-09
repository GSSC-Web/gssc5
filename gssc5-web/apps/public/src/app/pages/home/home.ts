import { Component } from '@angular/core';
import { Section, type SectionContents } from '../../modules/section/section';

const HOME_DEMO_CONTENTS: SectionContents = {
  header: 'Welcome',
  body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  resources: [{ name: 'Google', href: 'https://www.google.com' }],
};

// Page contents belong to GSSC5-14. Demo Section under GSSC5-25 only.
// @relation(GSSC-PLLR-8, scope=range_start, role=Implementation)
@Component({
  selector: 'gssc-home-page',
  imports: [Section],
  templateUrl: './home.html',
})
export class HomePage {
  protected readonly demoContents = HOME_DEMO_CONTENTS;
}
// @relation(GSSC-PLLR-8, scope=range_end, role=Implementation)
