import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-022.js";
import "../index.js";

const CARD_ID = "BT26-022";

describe("BT26-022 Sorcermon", () => {
  it("supports both printed color-3 evolution routes in a real stack", async () => {
    for (const [baseCard, as] of [
      ["BT1-030", "blueBase"],
      ["BT25-030", "yellowBase"],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCard, as }],
          hand: [{ card: CARD_ID, as: "sorcermon" }],
          deck: [{ card: "BT1-009", as: "draw" }],
        },
      });
      s.state.memory = 3;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm(as).permanentId,
          instanceId: s.inst("sorcermon").instanceId,
          useAlternateCost: false,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm(as).topCard.cardId === CARD_ID);
      expect(s.state.memory, `normal route from ${baseCard}`).toBe(0);
      expect(s.state.players[0]!.deck).toHaveLength(0);
    }
  });

  it("uses the exact Lv.3 [TS] cost-2 evolution and rejects an off-color non-TS Lv.3", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 3,
      traits: ["TS"],
      cost: 2,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT26-009", as: "tsBase" }],
        hand: [{ card: CARD_ID, as: "sorcermon" }],
        deck: [
          { card: "BT1-009", as: "bonusDraw" },
          { card: "BT1-010", as: "recovered" },
        ],
      },
    });
    legal.state.memory = 2;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("tsBase").permanentId,
        instanceId: legal.inst("sorcermon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => legal.perm("tsBase").topCard.cardId === CARD_ID && legal.state.players[0]!.security.length === 1,
    );
    expect(legal.state.memory).toBe(0);
    expect(legal.state.players[0]!.deck).toHaveLength(0);
    expect(legal.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      legal.inst("bonusDraw").instanceId,
    );
    expect(legal.state.players[0]!.security[0]).toMatchObject({
      instanceId: legal.inst("recovered").instanceId,
      faceUp: false,
    });

    const illegal = setupEngine({
      0: { battleArea: [{ card: "AD1-002", as: "plainRed" }], hand: [{ card: CARD_ID, as: "sorcermon" }] },
    });
    illegal.state.memory = 2;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("plainRed").permanentId,
        instanceId: illegal.inst("sorcermon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("on play moves the old security top to hand, then recovers the new deck top face-down", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "sorcermon" }],
        security: [{ card: "BT1-009", as: "oldTop", faceUp: true }],
        deck: [{ card: "BT1-009", as: "newTop", faceUp: true }],
      },
    });
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sorcermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("oldTop").instanceId));
    await settle();
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]).toMatchObject({ instanceId: s.inst("newTop").instanceId, faceUp: false });
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("recovers even with zero security cards (Q6985)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "sorcermon" }], deck: [{ card: "BT1-009", as: "recovered" }] },
    });
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("sorcermon"));
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]).toMatchObject({
      instanceId: s.inst("recovered").instanceId,
      faceUp: false,
    });
  });

  it("at end of own turn pays Sorcermon to bottom security, then plays a blue Iliad with cost reduced by 4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "sorcermon" },
            { card: "BT26-009", as: "redGate" },
          ],
          hand: [{ card: "BT24-029", as: "iliad" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const sorcermonId = s.perm("sorcermon").topCard.instanceId;
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("sorcermon"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("iliad").instanceId));
    await settle();
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({
      instanceId: sorcermonId,
      faceUp: false,
    });
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === CARD_ID)).toBe(false);
  });

  it("does not pay itself to security or play from hand without a red or purple Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "sorcermon" }],
          hand: [{ card: "BT24-019", as: "iliad" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sorcermonId = s.perm("sorcermon").topCard.instanceId;

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("sorcermon"));

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(sorcermonId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("iliad").instanceId]);
  });

  it("does not treat a red Digimon in the breeding area as the end-of-turn condition", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "sorcermon" }],
          breeding: { card: "BT26-009", as: "redBreeding" },
          hand: [{ card: "BT25-014", as: "iliad" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sorcermonId = s.perm("sorcermon").topCard.instanceId;
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("sorcermon"));

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(sorcermonId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("iliad").instanceId]);
  });

  it("a purple Digimon enables the cost and the nested play accepts a red Iliad card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "sorcermon" },
            { card: "BT26-064", as: "purpleGate" },
          ],
          hand: [
            { card: "BT25-014", as: "redIliad" },
            { card: "BT25-022", as: "yellowIliad" },
            { card: "BT1-009", as: "unrelated" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("sorcermon"));
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("redIliad").instanceId),
    );

    expect(s.state.players[0]!.security.at(-1)?.instanceId).toBe(s.inst("sorcermon").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("yellowIliad").instanceId,
      s.inst("unrelated").instanceId,
    ]);
  });

  it("may pay the security cost and then decline the independent play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "sorcermon" },
          { card: "BT26-009", as: "redGate" },
        ],
        hand: [{ card: "BT24-019", as: "eligible" }],
      },
    });
    const resolving = advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("sorcermon"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const costChoice = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: costChoice.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const playChoice = s.state.pendingDecision!;
    expect(playChoice.decisionId).not.toBe(costChoice.decisionId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: playChoice.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await resolving;

    expect(s.state.players[0]!.security.at(-1)?.instanceId).toBe(s.inst("sorcermon").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("eligible").instanceId]);
  });

  it("encodes the ordered recovery, conditional security cost, and inherited Barrier", () => {
    expect(compiled.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          { kind: "SecurityManipulation", op: "toHand" },
          { kind: "SecurityManipulation", op: "addTop" },
        ],
      },
      {
        trigger: "WhenDigivolving",
        actions: [
          { kind: "SecurityManipulation", op: "toHand" },
          { kind: "SecurityManipulation", op: "addTop" },
        ],
      },
      {
        trigger: "EndOfYourTurn",
        actions: [
          {
            kind: "CostGatedBlock",
            cost: { kind: "place", position: "bottom" },
            actions: [{ kind: "PlayWithoutCost", reduceCostBy: 4, optional: true }],
          },
        ],
      },
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "Barrier" }] },
    ]);
  });

  it("grants inherited Barrier only while Sorcermon is under another Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT24-029", as: "host", under: [{ card: CARD_ID, as: "inherited" }] },
          { card: CARD_ID, as: "top" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("top"), "Barrier")).toBe(false);
  });

  it("uses inherited Barrier to spend top security and prevent battle deletion", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-029", as: "host", suspended: true, under: [{ card: CARD_ID }] }],
        security: [
          { card: "BT1-009", as: "barrierCost" },
          { card: "BT1-010", as: "remaining" },
        ],
      },
      1: { battleArea: [{ card: "BT1-080", as: "attacker" }] },
    });
    await s.ready();
    s.state.turnSeat = 1;
    const hostId = s.perm("host").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: hostId, accept: true })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("remaining").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("barrierCost").instanceId);
  });

  it("does not activate inherited Barrier against effect deletion", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-029", as: "host", under: [{ card: CARD_ID }] }],
        security: [{ card: "BT1-009", as: "barrierCost" }],
      },
    });
    await s.ready();
    const hostId = s.perm("host").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    expect(s.events.some((event) => event.kind === "barrierPrompt")).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
