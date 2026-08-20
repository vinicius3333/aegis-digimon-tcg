import { Phase, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT25-078.js";

const CARD_ID = "BT25-078";

function battlePermanent(s: ReturnType<typeof setupEngine>, cardId = CARD_ID) {
  const permanent = s.state.players[0]!.battleArea.find((candidate) => candidate.topCard?.cardId === cardId);
  expect(permanent, `expected ${cardId} in the battle area`).toBeDefined();
  return permanent!;
}

describe("BT25-078 Gazimon", () => {
  it("keeps both printed triggers, alternate evolution requirements, and inherited Retaliation", () => {
    const definition = getCardDefinition(CARD_ID);
    expect(definition).toMatchObject({
      level: 3,
      colors: ["Purple"],
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
      effectText: expect.stringContaining("[When Moving] [On Play]"),
      inheritedEffectText: "＜Retaliation＞",
    });

    expect(compiled?.digivolutionRequirement).toEqual([
      { level: 2, texts: ["Three Musketeers"], cost: 0, isAlternate: true },
      { level: 2, traits: ["TS"], cost: 0, isAlternate: true },
    ]);
    expect(compiled?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "WhenMoving", actions: [expect.objectContaining({ kind: "RevealAdd" })] }),
        expect.objectContaining({ trigger: "OnPlay", actions: [expect.objectContaining({ kind: "RevealAdd" })] }),
        expect.objectContaining({
          trigger: "Static",
          isInherited: true,
          keywords: [{ keyword: "Retaliation", raw: "＜Retaliation＞" }],
        }),
      ]),
    );

    for (const trigger of ["WhenMoving", "OnPlay"] as const) {
      const reveal = compiled?.effects?.find((effect) => effect.trigger === trigger)?.actions?.[0] as any;
      expect(reveal).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
      expect(reveal.add).toHaveLength(1);
      expect(reveal.add[0]).toMatchObject({
        count: 1,
        to: "hand",
        filter: { nameOrTrait: [{ tokens: ["Three Musketeers"], match: "text" }] },
        orDispositions: [
          {
            to: "placeUnder",
            filter: { nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }] },
            underFilter: { isSelfRef: true },
          },
        ],
      });
    }
  });

  it("On Play adds one full-text match and returns the other revealed cards to deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "gazimon" }],
          deck: [
            { card: "BT24-088", as: "textMatch" }, // Tamer: [Three Musketeers] appears only in its effect text.
            { card: "BT25-081", as: "fillerOne" },
            { card: "BT25-079", as: "fillerTwo" },
          ],
        },
      },
      { autoSelectCards: true, autoChooseOption: true, preferInstanceIds: [] },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gazimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("textMatch").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT24-088");
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT25-081", "BT25-079"]);
    expect(battlePermanent(s).topCard?.cardId).toBe(CARD_ID);
    expect(s.state.memory).toBe(0);
  });

  it("On Play can place a trait card only under this Gazimon, not another Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "gazimon" }],
          deck: [
            { card: "BT25-085", as: "traitCard" },
            { card: "BT25-081", as: "fillerOne" },
            { card: "BT25-079", as: "fillerTwo" },
          ],
          battleArea: [{ card: "BT25-081", as: "otherHost" }],
        },
      },
      { autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1, preferInstanceIds: preferred },
    );
    s.state.memory = 3;
    preferred.push(s.inst("traitCard").instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gazimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => battlePermanent(s).stack.some((card) => card.instanceId === s.inst("traitCard").instanceId));

    const gazimon = battlePermanent(s);
    const otherHost = s.perm("otherHost");
    expect(gazimon.stack.map((card) => card.cardId)).toEqual(["BT25-085"]);
    expect(otherHost.stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("traitCard").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT25-081", "BT25-079"]);
  });

  it("does not offer the placement branch for a text-only non-trait match", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "gazimon" }],
          deck: [
            { card: "BT24-088", as: "textOnly" },
            { card: "BT25-081", as: "fillerOne" },
            { card: "BT25-079", as: "fillerTwo" },
          ],
        },
      },
      // A stale client cannot force the trait-only destination: the server filters it by card definition.
      { autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1, preferInstanceIds: [] },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gazimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("textOnly").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT24-088");
    expect(battlePermanent(s).stack).toHaveLength(0);
    expect(s.decisions.filter(({ req }) => req.kind === "chooseOption")).toHaveLength(0);
  });

  it("fires the same mutually exclusive search when moving from breeding", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          breeding: { card: CARD_ID, as: "gazimon" },
          deck: [
            { card: "BT25-085", as: "traitCard" },
            { card: "BT25-081", as: "fillerOne" },
            { card: "BT25-079", as: "fillerTwo" },
          ],
        },
      },
      { autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1, preferInstanceIds: preferred },
    );
    s.state.phase = Phase.Breeding;
    preferred.push(s.inst("traitCard").instanceId);

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("gazimon").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("gazimon").inBreeding && s.perm("gazimon").stack.length === 1);

    expect(s.perm("gazimon").stack.map((card) => card.cardId)).toEqual(["BT25-085"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT25-081", "BT25-079"]);
  });

  it("supports a legal TS evolution stack and carries Retaliation through the stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-005", as: "base" }],
        hand: [
          { card: CARD_ID, as: "gazimon" },
          { card: "BT25-081", as: "fangmon" },
          { card: "BT25-083", as: "ladydevimon" },
        ],
      },
      1: { battleArea: [{ card: "BT25-085", as: "opponent", suspended: true }] },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gazimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === CARD_ID);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("fangmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT25-081");

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ladydevimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT25-083");
    await s.ready();

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT25-005", CARD_ID, "BT25-081"]);
    expect(s.perm("base").keywords).toContain("Retaliation");
    expect(s.state.memory).toBe(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);
    // The low-DP evolved stack loses the battle and its inherited Retaliation removes the
    // otherwise-winning opponent as well.
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
