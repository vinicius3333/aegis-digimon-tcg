import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-023.js";

describe("BT1-023 SkullGreymon", () => {
  it("deletes an opponent Digimon with Blocker", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT1-023", as: "skullGreymon" }] },
      1: { battleArea: [{ card: "BT1-072", as: "blocker", dp: 6000 }, { card: "BT1-070", as: "other", dp: 4000 }] },
    }, { autoSelectCards: true });
    const opponent = s.state.players[1] as PlayerState;
    const blockerId = s.perm("blocker").permanentId;
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skullGreymon").instanceId })).toEqual({ ok: true });
    await settle(() => !opponent.battleArea.some((permanent) => permanent.permanentId === blockerId));

    expect(opponent.battleArea.map((permanent) => permanent.permanentId)).toContain(s.perm("other").permanentId);
  });
});
