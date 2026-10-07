import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { assertNoLoudGap, setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

describe("optional processing across shared timing limits", () => {
  it.each([true, false])("tracks Leopardmon's shared use when its modal action is declined=%s", async (decline) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-053", as: "base" }],
          hand: [
            { card: "EX13-043", as: "leopardmon" },
            { card: "BT9-045", as: "mammal" },
            { card: "BT9-045", as: "secondMammal" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { security: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: false,
        autoChooseOption: true,
      },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("leopardmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const suspension = s.state.pendingDecision!;
    expect(s.decisions.at(-1)!.req.options).toMatchObject({ min: 0, max: 1, purpose: "optionalTarget" });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: suspension.decisionId,
        response: { kind: "chooseTargets", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    const playOffers = () =>
      s.decisions.filter(({ req }) => req.kind === "selectCards" && req.promptText === "Leopardmon");
    await settle(() => playOffers().length === 1);
    const play = s.state.pendingDecision!;
    expect(play.kind).toBe("selectCards");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: play.decisionId,
        response: { kind: "selectCards", instanceIds: decline ? [] : [s.inst("mammal").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX13-043" && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("mammal").instanceId)).toBe(decline);
    expect(s.perm("base").isSuspended).toBe(false);
    // The play/use selection is optional processing. Refusing it preserves the shared
    // activation for When Attacking; accepting it consumes the shared use.

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    let retryResult = { ok: true };
    if (decline) {
      await settle(() => playOffers().length === 2);
      retryResult = s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("mammal").instanceId] },
      });
    }
    expect(retryResult).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(playOffers()).toHaveLength(decline ? 2 : 1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("mammal").instanceId)).toBe(false);
    assertNoLoudGap(s);
  });
});
