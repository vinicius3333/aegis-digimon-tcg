import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../ST6/ST6-04.js";
import "./BT2-108.js";

describe("BT2-108 Night Raid", () => {
  it("plays a purple level 3 from trash without its On Play", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT2-067"], hand: [{ card: "BT2-108", as: "option" }], trash: ["BT2-067"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT2-067")).toBe(true);
  });

  it("offers only purple level 3 Digimon from trash", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT2-067"],
        hand: [{ card: "BT2-108", as: "option" }],
        trash: [
          { card: "BT2-067", as: "eligible" },
          { card: "ST6-04", as: "eligibleOnPlay" },
          { card: "BT2-071", as: "levelFour" },
          { card: "BT2-034", as: "wrongColor" },
        ],
      },
    });
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === decision.decisionId)!.req;
    expect(request.options!.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.inst("eligible").instanceId, s.inst("eligibleOnPlay").instanceId]),
    );
    expect(request.options!.candidateInstanceIds).toHaveLength(2);
  });

  it("atomically suppresses the revived Digimon's On Play effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT2-067"],
          hand: [{ card: "BT2-108", as: "nightRaid" }],
          trash: [
            { card: "ST6-04", as: "dracmon" },
            { card: "ST6-15", as: "option" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nightRaid").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("dracmon").instanceId),
    );
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("activates its Main play-from-trash effect from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT2-108", as: "securityOption", faceUp: true }],
          trash: [{ card: "BT2-067", as: "revived" }],
        },
      },
      { autoSelectCards: true },
    );
    const revivedId = s.inst("revived").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === revivedId)).toBe(true);
  });
});
