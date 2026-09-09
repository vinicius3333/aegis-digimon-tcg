import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-052.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "surrender" }).ok)
    throw new Error("failed to stop loop");
  await loop;
}

describe("EX7-052", () => {
  it("matches the catalog and fully registered IR", () => {
    expect(getCardDefinition("EX7-052")).toMatchObject({
      cardId: "EX7-052",
      nameEn: "Tsukaimon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Mammal"],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "trash" },
      ],
      rest: "deckBottom",
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "EndAttack",
              cost: { kind: "deleteOwn", target: { filter: { excludeSelf: true }, count: 1 } },
            },
          ],
        },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(hasRegisteredCompiledCard("EX7-052")).toBe(true);
  });

  it("publicly reveals a Lilithmon-text card to hand and a purple card to trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-052", as: "tsukai" }],
          deck: [
            { card: "EX7-061", as: "lilithmon" },
            { card: "EX7-053", as: "purple" },
            { card: "BT1-009", as: "rest" },
            { card: "BT1-010", as: "unrevealed" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tsukai").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX7-061"));
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("lilithmon").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("purple").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("unrevealed").instanceId,
      s.inst("rest").instanceId,
    ]);
  });

  it("evolves for 0 from purple level 2 with exact draw/stack and rejects red level 2", async () => {
    const legal = setupEngine({
      0: {
        breeding: { card: "EX7-006", as: "base" },
        hand: [{ card: "EX7-052", as: "tsukai" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    legal.state.memory = 1;
    await legal.ready();
    const sourceId = legal.perm("base").topCard.instanceId;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("tsukai").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.cardId === "EX7-052");
    expect(legal.state.memory).toBe(1);
    expect(legal.perm("base").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(legal.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([legal.inst("drawn").instanceId]);

    const invalid = setupEngine({
      0: { breeding: { card: "EX7-001", as: "base" }, hand: [{ card: "EX7-052", as: "tsukai" }] },
    });
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("tsukai").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("publicly ends an opponent attack after deleting another own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-042", as: "host", under: ["EX7-052"] },
            { card: "EX7-038", as: "cost" },
          ],
          security: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
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
    await settle(() => s.state.players[0]!.battleArea.every((permanent) => permanent.topCard.cardId !== "EX7-038"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-038")).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("does not end an attack when Armor Purge prevents the deletion cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-042", as: "host", under: ["EX7-052"] },
            { card: "BT8-039", as: "cost", under: ["BT8-046"] },
          ],
          security: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
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
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT8-046")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT8-039")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("Q3860: ends an attack even when the attacking Digimon is immune to effects", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-042", as: "host", under: ["EX7-052"] },
            { card: "EX7-038", as: "cost" },
          ],
          security: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT15-047", as: "immune" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("immune").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-038"));
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT15-047")).toBe(true);
  });

  it("ends only the first attack each opponent turn and rearms on their next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-042", as: "host", under: ["EX7-052"] },
            { card: "EX7-038", as: "firstCost" },
            { card: "EX7-040", as: "secondCost" },
          ],
          security: ["BT1-009", "BT1-010"],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstAttacker" },
            { card: "BT1-010", as: "secondAttacker" },
            { card: "BT1-011", as: "thirdAttacker" },
          ],
          deck: ["BT1-014", "BT1-015", "BT1-016"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-038"));
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-040")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("thirdAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-040"));
    expect(s.state.players[0]!.security).toHaveLength(1);
    await stopLoop(s, loop, 1);
  });
});
