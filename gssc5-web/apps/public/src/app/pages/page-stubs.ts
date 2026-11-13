import { Component } from '@angular/core';

// Page contents belong to GSSC5-14–20/30. These stubs only resolve routes for the App Root.
// HomePage lives in ./home/ (GSSC5-25 demo Section).
// LeadershipPage lives in ./leadership/ (GSSC5-16).
// PublicationsPage lives in ./publications/ (GSSC5-19).
// ResearchToolsPage lives in ./research-tools/ (GSSC5-18).
// NewslettersPage lives in ./newsletters/ (GSSC5-20).

export { HomePage } from './home/home';
export { LeadershipPage } from './leadership/leadership';

// @relation(GSSC-PLLR-9, scope=range_start, role=Implementation)
@Component({
  selector: 'gssc-membership-page',
  template: '',
})
export class MembershipPage {}
// @relation(GSSC-PLLR-9, scope=range_end, role=Implementation)

// @relation(GSSC-PLLR-11, scope=range_start, role=Implementation)
@Component({
  selector: 'gssc-calendar-page',
  template: '',
})
export class CalendarPage {}
// @relation(GSSC-PLLR-11, scope=range_end, role=Implementation)
