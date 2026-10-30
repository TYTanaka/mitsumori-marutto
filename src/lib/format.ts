export function yen(n: number): string {
  return '¥' + n.toLocaleString('ja-JP');
}

export function man(n: number): string {
  return '約' + Math.round(n / 10000) + '万円';
}

export function signedMan(diff: number): string {
  return diff >= 0
    ? '+約' + Math.round(diff / 10000) + '万円'
    : '-約' + Math.round(-diff / 10000) + '万円';
}
