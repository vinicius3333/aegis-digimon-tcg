import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT25_069 } from "./BT25-069.js";

const CARD_ID = "BT25-069";
const LINKABLE_TS = "BT25-100";

describe("BT25-069 Raremon", () => {
  it("matches the catalog identity and both printed link triggers", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Raremon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Undead", "Titan", "TS", "Cyborg"],
      effectText: expect.stringContaining("link 1 [TS]"),
      inheritedEffectText: "[All Turns] This Digimon gets +1000 DP.",
    });
    expect(BT25_069.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "OnPlay" }),
        expect.objectContaining({ trigger: "WhenDigivolving" }),
        expect.objectContaining({ trigger: "AllTurns", isInherited: true }),
      ]),
    );
  });

  it("alternate-digivolves from an off-color level 3 TS card for 2 and grants Jamming", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 3,
      traits: ["TS"],
      cost: 2,
      isAlternate: true,
    });

    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT24-009", as: "tsBase" }],
        hand: [{ card: CARD_ID, as: "rare" }],
        deck: ["BT1-001"],
      },
    });
    legal.state.memory = 2;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("tsBase").permanentId,
        instanceId: legal.inst("rare").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("tsBase").topCard.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);
    expect(observe(legal.engine).hasKeyword(legal.perm("tsBase"), "Jamming")).toBe(true);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "plainLv3" }], hand: [{ card: CARD_ID, as: "rare" }] },
    });
    invalid.state.memory = 2;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("plainLv3").permanentId,
        instanceId: invalid.inst("rare").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("On Play links a link-capable TS card from trash for free to an own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-011", as: "recipient" }],
          hand: [{ card: CARD_ID, as: "rare" }],
          trash: [{ card: LINKABLE_TS, as: "linkCard" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    const linkedId = s.inst("linkCard").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rare").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("recipient").linked.some((card) => card.instanceId === linkedId));

    expect(s.state.memory).toBe(0);
    expect(s.perm("recipient").linked).toHaveLength(1);
    expect(s.perm("recipient").linked[0]!.faceUp).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === linkedId)).toBe(false);
  });

  it("When Digivolving performs the same free link after the real evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-009", as: "base" }],
          hand: [{ card: CARD_ID, as: "rare" }],
          trash: [{ card: LINKABLE_TS, as: "linkCard" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rare").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").linked.some((card) => card.instanceId === s.inst("linkCard").instanceId));
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard.cardId).toBe(CARD_ID);
  });

  it("uses the ordinary black Lv3 evolution at exact cost 2", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-058", as: "base" }], hand: [{ card: CARD_ID, as: "rare" }] },
    });
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rare").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === CARD_ID);
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard?.cardId).toBe(CARD_ID);
  });

  it("can refuse the optional On Play link without moving the TS card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-011", as: "recipient" }],
          hand: [{ card: CARD_ID, as: "rare" }],
          trash: [{ card: LINKABLE_TS, as: "linkCard" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rare").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === CARD_ID));
    expect(s.perm("recipient").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("linkCard").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("Q6366 rejects a TS card without its own Link requirement", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "rare" }],
          trash: [{ card: "BT24-011", as: "tsWithoutLink" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rare").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === CARD_ID));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("tsWithoutLink").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.every((permanent) => permanent.linked.length === 0)).toBe(true);
  });

  it("grants inherited +1000 DP only while Raremon is under a host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT25-074", dp: 7000, as: "host", under: [CARD_ID] },
          { card: CARD_ID, dp: 7000, as: "standalone" },
        ],
      },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(8000);
    expect(s.perm("standalone").currentDP).toBe(7000);
  });
});
