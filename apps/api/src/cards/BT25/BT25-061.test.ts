import { EffectTiming, digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT25-061.js";

const CARD_ID = "BT25-061";

describe("BT25-061 Offmon", () => {
  it("matches the compiled catalog for its start-phase cost and link face", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Offmon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Black", level: 2, memoryCost: 0 }],
      forms: ["Stnd.", "Appmon"],
      attributes: ["Game"],
      types: ["Offline"],
      linkDp: 2000,
      linkRequirement: "[Link] [Appmon]\u00a0trait: Cost 1",
      linkEffect: "[When Linking] 1 of your opponent's Digimon can't unsuspend until their turn ends.",
    });
    const start = compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase");
    expect(start?.actions[0]).toMatchObject({
      kind: "Draw",
      amount: 1,
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "trash",
        target: {
          filter: { zone: "hand", controller: "mine", nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] },
          count: 1,
        },
      },
    });
    expect(start?.actions[1]).toEqual({ kind: "GainMemory", amount: 1 });
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 1 }]);
    const linked = compiled.effects.find((effect) => effect.trigger === "Static");
    expect(linked).toMatchObject({ isLinked: true });
    expect(linked?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      sourceFilter: { isSelfRef: true },
    });
  });

  it("evolves for 0 from an off-color Lv.2 Appmon and rejects a non-Appmon", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 2,
      traits: ["Appmon"],
      cost: 0,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: { breeding: { card: "BT21-005", as: "base" }, hand: [{ card: CARD_ID, as: "offmon" }], deck: ["BT1-009"] },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("offmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);

    const invalid = setupEngine({
      0: { breeding: { card: "BT1-007", as: "plain" }, hand: [{ card: CARD_ID, as: "offmon" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("plain").permanentId,
        instanceId: invalid.inst("offmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("supports the ordinary black Lv.2 route at cost 0 and rejects a wrong-color source", async () => {
    const ordinary = setupEngine({
      0: { breeding: { card: "BT11-005", as: "blackBase" }, hand: [{ card: CARD_ID, as: "offmon" }] },
    });
    ordinary.state.memory = 2;
    expect(
      ordinary.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ordinary.perm("blackBase").permanentId,
        instanceId: ordinary.inst("offmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => ordinary.perm("blackBase").topCard?.cardId === CARD_ID);
    expect(ordinary.state.memory).toBe(2);

    const wrongColor = setupEngine({
      0: { breeding: { card: "BT1-001", as: "redBase" }, hand: [{ card: CARD_ID, as: "offmon" }] },
    });
    expect(
      wrongColor.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongColor.perm("redBase").permanentId,
        instanceId: wrongColor.inst("offmon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("pays one Appmon card, then draws and gains memory as one effect", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "offmon" }],
          hand: [
            { card: "BT21-009", as: "cost" },
            { card: "BT25-089", as: "appmonTamer" },
            { card: "BT1-009", as: "plain" },
          ],
          deck: [{ card: "BT1-013", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("cost").instanceId);
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("offmon"));
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("plain").instanceId, s.inst("drawn").instanceId]),
    );
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(1);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("appmonTamer").instanceId);
  });

  it("refuses the start effect without an Appmon card and receives neither benefit", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: CARD_ID, as: "offmon" }],
        hand: [{ card: "BT1-009", as: "wrongTrait" }],
        deck: [{ card: "BT1-013", as: "top" }],
      },
    });
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("offmon"));
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("wrongTrait").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("top").instanceId]);
  });

  it("links for 1 and locks exactly one opposing Digimon from unsuspending", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-009", as: "host" }], hand: [{ card: CARD_ID, as: "link" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "digimon" },
            { card: "BT1-089", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("digimon").permanentId);
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("digimon"), "unsuspend"));
    expect(s.state.memory).toBe(0);
    expect(s.perm("host").linked[0]?.instanceId).toBe(s.inst("link").instanceId);
    expect(observe(s.engine).isRestricted(s.perm("digimon"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("tamer"), "unsuspend")).toBe(false);

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).isRestricted(s.perm("digimon"), "unsuspend")).toBe(false);
  });

  it("does not retrigger an already linked Offmon for a later link", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host", linked: [CARD_ID] }],
          hand: [{ card: "BT26-010", as: "other" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("other").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("other").instanceId));
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(false);
  });

  it("refuses linking Offmon to a host without the Appmon trait", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "plainHost" }], hand: [{ card: CARD_ID, as: "link" }] },
    });
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("plainHost").permanentId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("link").instanceId);
  });
});
