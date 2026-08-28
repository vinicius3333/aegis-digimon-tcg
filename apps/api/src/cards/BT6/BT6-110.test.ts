import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-110.js";

describe("BT6-110 Cutting Edge", () => {
  it("activates its Main effect from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT6-110", as: "security", faceUp: true }],
          hand: [{ card: "BT6-085", as: "eosmon" }],
        },
        1: { battleArea: [{ card: "BT1-014", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("eosmon").instanceId),
    ).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("deletes only an opponent Digimon whose live DP is at most the Eosmon this effect played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT6-082"],
          hand: [
            { card: "BT6-110", as: "option" },
            { card: "BT6-085", as: "eosmon" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT6-044", as: "tooLarge", dp: 7000 },
            { card: "BT1-014", as: "eligible", dp: 4000 },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    const eligibleId = s.perm("eligible").permanentId;
    const tooLargeId = s.perm("tooLarge").permanentId;
    const eosmonInstanceId = s.inst("eosmon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === eligibleId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === eosmonInstanceId)).toBe(
      true,
    );
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([tooLargeId]);
  });

  it("does not delete when the optional Eosmon play is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT6-082"],
          hand: [
            { card: "BT6-110", as: "option" },
            { card: "BT6-085", as: "eosmon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-014", as: "target" }] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT6-110"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT6-085")).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
