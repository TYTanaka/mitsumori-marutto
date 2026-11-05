export function yen(n: number): string {
  return '¥' + n.toLocaleString('ja-JP');
}

export function signedYen(diff: number): string {
  return diff >= 0
    ? '+¥' + diff.toLocaleString('ja-JP')
    : '-¥' + (-diff).toLocaleString('ja-JP');
}

/**
 * Display name for a venue. A blank stored name (e.g. from an old
 * persisted state) falls back to the positional default so headings
 * never render empty.
 */
export function venueDisplayName(name: string, index: number): string {
  return name.trim() === '' ? `式場${index + 1}` : name;
}

export function man(n: number): string {
  return '約' + Math.round(n / 10000) + '万円';
}

export function signedMan(diff: number): string {
  return diff >= 0
    ? '+約' + Math.round(diff / 10000) + '万円'
    : '-約' + Math.round(-diff / 10000) + '万円';
}
