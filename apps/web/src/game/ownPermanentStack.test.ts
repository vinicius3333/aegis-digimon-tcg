import { describe, expect, it } from "vitest";
import { ownPermanentTapDestination } from "./ownPermanentStack";

describe("own permanent stack inspection", () => {
  it.each([
    { action: "attack", canAttack: true, canVortex: false, canPromote: false, hasEffects: false },
    { action: "Vortex", canAttack: false, canVortex: true, canPromote: false, hasEffects: false },
    { action: "promotion", canAttack: false, canVortex: false, canPromote: true, hasEffects: false },
    { action: "an activatable effect", canAttack: false, canVortex: false, canPromote: false, hasEffects: true },
  ])("opens the action menu when $action is available", ({ canAttack, canVortex, canPromote, hasEffects }) => {
    expect(ownPermanentTapDestination({ canAttack, canVortex, canPromote, hasEffects })).toBe("menu");
  });

  it("opens the stack directly when no contextual action is available", () => {
    expect(
      ownPermanentTapDestination({
        canAttack: false,
        canVortex: false,
        canPromote: false,
        hasEffects: false,
      }),
    ).toBe("stack");
  });
});
