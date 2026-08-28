import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-093.js";
import "./BT13-007.js";

describe("BT13-093 Omekamon", () => {
  it("draws on play and optionally places a Royal Knight from hand under a breeding-area King Drasil", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 1,
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "PlaceUnder",
      optional: true,
      from: ["hand"],
      target: {
        filter: {
          controller: "mine",
          zone: "hand",
          kind: ["Digimon"],
          nameOrTrait: [{ match: "trait", tokens: ["Royal Knight"] }],
        },
        count: 1,
      },
      underFilter: {
        controller: "mine",
        zone: "breeding",
        nameOrTrait: [{ match: "nameExact", tokens: ["King Drasil_7D6"] }],
      },
      position: "bottom",
    });
  });

  it("draws a card through the live on-play effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-093", as: "omeka" }], deck: [{ card: "BT1-001", as: "drawn" }] },
    });
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("omeka"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-001");
  });

  it("places one Royal Knight from hand under the exact breeding-area King Drasil", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-093", as: "omeka" }],
          breeding: { card: "BT13-007", as: "drasil" },
          hand: [{ card: "BT13-040", as: "royal" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnDeletion, s.perm("omeka"));
    await settle(() => s.perm("drasil").stack.some((card) => card.instanceId === s.inst("royal").instanceId));
    expect(s.perm("drasil").stack.some((card) => card.instanceId === s.inst("royal").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("royal").instanceId)).toBe(false);
  });
});
