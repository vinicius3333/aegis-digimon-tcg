import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-022.js";
import "../index.js";

const CARD_ID = "BT26-022";

describe("BT26-022 Sorcermon", () => {
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
        deck: ["BT1-009"],
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
    await settle(() => legal.perm("tsBase").topCard.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);

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
          hand: [{ card: "BT24-019", as: "iliad" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
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

  it("encodes the ordered recovery, conditional security cost, and inherited Barrier", () => {
    expect(compiled.effects).toMatchObject([
      { trigger: "OnPlay", actions: [{ kind: "SecurityManipulation", op: "toHand" }, { kind: "SecurityManipulation", op: "addTop" }] },
      { trigger: "WhenDigivolving", actions: [{ kind: "SecurityManipulation", op: "toHand" }, { kind: "SecurityManipulation", op: "addTop" }] },
      { trigger: "EndOfYourTurn", actions: [{ kind: "PlayWithoutCost", reduceCostBy: 4, cost: { kind: "place", position: "bottom" } }] },
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
});
