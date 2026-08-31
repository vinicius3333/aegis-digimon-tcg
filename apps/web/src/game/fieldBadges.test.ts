import { describe, expect, it } from "vitest";
import { ArraySchema } from "@colyseus/schema";
import { CardInstance, Permanent } from "@aegis/shared";
import { BLOCKER_KEYWORD, dpChipColors, hasBlocker, restrictionBadges, sourceCountBadge } from "./fieldBadges";

function permanent({
  cardId,
  keywords = [],
  stackCardIds = [],
}: {
  cardId: string;
  keywords?: readonly string[];
  stackCardIds?: readonly string[];
}): Permanent {
  const perm = new Permanent();
  perm.permanentId = "p1";
  perm.topCard = Object.assign(new CardInstance(), { instanceId: "p1-top", cardId });
  perm.keywords = new ArraySchema<string>(...keywords);
  perm.stack = new ArraySchema<CardInstance>(
    ...stackCardIds.map((id, index) => Object.assign(new CardInstance(), { instanceId: `p1-${index}`, cardId: id })),
  );
  return perm;
}

describe("hasBlocker", () => {
  it("reads the server's resolved keyword list, printed or granted alike", () => {
    // `Permanent.keywords` already folds a granted Blocker in, which is exactly
    // why the badge must not be read off the card's printed text.
    expect(hasBlocker(permanent({ cardId: "ST1-07", keywords: [BLOCKER_KEYWORD] }))).toBe(true);
    expect(hasBlocker(permanent({ cardId: "ST1-07", keywords: ["Piercing"] }))).toBe(false);
    expect(hasBlocker(permanent({ cardId: "ST1-07" }))).toBe(false);
  });
});

describe("sourceCountBadge", () => {
  it("counts the digivolution cards and tints by the card standing on top", () => {
    const badge = sourceCountBadge(permanent({ cardId: "ST1-07", stackCardIds: ["ST1-03", "ST1-01"] }));
    expect(badge?.count).toBe(2);
    expect(badge?.color).toBe("Red");
  });

  it("shows nothing when nothing is stacked underneath", () => {
    expect(sourceCountBadge(permanent({ cardId: "ST1-07" }))).toBeNull();
  });
});

describe("dpChipColors", () => {
  it("reports one colour twice for a single-colour Digimon", () => {
    const chip = dpChipColors(permanent({ cardId: "ST1-07" }));
    expect(chip.split).toBe(false);
    expect(chip.from).toBe(chip.to);
  });

  it("splits the chip across both colours of a dual-colour Digimon", () => {
    const chip = dpChipColors(permanent({ cardId: "AD1-004" }));
    expect(chip.split).toBe(true);
    expect(chip.from).not.toBe(chip.to);
  });

  it("survives a card the client has no definition for", () => {
    const chip = dpChipColors(permanent({ cardId: "NOT-A-CARD" }));
    expect(chip.split).toBe(false);
    expect(chip.from).toBeTruthy();
  });
});

describe("restrictionBadges", () => {
  function restricted(flags: Partial<Record<string, boolean>>): Permanent {
    return Object.assign(permanent({ cardId: "ST1-07" }), flags);
  }

  it("wears nothing while no restriction is imposed", () => {
    expect(restrictionBadges(restricted({}))).toEqual([]);
  });

  it("wears a chip for each of the server's blanket locks, in reading order", () => {
    const badges = restrictionBadges(
      restricted({ cannotActivateWhenDigivolving: true, cannotAttack: true, cannotUnsuspend: true }),
    );
    expect(badges.map((badge) => badge.kind)).toEqual([
      "cannotAttack",
      "cannotUnsuspend",
      "cannotActivateWhenDigivolving",
    ]);
    expect(badges.every((badge) => badge.labelKey.startsWith("game.restriction."))).toBe(true);
  });

  it("reads the unsuspend and [When Digivolving] locks apart from each other", () => {
    expect(restrictionBadges(restricted({ cannotUnsuspend: true })).map((badge) => badge.kind)).toEqual([
      "cannotUnsuspend",
    ]);
    expect(restrictionBadges(restricted({ cannotActivateWhenDigivolving: true })).map((badge) => badge.kind)).toEqual([
      "cannotActivateWhenDigivolving",
    ]);
  });
});
