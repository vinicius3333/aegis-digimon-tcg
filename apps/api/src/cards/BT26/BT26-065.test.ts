import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const CARD_ID = "BT26-065";

describe("BT26-065 Falcomon", () => {
  it("uses the Lv.2 [DATA SQUAD] alternate evolution path on a non-purple breeding Digimon for cost 0", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT26-002", as: "dataSquadEgg" },
        hand: [{ card: CARD_ID, as: "falcomon" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dataSquadEgg").permanentId,
        instanceId: s.inst("falcomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dataSquadEgg").topCard.instanceId === s.inst("falcomon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("dataSquadEgg").topCard.cardId).toBe(CARD_ID);
    expect(s.perm("dataSquadEgg").stack.map((card) => card.cardId)).toEqual(["BT26-002"]);
  });

  it("mandatorily adds one card for each independent On Play slot and bottoms the ineligible card", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "falcomon" }],
          deck: [
            { card: "BT13-102", as: "keenan" },
            { card: "BT13-089", as: "ravemon" },
            { card: "ST20-02", as: "redBird" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("keenan").instanceId, s.inst("ravemon").instanceId);
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("falcomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("keenan").instanceId,
      s.inst("ravemon").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("redBird").instanceId]);
    const selections = s.decisions.filter((decision) => decision.req.kind === "selectCards");
    expect(selections).toHaveLength(2);
    expect(selections.every((decision) => decision.req.options?.min === 1)).toBe(true);
  });

  it("can allocate an overlapping purple DATA SQUAD/Avian card to the second slot", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "playedFalcomon" }],
          deck: [
            { card: "BT13-102", as: "keenan" },
            { card: CARD_ID, as: "overlapFalcomon" },
            { card: "AD1-001", as: "rest" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("keenan").instanceId, s.inst("overlapFalcomon").instanceId);
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedFalcomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 1);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("keenan").instanceId,
      s.inst("overlapFalcomon").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("rest").instanceId]);
  });

  it("does not use one overlapping card to satisfy both add slots", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "playedFalcomon" }],
          deck: [
            { card: CARD_ID, as: "onlyMatch" },
            { card: "AD1-001", as: "restOne" },
            { card: "AD1-002", as: "restTwo" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedFalcomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("onlyMatch").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("restOne").instanceId,
      s.inst("restTwo").instanceId,
    ]);
    expect(s.decisions.filter((decision) => decision.req.kind === "selectCards")).toHaveLength(1);
  });

  it("applies Q7088's purple gate to both the Ravemon-name and Avian/Bird alternatives", async () => {
    const source = {
      instanceId: "falcomon",
      cardId: CARD_ID,
      ownerSeat: 0,
      permanent: () => ({ permanentId: "falcomon-perm" }),
      isOnBattleArea: () => true,
    } as any;
    const definitions = new Map([
      ["KEENAN", { nameEn: "Keenan Crier", colors: ["Purple"], types: [] }],
      ["PURPLE_RAVEMON", { nameEn: "Ravemon", colors: ["Purple"], types: ["Cyborg"] }],
      ["RED_RAVEMON", { nameEn: "Ravemon", colors: ["Red"], types: ["Cyborg"] }],
      ["PURPLE_BIRD", { nameEn: "Other", colors: ["Purple"], types: ["Ancient Bird"] }],
      ["GREEN_BIRD", { nameEn: "Other", colors: ["Green"], types: ["Ancient Bird"] }],
    ]);
    const revealed = [...definitions.keys()].map((cardId) => ({ instanceId: cardId, cardId }));
    const seenCandidates: string[][] = [];
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnPlay, source)[0]!;

    await effect.resolve({
      source,
      game: {
        player: () => ({ deck: revealed }),
        definitionOf: (card: { cardId: string }) => definitions.get(card.cardId),
      },
      ask: {
        selectCards: async (_ctx: unknown, options: { candidates: string[] }) => {
          seenCandidates.push(options.candidates);
          return [options.candidates[0]!];
        },
      },
      fx: {
        reveal: async () => revealed,
        returnToHand: async () => [],
        returnToDeck: async () => [],
      },
    } as any);

    expect(seenCandidates[1]).toEqual(["PURPLE_RAVEMON", "PURPLE_BIRD"]);
  });

  it("draws then trashes exactly once across two attacks in the same turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "AD1-002", as: "initialHand" }],
          deck: [
            { card: "AD1-002", as: "firstDraw" },
            { card: "AD1-003", as: "secondDraw" },
          ],
          battleArea: [{ card: "BT1-024", as: "attacker", dp: 20000, under: [{ card: CARD_ID, as: "inherited" }] }],
        },
        1: { security: ["BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("initialHand").instanceId);
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("initialHand").instanceId));
    await settle(() => s.state.players[1]!.security.length === 1);
    await settle(() => false, 5000);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("firstDraw").instanceId]);

    await advance(s.engine).verb.unsuspend([attackerId]);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("firstDraw").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });
});
