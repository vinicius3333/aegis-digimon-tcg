import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT6/BT6-111.js";
import "../BT7/BT7-056.js";
import "../BT8/BT8-069.js";
import "../P/P-070.js";
import "./BT9-066.js";
import "./BT9-109.js";
import "./BT9-111.js";

describe("Alphamon X Antibody SEC / promo deck", () => {
  it("preserves the inherited X Antibody clause through its attack-time SEC evolution decisions", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT9-066",
              as: "alphamon",
              under: ["BT8-069", "BT9-109"],
            },
          ],
          hand: [{ card: "BT9-111", as: "ouryuken" }],
        },
        1: {
          battleArea: [
            { card: "BT2-047", as: "highest" },
            { card: "BT1-015", as: "survivor" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoOrderTriggers: true },
    );
    const ouryukenId = s.inst("ouryuken").instanceId;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("alphamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const request = s.decisions.at(-1)?.req;
      return request?.kind === "optional" && request.sourceCardId === "BT9-109";
    });

    const optional = s.decisions.at(-1)!.req;
    expect(optional.options?.effectText).toContain("[When Attacking]");
    expect(optional.options?.effectText).toContain("[X Antibody] in its traits");
    expect(optional.options?.effectText).not.toContain("[Main] Place this card under");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });

    await settle(() => {
      const request = s.decisions.at(-1)?.req;
      return request?.kind === "selectCards" && request.sourceCardId === "BT9-109";
    });
    const selection = s.decisions.at(-1)!.req;
    expect(selection.options?.effectText).toBe(optional.options?.effectText);
    expect(selection.options?.timing).toBe("WhenAttacking");
    const selectionResult = s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: selection.decisionId,
      response: { kind: "selectCards", instanceIds: [ouryukenId] },
    });
    expect([true, "decision-pending"]).toContain(selectionResult.ok ? true : selectionResult.reason);

    await settle(
      () =>
        s.perm("alphamon").topCard.cardId === "BT9-111" &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT2-047"),
    );
    expect(s.perm("alphamon").topCard.instanceId).toBe(ouryukenId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("survivor").permanentId,
    ]);
  });

  it("uses promo Dorumon from security before evolving Alphamon into Ouryuken", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-111", as: "alphamon", under: ["BT8-069"] }],
          hand: [{ card: "BT9-111", as: "ouryuken" }],
          deck: [{ card: "BT7-056", as: "revealedDorumon" }],
          security: [{ card: "P-070", as: "promoDorumon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker" },
            { card: "BT2-047", as: "highest" },
            { card: "BT1-015", as: "survivor" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const promoId = s.inst("promoDorumon").instanceId;
    const revealedId = s.inst("revealedDorumon").instanceId;
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === promoId) &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === revealedId),
    );
    await settle();

    s.state.turnSeat = 0;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("alphamon").permanentId,
        instanceId: s.inst("ouryuken").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("alphamon").topCard.cardId === "BT9-111" &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT2-047"),
    );

    expect(s.perm("alphamon").topCard.cardId).toBe("BT9-111");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === revealedId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-015")).toBe(true);
  });

  it("digivolves during the attack, then returns the protected X Antibody Option to keep the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT9-066",
              as: "alphamon",
              under: [
                { card: "BT8-069", as: "ouryumon" },
                { card: "BT9-109", as: "xAntibodyOption" },
              ],
            },
          ],
          hand: [{ card: "BT9-111", as: "ouryuken" }],
          deck: ["BT1-063"],
        },
        1: {
          battleArea: [
            { card: "BT2-047", as: "highest" },
            { card: "BT1-015", as: "survivor" },
          ],
          security: ["BT1-001"],
        },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
      },
    );
    const xAntibodyId = s.inst("xAntibodyOption").instanceId;
    const ouryumonId = s.inst("ouryumon").instanceId;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("alphamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("alphamon").topCard.cardId === "BT9-111" &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT2-047") &&
        !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking,
      5000,
    );

    expect(s.perm("alphamon").isSuspended).toBe(false);
    expect(s.perm("alphamon").stack.some((card) => card.instanceId === xAntibodyId)).toBe(true);
    s.state.memory = -2;
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("alphamon"));

    expect(s.state.memory).toBe(1);
    expect(s.state.turnSeat).toBe(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([xAntibodyId, ouryumonId]),
    );
    expect(s.perm("alphamon").stack).toHaveLength(0);
  });
});
