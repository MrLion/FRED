import {describe,it,expect} from 'vitest';
import {snapshotData,snapshotChange,snapshotValue,observationLabel} from '../snapshot';
const obs=(date,value)=>({date,value:String(value)});
describe('national snapshot measurements',()=>{
 it('labels rate differences as percentage points rather than relative percentages',()=>{
  const result=snapshotData('UNRATE',{},[obs('2026-10-01',4.1),obs('2026-09-01',4.2)]);
  expect(result.delta).toBeCloseTo(-.1);expect(snapshotChange(result.delta,'UNRATE')).toBe('-0.1 percentage points');expect(snapshotValue(result.value,'UNRATE')).toBe('4.1%');
 });
 it('handles an unchanged or zero prior interest rate',()=>{
  expect(snapshotData('FEDFUNDS',{},[obs('2026-10-01',0),obs('2026-09-01',0)]).delta).toBe(0);
 });
 it('keeps CPI as an index and labels its monthly percentage movement',()=>{
  const result=snapshotData('CPIAUCSL',{},[obs('2026-10-01',101),obs('2026-09-01',100)]);
  expect(snapshotChange(result.delta,'CPIAUCSL')).toBe('+1%');expect(snapshotValue(result.value,'CPIAUCSL')).toBe('101');
 });
 it('does not calculate a monthly change across a missing month',()=>{
  const result=snapshotData('UNRATE',{},[obs('2026-10-01',4.1),obs('2026-09-01','.'),obs('2026-08-01',4.2)]);
  expect(result.delta).toBeNull();
 });
 it('matches the observation date to the latest valid value',()=>{
  const result=snapshotData('UNRATE',{},[obs('2026-10-01','.'),obs('2026-09-01',4.2),obs('2026-08-01',4.1)]);
  expect(result.date).toBe('2026-09-01');expect(result.value).toBe(4.2);
 });
 it('identifies a nominal quarterly GDP change without annualizing it',()=>{
  const result=snapshotData('GDP',{},[obs('2026-07-01',102),obs('2026-04-01',100)]);
  expect(result.delta).toBeCloseTo(2);expect(result.units).toContain('current dollars');expect(observationLabel(result.date,'GDP')).toBe('Q3 2026');
 });
 it.each([['2026-01-01','Q1 2026'],['2026-04-01','Q2 2026'],['2026-07-01','Q3 2026'],['2026-10-01','Q4 2026']])('formats quarter %s', (date,label)=>expect(observationLabel(date,'GDP')).toBe(label));
});
