// Tests for app/js/spaceweather.js. The CME lists in this file are MOCK TEST DATA, NOT REAL
// DONKI records, except the baked file read at the end (real, fetched from api.nasa.gov).
import fs from 'node:fs';
import { marsArrivals, fromBaked, merge, check, LONGEST_TRANSIT_D } from '../../app/js/spaceweather.js';
let n = 0, bad = 0;
const ok = (c, msg) => { n++; if (!c) { bad++; console.log('FAIL', msg); } };
const D = (s) => Date.parse(s);

// MOCK TEST DATA
const sw = { fetched: D('2026-11-14T09:00Z'), from: D('2026-09-15T00:00Z'), mars_cme: [
  { cme: 'MOCK-1', start: '2026-11-01T00:00Z', arrival: '2026-11-05T00:00Z' },   // 4 day transit
  { cme: 'MOCK-2', start: '2026-11-09T12:00Z', arrival: '2026-11-13T12:00Z' },
] };
ok(check(null, 0, 1).state === 'none', 'no list');
ok(check(sw, D('2026-11-13T00:00Z'), D('2026-11-13T04:00Z')).state === 'cme', 'arrival 8 h after the EVA is near');
ok(check(sw, D('2026-11-10T00:00Z'), D('2026-11-10T04:00Z')).state === 'clear', 'inside cover, nothing near');
ok(check(sw, D('2026-11-16T10:00Z'), D('2026-11-16T14:00Z')).state === 'clear', '2 days past the fetch is inside the 4 day transit');
ok(check(sw, D('2026-11-18T08:00Z'), D('2026-11-18T12:00Z')).state === 'ahead', 'past fetch + shortest transit has no forecast');
ok(check(sw, D('2026-11-25T08:00Z'), D('2026-11-25T12:00Z')).state === 'ahead', 'far future is never an all-clear');
ok(check(sw, D('2026-09-16T00:00Z'), D('2026-09-16T04:00Z')).state === 'before', 'before the list reaches back');
ok(check({ ...sw, mars_cme: [] }, D('2026-11-14T10:00Z'), D('2026-11-14T14:00Z')).state === 'ahead', 'an empty list clears nothing after its fetch time');
ok(check({ ...sw, mars_cme: [] }, D('2026-11-13T10:00Z'), D('2026-11-13T14:00Z')).state === 'clear', 'an empty list clears the past it covers');

// merge: the live list replaces the overlap and moves the fetch time
const live = { fetched: D('2026-11-20T00:00Z'), from: D('2026-11-10T00:00Z'), mars_cme: [{ cme: 'MOCK-3', start: '2026-11-17T00:00Z', arrival: '2026-11-21T06:00Z' }] };
const m = merge(sw, live);
ok(m.fetched === live.fetched && m.from === sw.from && m.live === true, 'merge keeps the older start and the newer fetch');
ok(m.mars_cme.map(c => c.cme).join() === 'MOCK-1,MOCK-2,MOCK-3', 'merge keeps launches before the live window: ' + m.mars_cme.map(c => c.cme).join());
ok(merge(sw, null) === sw, 'no live result keeps the baked list');
ok(merge({ ...sw, fetched: D('2026-10-01T00:00Z') }, live).from === live.from, 'a gap between lists drops the older one');
ok(check(m, D('2026-11-21T00:00Z'), D('2026-11-21T04:00Z')).state === 'cme', 'live CME is found');

// marsArrivals keeps the latest most-accurate Mars impact (MOCK TEST DATA in DONKI's shape)
const arr = marsArrivals([{ activityID: 'MOCK-A', startTime: '2026-11-01T00:00Z', cmeAnalyses: [
  { isMostAccurate: false, speed: 500, enlilList: [{ modelCompletionTime: '2026-11-01T09:00Z', impactList: [{ location: 'Mars', arrivalTime: '2026-11-05T00:00Z' }] }] },
  { isMostAccurate: true, speed: 700, enlilList: [
    { modelCompletionTime: '2026-11-01T05:00Z', impactList: [{ location: 'Mars', arrivalTime: '2026-11-04T00:00Z' }] },
    { modelCompletionTime: '2026-11-01T07:00Z', impactList: [{ location: 'STEREO A', arrivalTime: '2026-11-03T00:00Z' }, { location: 'Mars', arrivalTime: '2026-11-04T06:00Z', isGlancingBlow: true }] }] }] },
  { activityID: 'MOCK-B', startTime: '2026-11-02T00:00Z', cmeAnalyses: [{ isMostAccurate: true, enlilList: [{ impactList: null }] }] },
  { activityID: 'MOCK-C', startTime: '2026-11-02T00:00Z', cmeAnalyses: null }]);
ok(arr.length === 1 && arr[0].arrival === '2026-11-04T06:00Z' && arr[0].speed_kms === 700 && arr[0].glancing === true, 'latest most-accurate Mars arrival: ' + JSON.stringify(arr));

// the real baked file parses and covers its own fetch day
const baked = fromBaked(JSON.parse(fs.readFileSync(new URL('../../app/data/spaceweather.json', import.meta.url))));
ok(baked && baked.mars_cme.length > 0 && isFinite(baked.fetched) && isFinite(baked.from), 'baked file parses');
ok(['clear', 'cme'].includes(check(baked, baked.fetched - 3600e3, baked.fetched).state), 'baked file covers the hour before its fetch');
ok(check(baked, baked.fetched + 30 * 86400e3, baked.fetched + 30 * 86400e3 + 4 * 3600e3).state === 'ahead', 'baked file never clears a date 30 days later');
ok(LONGEST_TRANSIT_D * 86400e3 >= Math.max(...baked.mars_cme.map(c => Date.parse(c.arrival) - Date.parse(c.start))), 'longest baked transit is inside LONGEST_TRANSIT_D');
console.log(`${n - bad}/${n} space weather tests passed`);
process.exit(bad ? 1 : 0);
