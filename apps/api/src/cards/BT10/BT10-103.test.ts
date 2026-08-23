import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-103.js";

describe("BT10-103 Gran del Sol", () => {
  it("costs 6 with 2 suspended green Digimon and bottoms the suspended target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-048", suspended: true },
            { card: "BT10-053", suspended: true },
          ],
          hand: [{ card: "BT10-103", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    const targetId = s.perm("target").topCard.instanceId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.deck.some((card) => card.instanceId === targetId));

    expect(s.state.memory).toBe(4);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(targetId);
  });

  it("costs the full 8 with only 1 suspended green Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-048", suspended: true }],
          hand: [{ card: "BT10-103", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.memory).toBe(2);
  });

  it("may bottom a different suspended Digimon than the one it suspends", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT10-057"], hand: [{ card: "BT10-103", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "newlySuspended" },
            { card: "BT1-010", as: "alreadySuspended", suspended: true },
          ],
        },
      },
      { autoOrderTriggers: true },
    );
    const newlySuspendedPermanentId = s.perm("newlySuspended").permanentId;
    const alreadySuspendedPermanentId = s.perm("alreadySuspended").permanentId;
    const alreadySuspendedCardId = s.perm("alreadySuspended").topCard.instanceId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.filter(({ req }) => req.kind === "chooseTargets").length === 1);
    const suspendDecision = s.decisions.find(({ req }) => req.kind === "chooseTargets")!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: suspendDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [newlySuspendedPermanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.filter(({ req }) => req.kind === "chooseTargets").length === 2);
    const returnDecision = s.decisions.filter(({ req }) => req.kind === "chooseTargets")[1]!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: returnDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [alreadySuspendedPermanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.some((card) => card.instanceId === alreadySuspendedCardId));

    expect(s.perm("newlySuspended").isSuspended).toBe(true);
  });

  it("Security activates the same suspend and bottom-deck effect", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT10-103", as: "option", faceUp: true }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    const targetId = s.perm("target").topCard.instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[1]!.deck.some((card) => card.instanceId === targetId));

    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(targetId);
  });
});
