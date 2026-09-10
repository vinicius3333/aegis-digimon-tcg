import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-065.js";
import "../index.js";

async function stopLoop(s: EngineSetup, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "surrender" }).ok)
    throw new Error("failed to stop turn loop");
  await loop;
}

function mainEffect(s: EngineSetup) {
  return observe(s.engine)
    .activatableEffects(s.perm("yuuki"))
    .find(({ description }) => /digivolve/i.test(description ?? ""));
}

describe("EX7-065 Yuuki", () => {
  it("matches the catalog and fully registered IR", () => {
    expect(getCardDefinition("EX7-065")).toMatchObject({
      cardId: "EX7-065",
      nameEn: "Yuuki",
      colors: ["Purple"],
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
        trigger: "Main",
        actions: [
          {
            kind: "Digivolve",
            from: ["trash"],
            payCost: true,
            optional: true,
            abortOnDecline: true,
            condition: { kind: "zoneCount", zone: "hand", op: "lte", value: 4 },
            cost: { kind: "suspend", target: { isSelf: true } },
            into: {
              nameOrTrait: [{ tokens: ["Dark Dragon", "Evil Dragon"], match: "trait" }],
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
    expect(hasRegisteredCompiledCard("EX7-065")).toBe(true);
  });

  it.each([
    ["with an opposing Digimon", true, 3],
    ["without an opposing Digimon", false, 2],
  ])("resolves Start of Main %s", async (_label, hasOpponent, expectedMemory) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-065", as: "yuuki" }],
        hand: ["BT1-009"],
        deck: ["BT1-009", "BT1-010"],
        security: ["BT1-009"],
      },
      1: {
        ...(hasOpponent ? { battleArea: [{ card: "BT1-009" }] } : {}),
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
    const s = setupEngine({ 0: { hand: [{ card: "EX7-065", as: "yuuki" }] } });
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("yuuki").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(1);
  });

  it.each([
    ["Dark Dragon", "EX7-056", "EX7-060", 3],
    ["Evil Dragon", "EX7-053", "BT21-077", 4],
  ])("publicly evolves into a %s from trash at the four-card boundary", async (_trait, base, into, cost) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-065", as: "yuuki" },
            { card: base, as: "base" },
          ],
          hand: ["BT1-009", "BT1-010", "BT1-014", "BT1-038"],
          trash: [{ card: into, as: "into" }],
          deck: [{ card: "BT1-040", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const sourceId = s.perm("base").topCard.instanceId;
    const effect = mainEffect(s);
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("yuuki").topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("into").instanceId);
    expect(s.perm("yuuki").isSuspended).toBe(true);
    expect(s.state.memory).toBe(10 - cost);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("drawn").instanceId]),
    );
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("into").instanceId)).toBe(false);
  });

  it("does not expose the Main effect with five cards in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX7-065", as: "yuuki" },
          { card: "EX7-056", as: "base" },
        ],
        hand: ["BT1-009", "BT1-010", "BT1-014", "BT1-038", "BT1-040"],
        trash: [{ card: "EX7-060", as: "into" }],
      },
    });
    await s.ready();
    expect(mainEffect(s)).toBeUndefined();
    expect(s.perm("yuuki").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX7-060")).toBe(true);
  });

  it("may decline without suspending Yuuki or evolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-065", as: "yuuki" },
            { card: "EX7-056", as: "base" },
          ],
          hand: ["BT1-009", "BT1-010", "BT1-014", "BT1-038"],
          trash: [{ card: "EX7-060", as: "into" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const effect = mainEffect(s)!;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("yuuki").topCard.instanceId,
        effectKey: effect.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("yuuki").isSuspended).toBe(false);
    expect(s.perm("base").topCard.cardId).toBe("EX7-056");
    expect(s.state.memory).toBe(10);
  });

  it("does not expose the Main effect without a legal trait target", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX7-065", as: "yuuki" },
          { card: "EX7-056", as: "base" },
        ],
        hand: ["BT1-009"],
        trash: [{ card: "BT10-022", as: "miss" }],
      },
    });
    await s.ready();
    expect(mainEffect(s)).toBeUndefined();
    expect(s.perm("yuuki").isSuspended).toBe(false);
  });

  it("plays itself from Security during a real check", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX7-065", as: "yuuki" }, "BT1-009"] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("yuuki").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.memory).toBe(0);
  });
});
