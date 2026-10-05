import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-017.js";

describe("BT22-017 Gabumon", () => {
  it("reveals Omnimon text and CS, and requires two field Digimon for inherited DNA digivolution", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnPlay",
        actions: [expect.objectContaining({ kind: "RevealAdd", revealCount: 3 })],
      }),
    );
    const inherited = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(inherited).toMatchObject({ isInherited: true });
    expect(inherited?.actions[0]).toMatchObject({
      kind: "DnaDigivolve",
      materials: [
        { filter: { isSelfRef: true }, count: 1, zone: "battleArea" },
        { filter: { controller: "mine", kind: ["Digimon"], excludeSelf: true }, count: 1, zone: "battleArea" },
      ],
      into: { controllerDefault: "mine", kind: ["Digimon"], zone: "hand", hasDnaDigivolutionRequirement: true },
      optional: true,
    });
  });

  it("adds one Omnimon-text card and one distinct CS card while bottoming a miss", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT22-017", as: "gabumon" }],
          deck: [
            { card: "BT5-086", as: "omnimon" },
            { card: "BT22-010", as: "cs" },
            { card: "BT1-009", as: "miss" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("omnimon").instanceId, s.inst("cs").instanceId);
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gabumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("omnimon").instanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cs").instanceId),
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("omnimon").instanceId, s.inst("cs").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("miss").instanceId]);
  });

  it("hatches and legally evolves through a CS stack before rejecting an invalid route", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT22-017", as: "egg" }],
        hand: [
          { card: "BT22-022", as: "veedramon" },
          { card: "BT22-008", as: "invalidAgumon" },
        ],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    s.state.phase = Phase.Breeding;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT22-017");
    s.state.phase = Phase.Main;
    const permanentId = s.state.players[0]!.breeding!.permanentId;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: s.inst("veedramon").instanceId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT22-022");
    expect(s.state.players[0]!.breeding?.stack.map((card) => card.cardId)).toEqual(["BT22-017"]);
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: s.inst("invalidAgumon").instanceId }).ok,
    ).toBe(false);
  });

  it.each(["AD1-025", "BT22-015"])(
    "Discord 1556299408700735548: Gabumon offers end-of-turn DNA into %s",
    async (destination) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT22-026", under: ["BT22-017"], as: "host" },
              { card: "BT22-013", under: ["BT22-008"], as: "partner" },
            ],
            hand: [{ card: destination, as: "dna" }],
            deck: Array(8).fill("BT1-009"),
          },
          1: { deck: Array(8).fill("BT1-009"), security: Array(5).fill("BT1-009") },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true, declinePrompts: ["attack"] },
      );
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual([destination]);
      expect(s.state.players[0]!.battleArea[0]!.stack.map((c) => c.cardId)).toEqual(
        expect.arrayContaining(["BT22-017", "BT22-026", "BT22-008", "BT22-013"]),
      );
      expect(s.state.pendingDecision).toBeUndefined();
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    },
  );

  it.each(["BT22-022", "BT1-019"])(
    "Discord 1556299408700735548: rejects AD1-025 DNA with illegal partner %s",
    async (partner) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT22-026", under: ["BT22-017"], as: "host" },
              { card: partner, as: "partner" },
            ],
            hand: ["AD1-025"],
            deck: Array(8).fill("BT1-009"),
          },
          1: { deck: Array(8).fill("BT1-009") },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      const loop = s.engine.startTurnLoop();
      try {
        await advance(s.engine).waitForMainPhase(0);
        await s.ready();
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await settle(() => s.state.turnSeat === 1 && s.state.pendingDecision === undefined);
        expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT22-026", partner]);
        expect(s.state.players[0]!.hand.some((c) => c.cardId === "AD1-025")).toBe(true);
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
        await loop;
      }
    },
  );

  it("DNA digivolves a realistic blue host carrying Gabumon with a green level-4 partner", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-022", under: ["BT22-017"], as: "host" },
            { card: "BT1-069", as: "partner" },
          ],
          hand: [{ card: "BT12-028", as: "dna" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-028"));

    const dna = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT12-028");
    expect(dna?.stack.some((card) => card.cardId === "BT22-017")).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    await loop;
  });
});

describe("BT22-017 Gabumon — KB Q&A rulings", () => {
  it("counts a card as having [Omnimon] in its text through its effect text or a longer name (Q4872)", async () => {
    async function revealOnPlay(omnimonTextCard: string) {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            hand: [{ card: "BT22-017", as: "gabumon" }],
            deck: [
              { card: "BT1-009", as: "miss" },
              { card: omnimonTextCard, as: "omnimonText" },
              { card: "BT22-010", as: "cs" },
            ],
          },
        },
        { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.inst("miss").instanceId);
      s.state.memory = 3;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gabumon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cs").instanceId));
      await settle();
      return s;
    }

    const effectTextOnly = await revealOnPlay("AD1-001");
    expect(effectTextOnly.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual(["AD1-001", "BT22-010"]);
    expect(effectTextOnly.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);

    const longerName = await revealOnPlay("BT5-087");
    expect(longerName.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual(["BT22-010", "BT5-087"]);
    expect(longerName.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });
});
