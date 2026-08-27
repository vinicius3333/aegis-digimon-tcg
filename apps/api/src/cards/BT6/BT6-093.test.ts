import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-093.js";

describe("BT6-093 Judgment of the Blade", () => {
  it("may play Sistermon from security, then adds itself to hand", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT6-093", as: "security", faceUp: true }],
          hand: [{ card: "BT6-082", as: "sistermon" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const securityId = s.inst("security").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));

    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("sistermon").instanceId,
      ),
    ).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === securityId)).toBe(true);
  });

  it("lets the chosen Huckmon attack an unsuspended opponent Digimon for the turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT6-009", as: "huckmon" }], hand: [{ card: "BT6-093", as: "option" }] },
        1: { battleArea: [{ card: "BT1-009", as: "unsuspended", suspended: false }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const targetId = s.perm("unsuspended").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT6-093"));

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("huckmon").permanentId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: true });
  });

  it("exposes eligible Huckmon-family Digimon as board targets", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-009", as: "firstHuckmon" },
          { card: "BT6-009", as: "secondHuckmon", under: ["BT1-001"] },
        ],
        hand: [{ card: "BT6-093", as: "option" }],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const latest = s.decisions.at(-1)?.req;
      return (
        latest !== undefined &&
        latest.decisionId === s.state.pendingDecision?.decisionId &&
        latest.kind === "chooseTargets" &&
        latest.sourceCardId === "BT6-093"
      );
    });

    const decision = s.decisions.at(-1)!.req;
    expect(decision.options?.candidateInstanceIds).toEqual([
      s.perm("firstHuckmon").permanentId,
      s.perm("secondHuckmon").permanentId,
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: {
          kind: "chooseTargets",
          instanceIds: [s.perm("secondHuckmon").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined && s.state.players[0]!.trash.some((card) => card.cardId === "BT6-093"),
    );

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT6-093")).toBe(true);
  });
});
