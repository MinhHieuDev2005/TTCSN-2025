import assert from 'node:assert/strict';
import {dashboardRange, validDashboardRange} from '../src/utils/dashboard.js';

assert.deepEqual(dashboardRange(1, new Date('2026-11-13T18:00:00Z')), {fromDate: '2026-11-14', toDate: '2026-11-14'});
assert.deepEqual(dashboardRange(7, new Date('2026-01-02T00:00:00Z')), {fromDate: '2025-12-27', toDate: '2026-01-02'});
assert.deepEqual(dashboardRange(30, new Date('2024-03-01T00:00:00Z')), {fromDate: '2024-02-01', toDate: '2024-03-01'});
assert.equal(validDashboardRange({fromDate: '2024-01-01', toDate: '2024-12-31'}), true);
assert.equal(validDashboardRange({fromDate: '2024-01-01', toDate: '2025-01-01'}), false);
assert.equal(validDashboardRange({fromDate: '2026-02-30', toDate: '2026-03-02'}), false);
assert.equal(validDashboardRange({fromDate: '2026-11-15', toDate: '2026-11-14'}), false);
assert.equal(validDashboardRange({fromDate: '', toDate: '2026-11-14'}), false);
assert.equal(validDashboardRange({fromDate: '1969-12-31', toDate: '1970-01-01'}), false);
console.log('PASS: Vietnam date presets, year/leap boundaries and dashboard range validation.');
