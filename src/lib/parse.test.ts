import { describe, expect, it } from 'vitest';
import {
  normalizeNumericText,
  parseCountInput,
  parseYenInput,
} from './parse';

describe('numeric input parsing', () => {
  it('normalizes full-width digits and signs to half-width', () => {
    expect(normalizeNumericText('５０００')).toBe('5000');
    expect(normalizeNumericText('－３００')).toBe('-300');
    expect(normalizeNumericText('１，０００')).toBe('1,000');
  });

  it('parses full-width yen input instead of dropping it to zero', () => {
    expect(parseYenInput('５０００')).toEqual({ ok: true, value: 5000 });
    expect(parseYenInput('５０００円')).toEqual({ ok: true, value: 5000 });
  });

  it('honours a minus sign so discount lines stay negative', () => {
    expect(parseYenInput('-300000')).toEqual({ ok: true, value: -300000 });
    expect(parseYenInput('-300,000')).toEqual({
      ok: true,
      value: -300000,
    });
    expect(parseYenInput('－３０００００')).toEqual({
      ok: true,
      value: -300000,
    });
  });

  it('tolerates yen symbols and thousands separators', () => {
    expect(parseYenInput('¥2,056,000')).toEqual({
      ok: true,
      value: 2056000,
    });
    expect(parseYenInput('300000円')).toEqual({ ok: true, value: 300000 });
  });

  it('rejects input that is not a plain integer', () => {
    expect(parseYenInput('abc')).toEqual({ ok: false });
    expect(parseYenInput('12a3')).toEqual({ ok: false });
    expect(parseYenInput('1.5')).toEqual({ ok: false });
    expect(parseYenInput('')).toEqual({ ok: false });
    expect(parseYenInput('-')).toEqual({ ok: false });
  });

  it('parses headcounts with the same normalization', () => {
    expect(parseCountInput('６０')).toEqual({ ok: true, value: 60 });
    expect(parseCountInput('-１０')).toEqual({ ok: true, value: -10 });
    expect(parseCountInput('六十')).toEqual({ ok: false });
  });
});
