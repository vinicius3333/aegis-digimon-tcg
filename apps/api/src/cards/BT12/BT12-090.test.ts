import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-030.js";
import "./BT12-031.js";
import "./BT12-090.js";

describe("BT12-090 Davis Motomiya", () => {
  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT12-090", as: "davis", faceUp: true }] } });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("davis"));

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-090")).toBe(true);
  });

  it("gains 1 memory at start of main while a Free Digimon is in play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-090", as: "davis" }, "BT12-021"] },
    });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("davis"));

    expect(s.state.memory).toBe(1);
  });

  it("suspends itself and digivolves the attacking blue-green Digimon into Imperialdramon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-090", as: "davis" },
          { card: "BT12-030", as: "attacker" },
        ],
        hand: [{ card: "BT12-031", as: "fighter" }],
      },
      1: { security: ["BT1-009"] },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");

    const optional = s.state.pendingDecision!;
    expect(s.decisions.at(-1)!.req.sourceCardId).toBe("BT12-090");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const select = s.state.pendingDecision!;
    expect(JSON.parse(select.payloadJson)).toMatchObject({
      candidateInstanceIds: [s.inst("fighter").instanceId],
      visibleInstanceIds: [s.inst("fighter").instanceId],
      min: 1,
      max: 1,
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: select.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("fighter").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard.cardId === "BT12-031");

    expect(s.perm("davis").isSuspended).toBe(true);
    expect(s.perm("attacker").topCard.cardId).toBe("BT12-031");
    expect(s.state.memory).toBe(0);
  });

  it("does not trigger for a three-color attacker even when it includes blue and green", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-090", as: "davis" },
          { card: "BT17-077", as: "attacker" },
        ],
        hand: [{ card: "BT12-031", as: "fighter" }],
      },
      1: { security: ["BT1-009"] },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.decisions.some(({ req }) => req.sourceCardId === "BT12-090")).toBe(false);
    expect(s.perm("davis").isSuspended).toBe(false);
  });
});
