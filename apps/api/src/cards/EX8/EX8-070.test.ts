import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-070.js";

describe("EX8-070", () => {
  it("selects a Mineral/Rock Digimon with digivolution cards and gives it Collision, Piercing, Reboot, +3000 DP, and return protection", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "Main")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "SelectBind", optional: true, cost: { kind: "trash" } });
    expect(actions.slice(1).map((action) => action.kind)).toEqual([
      "GainKeyword",
      "GainKeyword",
      "GainKeyword",
      "Restrict",
      "ModifyDP",
    ]);
    expect(actions[4]).toMatchObject({
      kind: "Restrict",
      restriction: "cannotReturnToHandOrDeck",
      byOpponentOnly: true,
    });
    expect(actions[5]).toMatchObject({ kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd" });
  });
  it("contains the printed main and Security effects", () => expect(compiled.effects).toHaveLength(2));
  it("deletes the exact lowest-play-cost opposing Digimon when revealed in security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", as: "attacker" }, { card: "BT1-010", as: "lowest" }, { card: "AD1-001", as: "higher" }] },
      1: { security: [{ card: "EX8-070", as: "option" }] },
    }, { autoSelectCards: true });
    const lowestInstanceId = s.perm("lowest").topCard!.instanceId;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => (s.state.players[0] as PlayerState).trash.some((card) => card.instanceId === lowestInstanceId));

    expect((s.state.players[0] as PlayerState).trash.some((card) => card.instanceId === lowestInstanceId)).toBe(true);
    expect((s.state.players[0] as PlayerState).battleArea.some((permanent) => permanent.topCard?.instanceId === s.perm("higher").topCard?.instanceId)).toBe(true);
  });
});
