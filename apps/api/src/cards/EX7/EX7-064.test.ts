import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-064.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "surrender" }).ok)
    throw new Error("failed to stop turn loop");
  await loop;
}

function attackPlayer(s: ReturnType<typeof setupEngine>, seat: 0 | 1, alias: string) {
  return s.engine.applyIntent(seat, {
    type: "attack",
    attackerPermanentId: s.perm(alias).permanentId,
    target: { kind: "player" },
  });
}

describe("EX7-064 Shoto Kazama", () => {
  it("matches the catalog, restriction record, and fully registered IR", () => {
    expect(getCardDefinition("EX7-064")).toMatchObject({
      cardId: "EX7-064",
      nameEn: "Shoto Kazama",
      colors: ["Green"],
      kinds: ["Tamer"],
      playCost: 3,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "StartOfYourMainPhase",
        actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "opponentHas" } }],
      },
      {
        trigger: "EndOfYourTurn",
        optional: true,
        actions: [
          {
            kind: "GainKeyword",
            keyword: { keyword: "Piercing" },
            duration: "untilOpponentTurnEnd",
            target: { bindAs: "shoto-target" },
            cost: { kind: "suspend", target: { isSelf: true } },
          },
          {
            kind: "GainKeyword",
            keyword: { keyword: "Blocker" },
            duration: "untilOpponentTurnEnd",
            target: { sameTarget: true },
          },
          {
            kind: "Unsuspend",
            target: {
              filter: {
                boundRef: "shoto-target",
                nameOrTrait: [{ tokens: ["Vortex Warriors"], match: "trait" }],
              },
            },
          },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
      },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(hasRegisteredCompiledCard("EX7-064")).toBe(true);
  });

  it.each([
    ["with an opposing Digimon", true, 3],
    ["without an opposing Digimon", false, 2],
  ])("resolves Start of Main %s", async (_label, hasOpponent, expectedMemory) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-064", as: "shoto" }],
        hand: ["BT1-009"],
        deck: ["BT1-009", "BT1-010"],
        security: ["BT1-009"],
      },
      1: {
        ...(hasOpponent ? { battleArea: [{ card: "BT1-009", as: "opponent" }] } : {}),
        hand: ["BT1-009"],
        deck: ["BT1-009", "BT1-010"],
        security: ["BT1-010"],
      },
    });
    s.state.memory = 2;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(expectedMemory);
    await stopLoop(s, loop, 0);
  });

  it("pays 3 to play from hand", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX7-064", as: "shoto" }] } });
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shoto").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(1);
  });

  it.each([true, false])(
    "resolves Shoto before Vortex=%s in the real end-turn window (Q3868/Q3869)",
    async (shotoFirst) => {
      const shoto = { card: "EX7-064", as: "shoto" };
      const vortex = { card: "EX7-034", as: "vortex", suspended: shotoFirst };
      const s = setupEngine(
        {
          0: {
            battleArea: shotoFirst ? [shoto, vortex] : [vortex, shoto],
            hand: ["BT1-009"],
            deck: ["BT1-009", "BT1-010"],
            security: ["BT1-009"],
          },
          1: {
            battleArea: [{ card: "BT1-009", as: "target" }],
            hand: ["BT1-009"],
            security: ["BT1-010", "BT1-011"],
            deck: ["BT1-009", "BT1-010"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      const targetId = s.perm("target").permanentId;
      const vortexId = s.perm("vortex").permanentId;
      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await turn;
      expect(s.events.filter(({ kind }) => kind === "attackDeclared")).toEqual([
        expect.objectContaining({
          attackerPermanentId: vortexId,
          target: { kind: "permanent", permanentId: targetId },
        }),
      ]);
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(s.state.players[1]!.security).toHaveLength(shotoFirst ? 1 : 2);
      expect(s.perm("shoto").isSuspended).toBe(true);
      expect(s.perm("vortex").isSuspended).toBe(shotoFirst);
      expect(observe(s.engine).hasPierce(s.perm("vortex"))).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("vortex"), "Blocker")).toBe(true);
      expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "EX7-064")).toBe(true);
      expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "EX7-034")).toBe(true);
    },
  );

  it("grants both keywords to a non-Vortex target, then expires after the opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-064", as: "shoto" },
            { card: "BT1-009", as: "ordinary", suspended: true },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-009"],
        },
        1: { hand: ["BT1-009"], deck: ["BT1-009", "BT1-010", "BT1-011"], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasPierce(s.perm("ordinary"))).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ordinary"), "Blocker")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasPierce(s.perm("ordinary"))).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("ordinary"), "Blocker")).toBe(false);
    await stopLoop(s, loop, 0);
  });

  it("may decline without suspending itself or changing the target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-064", as: "shoto" },
            { card: "BT1-009", as: "ordinary", suspended: true },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-010"],
          security: ["BT1-009"],
        },
        1: { hand: ["BT1-009"], deck: ["BT1-009", "BT1-010"], security: ["BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).runTurn(0);
    expect(s.perm("shoto").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("ordinary"), "Blocker")).toBe(false);
  });

  it("plays itself from Security during a real check", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX7-064", as: "shoto" }, "BT1-009"] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(attackPlayer(s, 1, "attacker")).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("shoto").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.memory).toBe(0);
  });
});
