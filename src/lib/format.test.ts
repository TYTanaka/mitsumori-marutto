import { describe, expect, it } from 'vitest';
import { signedYen, venueDisplayName, yen } from './format';

describe('format helpers', () => {
  it('formats yen with the full digits used as the main figure', () => {
    expect(yen(2812400)).toBe('¥2,812,400');
    expect(signedYen(756400)).toBe('+¥756,400');
    expect(signedYen(-120000)).toBe('-¥120,000');
    expect(signedYen(0)).toBe('+¥0');
  });

  it('falls back to a positional name for blank venue names', () => {
    expect(venueDisplayName('', 0)).toBe('式場1');
    expect(venueDisplayName('   ', 2)).toBe('式場3');
    expect(venueDisplayName('青山ガーデンテラス', 0)).toBe(
      '青山ガーデンテラス',
    );
  });
});
