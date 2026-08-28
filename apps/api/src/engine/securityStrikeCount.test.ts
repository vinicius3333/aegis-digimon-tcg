import { describe, it, expect } from "vitest";
import { securityStrikeCount } from "./GameEngine.js";

/**
 * WR-04: the security-check strike count (base 1 + signed ＜Security Attack ±N＞ grants, each amount
 * sign-flipped while an SA-sign-inversion is active) must floor at 0 per Comprehensive Rules
 * §16-4-4 ("even if a negative value is the result of the number of security checks being modified,
 * the actual number of security checks is 0").
 *
 * FAILS-WHEN-REVERTED: drop the `Math.max(0, ...)` in securityStrikeCount and the
 * "≥ +1 ＜SA＞ grants under inversion" cases return a NEGATIVE strike => the `toBe(0)` assertions
 * go RED. The downstream consumer happens to also guard `strike <= 0`, so the floor's observable
 * contract is exactly this return value — hence a direct unit test rather than a board-state one.
 */
describe("securityStrikeCount — §16-4-4 floor", () => {
  it("base attacker with no grants checks 1", () => {
    expect(securityStrikeCount([], false)).toBe(1);
  });

  it("sums positive ＜SA +N＞ grants above the base", () => {
    expect(securityStrikeCount([{ amount: 1 }, { amount: 2 }], false)).toBe(4);
  });

  it("a ＜SA -1＞ grant reduces to 0 (1 + -1), never below", () => {
    expect(securityStrikeCount([{ amount: -1 }], false)).toBe(0);
  });

  it("a ＜SA -2＞ grant floors at 0, not -1 (§16-4-4)", () => {
    expect(securityStrikeCount([{ amount: -2 }], false)).toBe(0);
  });

  it("inversion flips ＜SA -1＞ to +1 => strike 2 (EX6-031 intended case)", () => {
    expect(securityStrikeCount([{ amount: -1 }], true)).toBe(2);
  });

  it("inversion flips ＜SA +2＞ to -2 => 1 + (-2) = -1 floored to 0 (WR-04 hazard)", () => {
    expect(securityStrikeCount([{ amount: 1 }, { amount: 1 }], true)).toBe(0);
  });

  it("inversion flips three ＜SA +1＞ to -1 each => 1 + (-3) = -2 floored to 0", () => {
    expect(securityStrikeCount([{ amount: 1 }, { amount: 1 }, { amount: 1 }], true)).toBe(0);
  });

  it("treats a grant with no amount as ±1 (default)", () => {
    expect(securityStrikeCount([{}], false)).toBe(2);
    expect(securityStrikeCount([{}], true)).toBe(0);
  });
});
