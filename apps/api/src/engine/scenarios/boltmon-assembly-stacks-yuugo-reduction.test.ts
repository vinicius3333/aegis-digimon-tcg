import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { setupEngine, settle, type EngineSetup } from "../testkit/harness.js";

const distinctFlameDigimon = ["BT22-010", "BT22-011", "BT22-074", "BT15-069", "BT27-012"];

async function board() {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT22-092", as: "jimmy" },
          { card: "BT22-094", as: "yuugo" },
        ],
        hand: [{ card: "BT22-078", as: "boltmon" }],
        trash: [
          ...distinctFlameDigimon.map((card, index) => ({ card, as: `flame${index}` })),
          { card: "BT10-001", as: "flameEgg" },
          { card: "BT22-010", as: "repeatedNumber" },
        ],
        deck: Array(10).fill("BT1-009"),
      },
      1: { deck: Array(10).fill("BT1-009") },
    },
    { autoSelectCards: true },
  );
  s.state.memory = 5;
  await s.ready();
  await s.engine.recomputeContinuousEffects();
  return s;
}

const materialIds = (s: EngineSetup, aliases: string[]) => aliases.map((alias) => s.inst(alias).instanceId);
const flameAliases = distinctFlameDigimon.map((_, index) => `flame${index}`);

function playBoltmon(s: EngineSetup, aliases: string[]) {
  return s.engine.applyIntent(0, {
    type: "playCard",
    instanceId: s.inst("boltmon").instanceId,
    assembly: { materialInstanceIds: materialIds(s, aliases) },
  });
}

describe("Boltmon Assembly stacks with Yuugo's play cost reduction", () => {
  it("plays Boltmon for 4 memory with five distinct [Flame] Digimon and Yuugo", async () => {
    const s = await board();
    expect(playBoltmon(s, flameAliases)).toEqual({ ok: true });

    const answered: string[] = [];
    const boltmonResolved = () =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT22-078") &&
      s.state.pendingDecision === undefined;
    while (!boltmonResolved()) {
      await settle(() => s.state.pendingDecision?.kind === "optional" || boltmonResolved());
      const decision = s.state.pendingDecision;
      if (decision === undefined) break;
      const sourceCardId = s.decisions.find(({ req }) => req.decisionId === decision.decisionId)?.req.sourceCardId;
      answered.push(sourceCardId ?? "");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "optional", accept: sourceCardId === "BT22-094" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.decisionId !== decision.decisionId);
    }

    expect(answered[0]).toBe("BT22-094");
    expect(s.state.memory).toBe(5 - (12 - 6 - 2));
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.state.turnSeat).toBe(0);
    const boltmon = s.perm("boltmon");
    expect(boltmon.stack.map((card) => card.instanceId).sort()).toEqual(materialIds(s, flameAliases).sort());
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("yuugo").instanceId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId).sort()).toEqual(
      ["BT22-078", "BT22-092"].sort(),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      materialIds(s, ["flameEgg", "repeatedNumber"]).sort(),
    );
  });

  it.each([
    ["a [Flame] Digi-Egg", "flameEgg"],
    ["a repeated card number", "repeatedNumber"],
  ])("rejects %s as the fifth material without paying or consuming Yuugo", async (_label, fifth) => {
    const s = await board();
    expect(playBoltmon(s, [...flameAliases.slice(0, 4), fifth])).toEqual({ ok: false, reason: "invalid-material" });
    expect(s.state.memory).toBe(5);
    expect(s.decisions).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("boltmon").instanceId]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([
      "BT22-092",
      "BT22-094",
    ]);
  });
});
