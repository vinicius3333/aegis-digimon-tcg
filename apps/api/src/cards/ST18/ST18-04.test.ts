import type { PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST18-04 Pteromon", () => {
  it("applies the inherited Your Turn DP bonus through a real evolution stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST18-09", dp: 7000, as: "host", under: ["ST18-04"] }] },
    });
    await s.ready();
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["ST18-04"]);
    expect(s.perm("host").currentDP).toBe(9000);
  });

  it("reveals three, adds one Bird/Avian and one Vortex Warriors/LIBERATOR card, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST18-04", as: "pteromon" }],
          deck: [{ card: "ST18-03" }, { card: "ST18-08" }, { card: "BT1-009" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    const p0 = s.state.players[0] as PlayerState;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pteromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p0.hand.some((card) => card.cardId === "ST18-03"));

    expect(p0.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["ST18-03", "ST18-08"]));
    expect(p0.deck.map((card) => card.cardId)).toContain("BT1-009");
    expect(p0.deck.map((card) => card.cardId)).not.toEqual(expect.arrayContaining(["ST18-03", "ST18-08"]));
  });

  it("adds the available matching card when the other search category is absent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST18-04", as: "pteromon" }],
          deck: [{ card: "ST18-03" }, { card: "BT1-009" }, { card: "BT1-010" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const p0 = s.state.players[0] as PlayerState;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pteromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p0.hand.some((card) => card.cardId === "ST18-03"));
    expect(p0.hand.map((card) => card.cardId)).toContain("ST18-03");
    expect(p0.deck.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-009", "BT1-010"]));
  });

  it("does not apply the inherited bonus during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST18-09", dp: 7000, as: "host", under: ["ST18-04"] }] } });
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(7000);
  });
});

describe("ST18-04 Pteromon — KB Q&A rulings", () => {
  async function playPteromonRevealing(deck: string[]) {
    const s = setupEngine(
      { 0: { hand: [{ card: "ST18-04", as: "pteromon" }], deck } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const player = s.state.players[0] as PlayerState;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pteromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.deck.length === deck.length - 1 && s.state.pendingDecision === undefined);
    return player;
  }

  it("adds the only matching card when just one search category is revealed (Q839)", async () => {
    const avianOnly = await playPteromonRevealing(["ST18-03", "BT1-009", "BT1-010"]);
    expect(avianOnly.hand.map((card) => card.cardId)).toEqual(["ST18-03"]);
    expect(avianOnly.deck.map((card) => card.cardId).sort()).toEqual(["BT1-009", "BT1-010"]);

    const liberatorOnly = await playPteromonRevealing(["BT18-060", "BT1-009", "BT1-010"]);
    expect(liberatorOnly.hand.map((card) => card.cardId)).toEqual(["BT18-060"]);
    expect(liberatorOnly.deck.map((card) => card.cardId).sort()).toEqual(["BT1-009", "BT1-010"]);
  });

  it("counts a card whose trait only contains [Bird] (e.g. [Giant Bird])", async () => {
    const player = await playPteromonRevealing(["BT1-017", "BT1-009", "BT1-010"]);

    expect(player.hand.map((card) => card.cardId)).toEqual(["BT1-017"]);
  });

  it("must add both matching cards when both search categories are revealed (Q840)", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "ST18-04", as: "pteromon" }],
        deck: [
          { card: "ST18-03", as: "avian" },
          { card: "BT18-060", as: "liberator" },
          { card: "BT1-009", as: "other" },
        ],
      },
    });
    s.state.memory = 3;
    const player = s.state.players[0] as PlayerState;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pteromon").instanceId })).toEqual({
      ok: true,
    });

    const selections = () => s.decisions.filter(({ req }) => req.kind === "selectCards").map(({ req }) => req);
    for (const [index, alias] of ["avian", "liberator"].entries()) {
      await settle(() => selections().length > index);
      const decision = selections()[index]!;
      expect(decision.options?.candidateInstanceIds).toEqual([s.inst(alias).instanceId]);
      expect(decision.options?.min).toBe(1);
      const skip = s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      });
      expect(skip.ok).toBe(false);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "selectCards", instanceIds: [s.inst(alias).instanceId] },
        }),
      ).toEqual({ ok: true });
    }
    await settle(() => player.deck.length === 1 && s.state.pendingDecision === undefined);

    expect(player.hand.map((card) => card.cardId).sort()).toEqual(["BT18-060", "ST18-03"]);
    expect(player.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });
});
