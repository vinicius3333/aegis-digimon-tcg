import { describe, expect, it } from "vitest";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-111.js";

describe("BT2-111 Beelzemon", () => {
  it("digivolves from Impmon for 4 with 10 cards in trash, ignoring requirements", async () => {
    const trash = Array.from({ length: 10 }, (_, index) => ({
      card: `BT1-${String((index % 8) + 1).padStart(3, "0")}`,
    }));
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-068", as: "impmon" }], hand: [{ card: "BT2-111", as: "beelzemon" }], trash },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("impmon").permanentId,
        instanceId: s.inst("beelzemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("impmon").topCard?.cardId === "BT2-111");
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash).toHaveLength(10);
  });

  it("rejects the Impmon shortcut with fewer than 10 cards in trash", () => {
    const trash = Array.from({ length: 9 }, (_, index) => ({
      card: `BT1-${String((index % 8) + 1).padStart(3, "0")}`,
    }));
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-068", as: "impmon" }], hand: [{ card: "BT2-111", as: "beelzemon" }], trash },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("impmon").permanentId,
        instanceId: s.inst("beelzemon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("does not treat Impmon (X Antibody) as the exact [Impmon] base", () => {
    const trash = Array.from({ length: 10 }, (_, index) => ({
      card: `BT1-${String((index % 8) + 1).padStart(3, "0")}`,
    }));
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-073", as: "impmonX" }], hand: [{ card: "BT2-111", as: "beelzemon" }], trash },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("impmonX").permanentId,
        instanceId: s.inst("beelzemon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("Q1042 rejects the Impmon shortcut in the breeding area", () => {
    const trash = Array.from({ length: 10 }, (_, index) => ({
      card: `BT1-${String((index % 8) + 1).padStart(3, "0")}`,
    }));
    const s = setupEngine({
      0: {
        breeding: { card: "BT2-068", as: "impmon" },
        hand: [{ card: "BT2-111", as: "beelzemon" }],
        trash,
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("impmon").permanentId,
        instanceId: s.inst("beelzemon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("When Digivolving selects one opposing level 4 or lower Digimon and excludes level 5", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-077", as: "base" }], hand: [{ card: "BT2-111", as: "evolving" }] },
      1: {
        battleArea: [
          { card: "BT2-013", as: "first" },
          { card: "BT2-044", as: "second" },
          { card: "BT2-046", as: "levelFive" },
        ],
      },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === decision.decisionId)!.req;
    expect(request.options!.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("first").permanentId, s.perm("second").permanentId]),
    );
    expect(request.options!.candidateInstanceIds).toHaveLength(2);
    expect(request.options!.candidateInstanceIds).not.toContain(s.perm("levelFive").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("second").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT2-013", "BT2-046"]);
  });
});

function trashCards(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    card: `BT1-${String((index % 8) + 1).padStart(3, "0")}`,
  }));
}

async function activateOnlyEffect(s: ReturnType<typeof setupEngine>, alias: string) {
  const entries = JSON.parse(s.perm(alias).activatableEffectsJson || "[]") as { effectKey: string }[];
  if (entries.length === 0) return false;
  s.engine.applyIntent(0, {
    type: "activateEffect",
    sourceInstanceId: s.perm(alias).topCard!.instanceId,
    effectKey: entries[0]!.effectKey,
  });
  await drainMicrotasks();
  return true;
}

interface ContinuousEffectsProbe {
  recomputeContinuousEffects(): Promise<void>;
  continuous: { blocksCostReduction(seat: number, costType: "digivolve" | "play"): boolean };
}

async function digivolveImpmonAgainstRestrictor(restrictingCardId: string) {
  const s = setupEngine({
    0: {
      battleArea: [{ card: "BT2-068", as: "impmon" }],
      hand: [{ card: "BT2-111", as: "beelzemon" }],
      trash: trashCards(10),
    },
    1: { battleArea: [{ card: restrictingCardId, as: "restrictor" }] },
  });
  s.state.memory = 5;
  await s.ready();
  const probe = s.engine as unknown as ContinuousEffectsProbe;
  await probe.recomputeContinuousEffects();
  const reductionBlocked = probe.continuous.blocksCostReduction(0, "digivolve");
  const result = s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: s.perm("impmon").permanentId,
    instanceId: s.inst("beelzemon").instanceId,
  });
  await drainMicrotasks();
  return { s, reductionBlocked, result };
}

async function activateDigivolveEffectWithImpmon(effectCardId: string, trashCount: number) {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: effectCardId, as: "effectSource" },
          { card: "BT2-068", as: "impmon" },
        ],
        hand: [{ card: "BT2-111", as: "beelzemon" }],
        trash: trashCards(trashCount),
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 5;
  s.state.turnCount = 1;
  await s.ready();
  await activateOnlyEffect(s, "effectSource");
  return s;
}

