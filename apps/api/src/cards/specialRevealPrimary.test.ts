import { describe, it, expect } from "vitest";
import { EffectTiming, getCardDefinition, type CardInstance, type Seat } from "@aegis/shared";
import { getEffectModule } from "../engine/effects/registry.js";
import type { CardSource } from "../engine/effects/CardSource.js";
import { setupEngine, settle } from "../engine/testkit/harness.js";
import "./index.js";

const RED = "BT1-009";
const YELLOW = "BT1-045";
const GREEN = "BT1-064";
const BLUE = "BT1-027";
const ADVENTURE_DIGIMON = "AD1-001";
const TAMER = "BT1-089";
const BLUE_FLARE_1 = "BT19-016";
const BLUE_FLARE_2 = "BT11-030";
const KIRIHA = "BT10-088";
const EOSMON = "BT6-083";
const MENOA = "BT6-092";
const TM_OPTION = "EX7-070";

const inZone = (zone: readonly CardInstance[], cardId: string): number =>
  zone.filter((c) => c.cardId === cardId).length;

function stubSource(cardId: string): CardSource {
  const definition = getCardDefinition(cardId);
  if (definition === undefined) throw new Error(`no definition for ${cardId}`);
  return {
    instanceId: `INST#${cardId}`,
    cardId,
    ownerSeat: 0 as Seat,
    definition,
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("Option [Main] body routing — no OnDeclaration dual-bucket", () => {
  it("ST21-14: reveal-add primary is at OnUseOption only; OnDeclaration holds just the ＜Delay＞", () => {
    const module = getEffectModule("ST21-14");
    expect(module, "ST21-14 must be registered").toBeDefined();
    const source = stubSource("ST21-14");
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.OnDeclaration, source)).toHaveLength(1);
  });
});

describe("heterogeneous reveal-add primaries", () => {
  it("ST21-14: adds the [ADVENTURE]-trait card to hand, returns the rest to the deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-079", dp: 3000 }],
          hand: [{ card: "ST21-14", as: "option", faceUp: true }],
          deck: [{ card: ADVENTURE_DIGIMON }, { card: RED }, { card: GREEN }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => inZone(p0.hand, ADVENTURE_DIGIMON) > 0);

    expect(inZone(p0.hand, ADVENTURE_DIGIMON)).toBe(1);
    expect(inZone(p0.deck, RED)).toBe(1);
    expect(inZone(p0.deck, GREEN)).toBe(1);
    expect(inZone(p0.deck, ADVENTURE_DIGIMON)).toBe(0);
  });

  it("ST17-11: adds 1 green Digimon AND 1 green Tamer to hand, returns the third to the deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GREEN, dp: 3000 }],
          hand: [{ card: "ST17-11", as: "option", faceUp: true }],
          deck: [{ card: GREEN }, { card: TAMER }, { card: RED }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => inZone(p0.hand, GREEN) > 0 && inZone(p0.hand, TAMER) > 0);

    expect(inZone(p0.hand, GREEN)).toBe(1);
    expect(inZone(p0.hand, TAMER)).toBe(1);
    expect(inZone(p0.deck, RED)).toBe(1);
    expect(inZone(p0.deck, GREEN)).toBe(0);
    expect(inZone(p0.deck, TAMER)).toBe(0);
  });

  it("BT10-097: adds 2 [Blue Flare] to hand, plays Kiriha from the deck, returns the fodder", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BLUE, dp: 3000 }],
          hand: [{ card: "BT10-097", as: "option", faceUp: true }],
          deck: [
            { card: BLUE_FLARE_1 },
            { card: BLUE_FLARE_2 },
            { card: KIRIHA },
            { card: RED },
            { card: YELLOW },
            { card: GREEN },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => p0.battleArea.some((perm) => perm.topCard?.cardId === KIRIHA) && inZone(p0.hand, BLUE_FLARE_1) > 0,
      5000,
    );

    expect(inZone(p0.hand, BLUE_FLARE_1)).toBe(1);
    expect(inZone(p0.hand, BLUE_FLARE_2)).toBe(1);
    expect(inZone(p0.deck, KIRIHA)).toBe(0);
    expect(p0.battleArea.some((perm) => perm.topCard?.cardId === KIRIHA)).toBe(true);
    expect(inZone(p0.deck, RED)).toBe(1);
    expect(inZone(p0.deck, YELLOW)).toBe(1);
    expect(inZone(p0.deck, GREEN)).toBe(1);
  });

  it("P-112: On Play adds 1 [Eosmon] AND 1 [Menoa Bellucci] to hand, returns the third", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-112", as: "digimon", faceUp: true }],
          deck: [{ card: EOSMON }, { card: MENOA }, { card: RED }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("digimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => inZone(p0.hand, EOSMON) > 0 && inZone(p0.hand, MENOA) > 0);

    expect(inZone(p0.hand, EOSMON)).toBe(1);
    expect(inZone(p0.hand, MENOA)).toBe(1);
    expect(inZone(p0.deck, RED)).toBe(1);
    expect(inZone(p0.deck, EOSMON)).toBe(0);
    expect(inZone(p0.deck, MENOA)).toBe(0);
  });

  it("EX7-048: On Play takes the [Three Musketeers] Option from the deck, returns the fodder", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-048", as: "digimon", faceUp: true }],
          deck: [
            { card: TM_OPTION },
            { card: RED },
            { card: YELLOW },
            { card: GREEN },
            { card: BLUE },
            { card: "BT1-010" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    s.state.memory = 14;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("digimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => inZone(p0.deck, TM_OPTION) === 0);

    expect(inZone(p0.deck, TM_OPTION)).toBe(0);
    expect(inZone(p0.deck, RED)).toBe(1);
    expect(inZone(p0.deck, YELLOW)).toBe(1);
    expect(inZone(p0.deck, GREEN)).toBe(1);
  });
});
