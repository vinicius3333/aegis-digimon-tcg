import { describe, expect, it } from "vitest";
import { ownPermanentTapDestination } from "./ownPermanentStack";

describe("own permanent stack inspection", () => {
  it.each([
    { action: "attack", canAttack: true, canVortex: false, canPromote: false },
    { action: "Vortex", canAttack: false, canVortex: true, canPromote: false },
    { action: "promotion", canAttack: false, canVortex: false, canPromote: true },
  ])("opens the action menu when $action is available", ({ canAttack, canVortex, canPromote }) => {
    expect(ownPermanentTapDestination({ canAttack, canVortex, canPromote })).toBe("menu");
  });

  it("opens the stack directly when no contextual action is available", () => {
    expect(
      ownPermanentTapDestination({
        canAttack: false,
        canVortex: false,
        canPromote: false,
      }),
    ).toBe("stack");
  });
});
