import { digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-041.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
describe("BT26-041 Hudiemon", () => {
  it("exposes the printed level-3 Larva/Insectoid/NSp evolution", () => {
    expect(digivolutionRequirementsFor("BT26-041")).toContainEqual({
      level: 3,
      traits: ["Larva", "Insectoid", "NSp"],
      cost: 2,
      isAlternate: true,
    });
  });
  it("compiles both play windows with security handoff, recovery, and optional suspend", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]?.actions).toMatchObject([
      { kind: "SecurityManipulation", op: "toHand" },
      { kind: "SecurityManipulation", op: "addTop" },
      { kind: "Suspend", optional: true },
    ]);
    expect(compiled.effects[1]?.actions).toEqual(compiled.effects[0]?.actions);
  });
  it("publicly moves the top security card to hand, recovers from deck, and may suspend a Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT26-041", as: "hudiemon" }], security: ["AD1-001"], deck: ["AD1-002"] },
        1: { battleArea: [{ card: "BT5-022", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponent").permanentId);
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hudiemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players.some((player) => player.battleArea.some((permanent) => permanent.isSuspended)));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "AD1-001")).toBe(true);
    expect(s.state.players[0]!.security[0]!.cardId).toBe("AD1-002");
    expect(s.perm("opponent").isSuspended).toBe(true);
  });

  it("gains one memory when its inherited host wins a battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-044", as: "winner", dp: 10000, under: ["BT26-041"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 1000 }] },
    });
    s.state.memory = 0;
    await s.ready();
    const victimId = s.perm("victim").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("winner").permanentId,
        target: { kind: "permanent", permanentId: victimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1 && !observe(s.engine).isAttacking());

    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory when a different Digimon wins a battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-044", as: "host", under: ["BT26-041"] },
          { card: "BT1-080", as: "ally", dp: 10000 },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 1000 }] },
    });
    s.state.memory = 0;
    await s.ready();
    const victimId = s.perm("victim").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "permanent", permanentId: victimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.memory).toBe(0);
  });
});
