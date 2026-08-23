import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { compiled as oblivionBird } from "./BT1-094.js";
import { compiled as braveShield } from "./BT1-095.js";
import { compiled as heartsAttack } from "./BT1-099.js";
import { compiled as graceCrossFreezer } from "./BT1-100.js";
import { compiled as howlingCrusher } from "./BT1-101.js";
import { compiled as bladeOfTheTrue } from "./BT1-102.js";
import { compiled as testament } from "./BT1-103.js";
import { compiled as hornBuster } from "./BT1-108.js";
import { compiled as flowerCannon } from "./BT1-110.js";
import { compiled as gigaBlaster } from "./BT1-111.js";
import { compiled as forbiddenTemptation } from "./BT1-113.js";

describe("BT1 option IR coverage", () => {
  it("registers complete Main and Security behavior", () => {
    for (const card of [
      oblivionBird,
      braveShield,
      heartsAttack,
      graceCrossFreezer,
      howlingCrusher,
      bladeOfTheTrue,
      testament,
      hornBuster,
      flowerCannon,
      gigaBlaster,
      forbiddenTemptation,
    ]) {
      expect(card).toMatchObject({ coverage: "full", residual: [] });
    }
  });

  it("preserves target counts, source operations, durations, and modal branches", () => {
    expect(irNode(oblivionBird.effects[0]?.actions[0])?.target.filter.keywords).toContainEqual({ keyword: "Blocker" });
    expect(braveShield.effects[0]?.actions[1]).toMatchObject({ kind: "GainKeyword", duration: "untilOpponentTurnEnd" });
    expect(heartsAttack.effects[0]?.actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: "all" });
    expect(graceCrossFreezer.effects[0]?.actions[0]).toMatchObject({ kind: "Restrict", restriction: "attack" });
    expect(howlingCrusher.effects[0]?.actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: "all" });
    expect(bladeOfTheTrue.effects[0]?.actions[0]?.scaling).toMatchObject({ per: 2, unit: "security" });
    expect(testament.effects[1]?.actions).toMatchObject([{ kind: "Draw", amount: 1 }, { kind: "AddToHandSelf" }]);
    expect(hornBuster.effects[1]?.actions[1]).toMatchObject({ kind: "AddToHandSelf" });
    expect(gigaBlaster.effects[0]?.actions[0]).toMatchObject({ kind: "ConditionalBranch" });
    expect(forbiddenTemptation.effects[0]?.actions).toMatchObject([
      { kind: "Restrict", restriction: "attack" },
      { kind: "Restrict", restriction: "block" },
    ]);
  });
});
