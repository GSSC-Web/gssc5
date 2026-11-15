import {
  filterSectionsVisibleOn,
  isSectionVisibleOn,
  type SectionDisplayBounds,
} from './section-display-window';

const unset: SectionDisplayBounds = {
  startMonth: null,
  startDay: null,
  startYear: null,
  endMonth: null,
  endDay: null,
  endYear: null,
};

const today = new Date(2026, 10, 15); // Nov 15, 2026 local

// @relation(GSSC-MLLR-124, scope=range_start, role=Test)
test('GSSC-MLLR-124 Semantic', () => {
  expect(isSectionVisibleOn(unset, today)).toBe(true);

  const futureStart: SectionDisplayBounds = {
    ...unset,
    startMonth: 12,
    startDay: 1,
    startYear: 2026,
  };
  expect(isSectionVisibleOn(futureStart, today)).toBe(false);

  const pastEnd: SectionDisplayBounds = {
    ...unset,
    endMonth: 10,
    endDay: 31,
    endYear: 2026,
  };
  expect(isSectionVisibleOn(pastEnd, today)).toBe(false);

  const window: SectionDisplayBounds = {
    startMonth: 11,
    startDay: 1,
    startYear: 2026,
    endMonth: 11,
    endDay: 30,
    endYear: 2026,
  };
  expect(isSectionVisibleOn(window, today)).toBe(true);
  expect(isSectionVisibleOn(window, new Date(2026, 10, 1))).toBe(true);
  expect(isSectionVisibleOn(window, new Date(2026, 10, 30))).toBe(true);
  expect(isSectionVisibleOn(window, new Date(2026, 9, 31))).toBe(false);
  expect(isSectionVisibleOn(window, new Date(2026, 11, 1))).toBe(false);

  const filtered = filterSectionsVisibleOn(
    [
      { ...unset, cuid: 'always' },
      { ...futureStart, cuid: 'later' },
      { ...window, cuid: 'now' },
    ],
    today,
  );
  expect(filtered.map((entry) => entry.cuid)).toEqual(['always', 'now']);
});
// @relation(GSSC-MLLR-124, scope=range_end, role=Test)
