import { eventsApi } from './events-api';

test('eventsApi exposes list create get update entry points', () => {
  expect(typeof eventsApi.list).toBe('function');
  expect(typeof eventsApi.create).toBe('function');
  expect(typeof eventsApi.get).toBe('function');
  expect(typeof eventsApi.update).toBe('function');
});
