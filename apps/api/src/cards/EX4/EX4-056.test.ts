import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-056.js";

describe("EX4-056 Crowmon", () => {
  it("may digivolve into Ravemon from hand when a purple Tamer is in play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      optional: true,
      into: { nameOrTrait: [{ match: "nameExact", tokens: ["Ravemon"] }] },
      condition: { kind: "youHave", filter: { kind: ["Tamer"], colors: ["Purple"] } },
    });
  });
  it("inherits deletion of an opposing level five or lower Digimon outside battle", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 5 } } },
          condition: { kind: "not", condition: { kind: "triggerRemovalCause", removalCause: "byBattle" } },
        },
      ],
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-056");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("deletes one opposing level-five-or-lower Digimon after an outside-battle deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-010", as: "host", under: ["EX4-056"] }] },
        1: {
          battleArea: [
            { card: "BT1-013", as: "low" },
            { card: "AD1-025", as: "high" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-013")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "AD1-025")).toBe(true);

    const battle = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "host", under: ["EX4-056"] }] },
      1: { battleArea: [{ card: "BT1-013", as: "low" }] },
    });
    await battle.ready();
    await advance(battle.engine).verb.deletePermanent([battle.perm("host").permanentId], "byBattle");
    await settle();
    expect(battle.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-013")).toBe(true);
  });

  ex4CardBehaviorTests("EX4-056");
});
