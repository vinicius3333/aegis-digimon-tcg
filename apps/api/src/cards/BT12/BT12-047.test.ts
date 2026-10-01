import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-047.js";

it("adds both eligible cards from the reveal and bottoms the remainder", async () => {
  const s = setupEngine(
    {
      0: {
        hand: [{ card: "BT12-047", as: "wormmon" }],
        deck: ["BT17-077", "BT3-094", "BT1-009"],
      },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 3;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wormmon").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT3-094"));
  expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["BT17-077", "BT3-094"]));
  expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("BT1-009");
});

it("adds the eligible Digimon even when no Ken Ichijoji is revealed", async () => {
  const s = setupEngine(
    {
      0: {
        hand: [{ card: "BT12-047", as: "wormmon" }],
        deck: ["BT17-077", "BT1-009", "BT1-010"],
      },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 3;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wormmon").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT17-077"));
  expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT17-077");
  expect(s.state.players[0]!.deck).toHaveLength(2);
});

it("adds Ken Ichijoji even when no eligible Digimon is revealed", async () => {
  const s = setupEngine(
    { 0: { hand: [{ card: "BT12-047", as: "wormmon" }], deck: ["BT3-094", "BT1-009", "BT1-010"] } },
    { autoSelectCards: true },
  );
  s.state.memory = 3;
  s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wormmon").instanceId });
  await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT3-094"));
  expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT3-094"]);
  expect(s.state.players[0]!.deck).toHaveLength(2);
});

it("may DNA digivolve its host with another Digimon at end of its turn", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT1-069", as: "green", under: ["BT12-047"] },
          { card: "BT1-032", as: "blue" },
        ],
        hand: [{ card: "BT12-028", as: "paildramon" }],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 3;
  const greenTop = s.perm("green").topCard.instanceId;
  const blueTop = s.perm("blue").topCard.instanceId;
  await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("green"));
  await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-028"));
  const result = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT12-028")!;
  expect(result.stack.map(({ instanceId }) => instanceId)).toEqual(expect.arrayContaining([greenTop, blueTop]));
  expect(s.state.memory).toBe(3);
});

describe("BT12-047 Wormmon — KB Q&A rulings", () => {
  async function playWormmonRevealing(deck: string[]) {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT12-047", as: "wormmon" }], deck } },
      { autoSelectCards: true, declineDigiXros: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wormmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length + s.state.players[0]!.hand.length === 3);
    await settle(() => s.state.pendingDecision === undefined);
    return s;
  }

  it("adds the one matching card when only a Digimon or only a Ken Ichijoji is revealed (Q2178)", async () => {
    const digimonOnly = await playWormmonRevealing(["BT17-077", "BT1-009", "BT1-010"]);
    expect(digimonOnly.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT17-077"]);
    expect(digimonOnly.state.players[0]!.deck.map(({ cardId }) => cardId).sort()).toEqual(["BT1-009", "BT1-010"]);

    const kenOnly = await playWormmonRevealing(["BT3-094", "BT1-009", "BT1-010"]);
    expect(kenOnly.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT3-094"]);
    expect(kenOnly.state.players[0]!.deck.map(({ cardId }) => cardId).sort()).toEqual(["BT1-009", "BT1-010"]);

    const neither = await playWormmonRevealing(["BT1-009", "BT1-010", "BT1-011"]);
    expect(neither.state.players[0]!.hand).toHaveLength(0);
    expect(neither.state.players[0]!.deck).toHaveLength(3);
  });

  it("must add both the Digimon and the Ken Ichijoji when both are revealed (Q2179)", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT12-047", as: "wormmon" }],
        deck: [{ card: "BT17-077", as: "imperialdramon" }, { card: "BT3-094", as: "ken" }, "BT1-009"],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wormmon").instanceId })).toEqual({
      ok: true,
    });

    for (const alias of ["imperialdramon", "ken"]) {
      await settle(() => s.state.pendingDecision?.kind === "selectCards");
      const pending = s.state.pendingDecision!;
      const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req;
      expect(request.options?.min).toBe(1);
      expect(request.options?.candidateInstanceIds).toEqual([s.inst(alias).instanceId]);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: pending.decisionId,
          response: { kind: "selectCards", instanceIds: [] },
        }),
      ).toMatchObject({ ok: false });
      expect(s.state.pendingDecision?.decisionId).toBe(pending.decisionId);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: pending.decisionId,
          response: { kind: "selectCards", instanceIds: [s.inst(alias).instanceId] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.decisionId !== pending.decisionId);
    }

    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId).sort()).toEqual(["BT17-077", "BT3-094"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
  });
});
