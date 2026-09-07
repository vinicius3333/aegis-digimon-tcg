import { EffectTiming, getCardDefinition, type CardInstance } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT25-092.js";

const CARD_ID = "BT25-092";

describe("BT25-092 Asuna Shiroki", () => {
  it("matches the catalog identity and has no evolution routes", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Asuna Shiroki",
      colors: ["Purple"],
      kinds: ["Tamer"],
      types: ["TS"],
      playCost: 4,
      evoCosts: [],
    });
  });

  it("keeps the suspend-and-trash processing condition atomic when Asuna is already suspended", async () => {
    const main = compiled.effects.find((effect) => effect.trigger === "Main")?.actions[0];
    expect(main).toMatchObject({
      kind: "CostGatedBlock",
      cost: {
        kind: "compound",
        costs: [{ kind: "suspend" }, { kind: "trash" }],
      },
    });

    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "asuna", suspended: true },
          { card: "BT24-009", as: "host" },
        ],
        hand: [
          { card: "BT25-100", as: "option" },
          { card: "BT24-010", as: "evolution" },
        ],
      },
    });
    await s.ready();
    const source = (s.engine as unknown as { cardSourceOf(instance: CardInstance): CardSource }).cardSourceOf(
      s.inst("asuna"),
    );
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith(`${CARD_ID}/`),
    )!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("asuna").instanceId,
        effectKey,
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });

    expect(s.perm("asuna").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
    expect(s.perm("host").topCard.cardId).toBe("BT24-009");
  });

  it("Start Main trashes exactly one TS card before Draw 1 and memory +1", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "asuna" }],
          hand: [{ card: "BT25-100", as: "cost" }],
          deck: [{ card: "AD1-001", as: "draw" }],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.inst("cost").instanceId);
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnStartMainPhase, s.perm("asuna"));
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("draw").instanceId);
    expect(s.state.memory).toBe(1);
  });

  it("declining Start Main pays nothing and grants no benefit", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "asuna" }],
          hand: [{ card: "BT25-100", as: "cost" }],
          deck: [{ card: "AD1-001", as: "draw" }],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnStartMainPhase, s.perm("asuna"));
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.deck.map((c) => c.instanceId)).toContain(s.inst("draw").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("Main atomically trashes an Option under either own Digimon, suspends Asuna, then evolves from trash at -1 (Q6434)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "asuna" },
            { card: "BT24-009", as: "evolveHost" },
            { card: "BT24-009", as: "costHost", under: [{ card: "BT25-100", as: "sourceCost" }] },
          ],
          trash: [{ card: "BT24-010", as: "evolution" }],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: 0, // BT24-010 also has an alternate TS route; choose the printed route here.
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.inst("sourceCost").instanceId, s.perm("evolveHost").permanentId, s.inst("evolution").instanceId);
    s.state.memory = 2;
    await s.ready();
    const source = (s.engine as unknown as { cardSourceOf(instance: CardInstance): CardSource }).cardSourceOf(
      s.inst("asuna"),
    );
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith(`${CARD_ID}/`),
    )!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("asuna").instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("evolveHost").topCard.instanceId === s.inst("evolution").instanceId);
    expect(s.perm("asuna").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(s.inst("sourceCost").instanceId);
    expect(s.state.memory).toBe(0); // printed cost 3, reduced by exactly 1.
  });

  it("Main can't activate with no complete suspend+Option cost, so two copies cannot pool a reduction (Q6434-Q6435)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "asunaA" },
          { card: CARD_ID, as: "asunaB" },
          { card: "BT24-009", as: "host" },
        ],
        trash: [{ card: "BT24-010", as: "evolution" }],
      },
    });
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnDeclaration, s.perm("asunaA"));
    expect(s.perm("asunaA").isSuspended).toBe(false);
    expect(s.perm("asunaB").isSuspended).toBe(false);
    expect(s.perm("host").topCard.cardId).toBe("BT24-009");
  });

  it("Security plays Asuna without paying 4", async () => {
    const s = setupEngine({
      0: { security: [{ card: CARD_ID, as: "securityAsuna" }] },
      1: { battleArea: [{ card: "AD1-001", dp: 20000, as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === CARD_ID));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === CARD_ID)).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("does not use an Option under a Tamer as the Main cost", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "asuna" },
            { card: CARD_ID, as: "tamer", under: [{ card: "BT25-100", as: "underOption" }] },
            { card: "BT24-009", as: "host" },
          ],
          hand: [{ card: "BT24-010", as: "evolution" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("underOption").instanceId, s.perm("host").permanentId, s.inst("evolution").instanceId);
    s.state.memory = 3;
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnDeclaration, s.perm("asuna"));
    expect(s.perm("asuna").isSuspended).toBe(false);
    expect(s.perm("host").topCard.cardId).toBe("BT24-009");
    expect(s.perm("tamer").stack.map((c) => c.instanceId)).toContain(s.inst("underOption").instanceId);
  });

  it("only offers own Digimon as the Main evolution target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "asuna" },
            { card: "BT24-009", as: "ownHost", under: [{ card: "BT25-100", as: "option" }] },
          ],
          trash: [{ card: "BT24-010", as: "evolution" }],
        },
        1: { battleArea: [{ card: "BT24-009", as: "opponentHost" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
    );
    s.state.memory = 2;
    await s.ready();
    const source = (s.engine as unknown as { cardSourceOf(instance: CardInstance): CardSource }).cardSourceOf(
      s.inst("asuna"),
    );
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith(`${CARD_ID}/`),
    )!.effectKey;
    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.inst("asuna").instanceId,
      effectKey,
    })).toEqual({ ok: true });
    await settle(() => s.perm("ownHost").topCard?.cardId === "BT24-010");
    expect(s.perm("ownHost").topCard?.cardId).toBe("BT24-010");
    expect(s.perm("opponentHost").topCard?.cardId).toBe("BT24-009");
  });
});
