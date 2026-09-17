/**
 * The number of security cards an attacker checks: base 1 plus every ＜Security Attack ±N＞ grant
 * (each amount sign-flipped when an SA-sign-inversion is active on the attacker — EX6-031). Per
 * Comprehensive Rules §16-4-4 the result is floored at 0: if modifiers drive it below 0, the actual
 * number of security checks is 0, never negative. Exported so the floor is a unit-testable contract
 * rather than an unobservable defensive guard (the consumer also treats <= 0 as "no check").
 */
export function securityStrikeCount(saGrants: ReadonlyArray<{ amount?: number }>, invert: boolean): number {
  const sum = saGrants.reduce((acc, g) => {
    const amount = g.amount ?? 1;
    return acc + (invert ? -amount : amount);
  }, 0);
  return Math.max(0, 1 + sum);
}
