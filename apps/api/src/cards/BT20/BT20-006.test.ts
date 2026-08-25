import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./BT20-006.js";

describe("BT20-006 DemiMeramon", () => {
  it("proves optional On Deletion recovery targets one of your Ghost Digimon in trash", () => {
    const action = compiled.effects.find((entry) => entry.isInherited)?.actions[0];
    expect(action).toMatchObject({
      kind: "Return",
      optional: true,
      to: "hand",
      target: {
        count: 1,
        filter: {
          zone: "trash",
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }],
        },
      },
    });
  });

  it("observably returns exactly one Ghost Digimon from its controller's trash after deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-068", dp: 5000, as: "attacker", under: ["BT20-006"] }],
          trash: [
            { card: "BT20-063", as: "ghost" },
            { card: "BT20-010", as: "nonGhost" },
          ],
        },
        1: { battleArea: [{ card: "BT20-011", dp: 10000, suspended: true, as: "defender" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ghost").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("ghost").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("nonGhost").instanceId);
    expect(s.state.players[1]!.hand).toHaveLength(0);
  });
});
