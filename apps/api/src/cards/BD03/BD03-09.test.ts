import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

const cardId = "BD03-09";
const pteromon = "BD03-03";
const redLevel3 = "BT1-009";

describe("BD03-09 Black Wind Armor", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD03",
      nameEn: "Black Wind Armor",
      colors: ["Black"],
      kinds: ["Option"],
      playCost: 1,
      rarity: "C",
      effectText: "[Main] 1 of your Digimon gets +2000 DP until your opponent's turn ends.",
      securityEffectText: "[Security] Add this card to the hand.",
    });
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("gives 1 of your Digimon +2000 DP until the end of your opponent's turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: pteromon, as: "pteromon" },
            { card: redLevel3, as: "ally" },
          ],
          hand: [{ card: cardId, as: "armor" }],
          deck: [redLevel3, redLevel3],
          security: [redLevel3],
        },
        1: {
          battleArea: [{ card: redLevel3, as: "opponentDigimon" }],
          deck: [redLevel3, redLevel3],
          security: [redLevel3],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("pteromon").permanentId);
    s.state.memory = 3;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const memoryAtMain = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("armor").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("pteromon").currentDP === 4000);

    const selection = s.decisions.find((decision) => decision.req.kind === "chooseTargets");
    expect([...(selection?.req.options?.candidateInstanceIds ?? [])].sort()).toEqual(
      [s.perm("pteromon").permanentId, s.perm("ally").permanentId].sort(),
    );
    expect(s.state.memory).toBe(memoryAtMain - 1);
    expect(s.perm("ally").currentDP).toBe(3000);
    expect(s.perm("opponentDigimon").currentDP).toBe(3000);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([cardId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).recompute();

    expect(s.perm("pteromon").currentDP).toBe(4000);

    await advance(s.engine).runTurn(1);
    await advance(s.engine).recompute();

    expect(s.perm("pteromon").currentDP).toBe(2000);
  });

  it("adds itself to the hand when revealed as a security card", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: cardId, as: "armor" }] },
        1: { battleArea: [{ card: redLevel3, as: "attacker" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("armor").instanceId]);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});