describe("BT2-111 Beelzemon — effect-driven digivolution trash gate", () => {
  it("keeps Impmon from using the shortcut through Calumon's effect with 9 cards in trash", async () => {
    await import("../BT19/BT19-077.js");
    const s = await activateDigivolveEffectWithImpmon("BT19-077", 9);
    expect(s.perm("impmon").topCard.cardId).toBe("BT2-068");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT2-111");
  });

  // Wisdom Training trashes itself for <Delay>, so 8 cards become 9 before the digivolution.
  it("keeps Impmon from using the shortcut through Wisdom Training's Delay with 9 cards in trash", async () => {
    await import("../P/P-108.js");
    const s = await activateDigivolveEffectWithImpmon("P-108", 8);
    expect(s.state.players[0]!.trash).toHaveLength(9);
    expect(s.perm("impmon").topCard.cardId).toBe("BT2-068");
  });
});

describe("BT2-111 Beelzemon — KB Q&A rulings", () => {
  it("lets another card's digivolve effect use the Impmon shortcut with 10 or more cards in trash (Q1043)", async () => {
    await import("../BT19/BT19-077.js");
    async function runWithBase(baseCardId: string) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT19-077", as: "calumon" },
              { card: baseCardId, as: "base" },
            ],
            hand: [{ card: "BT2-111", as: "beelzemon" }],
            trash: trashCards(10),
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 5;
      await s.ready();
      const offered = await activateOnlyEffect(s, "calumon");
      return { s, offered };
    }

    const impmon = await runWithBase("BT2-068");
    expect(impmon.offered).toBe(true);
    expect(impmon.s.perm("base").topCard.cardId).toBe("BT2-111");
    expect(impmon.s.perm("calumon").isSuspended).toBe(true);

    const demiDevimon = await runWithBase("BT2-067");
    expect(demiDevimon.offered).toBe(false);
    expect(demiDevimon.s.perm("base").topCard.cardId).toBe("BT2-067");
  });

  it("still digivolves Impmon for 4 while the opponent's Gaossmon blocks cost reductions (Q1287)", async () => {
    await import("../BT5/BT5-008.js");
    const outcome = await digivolveImpmonAgainstRestrictor("BT5-008");
    expect(outcome.reductionBlocked).toBe(true);
    expect(outcome.result).toEqual({ ok: true });
    expect(outcome.s.perm("impmon").topCard.cardId).toBe("BT2-111");
    expect(outcome.s.state.memory).toBe(1);
  });

  it("still digivolves Impmon for 4 while the opponent's Syakomon blocks cost reductions (Q1304)", async () => {
    await import("../BT5/BT5-021.js");
    const outcome = await digivolveImpmonAgainstRestrictor("BT5-021");
    expect(outcome.reductionBlocked).toBe(true);
    expect(outcome.result).toEqual({ ok: true });
    expect(outcome.s.perm("impmon").topCard.cardId).toBe("BT2-111");
    expect(outcome.s.state.memory).toBe(1);
  });

  it("still digivolves Impmon for 4 while the opponent's Cutemon blocks cost reductions (Q1315)", async () => {
    await import("../BT5/BT5-033.js");
    const outcome = await digivolveImpmonAgainstRestrictor("BT5-033");
    expect(outcome.reductionBlocked).toBe(true);
    expect(outcome.result).toEqual({ ok: true });
    expect(outcome.s.perm("impmon").topCard.cardId).toBe("BT2-111");
    expect(outcome.s.state.memory).toBe(1);
  });

  it("lets Wisdom Training's Delay digivolve Impmon into Beelzemon with 10 or more cards in trash (Q4212)", async () => {
    await import("../P/P-108.js");
    async function runWithBase(baseCardId: string) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "P-108", as: "delay" },
              { card: baseCardId, as: "base" },
            ],
            hand: [{ card: "BT2-111", as: "beelzemon" }],
            trash: trashCards(10),
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 5;
      s.state.turnCount = 1;
      await s.ready();
      const offered = await activateOnlyEffect(s, "delay");
      return { s, offered };
    }

    const impmon = await runWithBase("BT2-068");
    expect(impmon.offered).toBe(true);
    expect(impmon.s.perm("base").topCard.cardId).toBe("BT2-111");
    expect(impmon.s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "P-108")).toBe(false);

    const demiDevimon = await runWithBase("BT2-067");
    expect(demiDevimon.s.perm("base").topCard.cardId).toBe("BT2-067");
  });
});
