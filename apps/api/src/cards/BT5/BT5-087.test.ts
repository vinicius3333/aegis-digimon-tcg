import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-087.js";

describe("BT5-087 Omnimon Zwart", () => {
  it("mills three then plays up to two eligible Digimon from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-087", as: "omnimon" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          trash: [{ card: "BT5-059", as: "black" }, { card: "BT5-071", as: "purple" }],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("omnimon"));
    await settle(() => s.state.players[0]!.battleArea.length === 3);

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("black").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("purple").instanceId)).toBe(true);
  });

  it("returns a level 6 source to hand to delete an unsuspended Digimon when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-087", under: [{ card: "BT5-070", as: "level6" }], as: "omnimon" }] },
        1: { battleArea: [{ card: "BT2-047", as: "target" }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("omnimon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("level6").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
