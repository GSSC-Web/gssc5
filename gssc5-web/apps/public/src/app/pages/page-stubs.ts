import { Component } from '@angular/core';

// Page contents belong to GSSC5-14–20/30. These stubs only resolve routes for the App Root.
// HomePage lives in ./home/ (GSSC5-25 demo Section).

export { HomePage } from './home/home';

// @relation(GSSC-PLLR-9, scope=range_start, role=Implementation)
@Component({
  selector: 'gssc-membership-page',
  template: '',
})
export class MembershipPage {}
// @relation(GSSC-PLLR-9, scope=range_end, role=Implementation)

// @relation(GSSC-PLLR-10, scope=range_start, role=Implementation)
@Component({
  selector: 'gssc-leadership-page',
  template: '',
})
export class LeadershipPage {}
// @relation(GSSC-PLLR-10, scope=range_end, role=Implementation)

// @relation(GSSC-PLLR-11, scope=range_start, role=Implementation)
@Component({
  selector: 'gssc-calendar-page',
  template: '',
})
export class CalendarPage {}
// @relation(GSSC-PLLR-11, scope=range_end, role=Implementation)

// @relation(GSSC-PLLR-12, scope=range_start, role=Implementation)
@Component({
  selector: 'gssc-publications-page',
  template: '',
})
export class PublicationsPage {}
// @relation(GSSC-PLLR-12, scope=range_end, role=Implementation)

// ResearchToolsPage lives in ./research-tools/ (GSSC5-18).

// @relation(GSSC-PLLR-14, scope=range_start, role=Implementation)
@Component({
  selector: 'gssc-newsletters-page',
  template: '',
})
export class NewslettersPage {}
// @relation(GSSC-PLLR-14, scope=range_end, role=Implementation)
