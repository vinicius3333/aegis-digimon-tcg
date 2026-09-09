import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-025.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1) {
  expect(s.engine.applyIntent(seat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("EX7-025 ShoeShoemon", () => {
  it("matches the catalog and compiles both printed clauses", () => {
    const definition = getCardDefinition("EX7-025");
    if (definition === undefined) throw new Error("EX7-025 is missing from the card catalog");
    expect(definition).toMatchObject({
      cardId: "EX7-025",
      nameEn: "ShoeShoemon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Yellow", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Puppet", "LIBERATOR"],
      effectText:
        "[When Digivolving] If you have 1 or fewer Tamers, you may play 1 [Arisa Kinosaki] from your hand without paying the cost.",
      inheritedEffectText: "[Your Turn] All of your opponent's Security Digimon get -3000 DP.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Arisa Kinosaki"], match: "nameExact" }] },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "battleArea",
            filter: { kind: ["Tamer"] },
            op: "lte",
            value: 1,
          },
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifySecurityDP", controller: "opponent", amount: -3000, duration: "permanent" }],
    });
  });

  it("legally evolves from Yellow Lv3 for 2 memory, draws once, preserves the stack, and plays Arisa at the one-Tamer boundary", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-049", as: "source" },
            { card: "BT10-090", as: "existingTamer" },
          ],
          hand: [
            { card: "EX7-025", as: "shoe" },
            { card: "EX7-063", as: "arisa" },
          ],
          deck: [{ card: "BT1-028", as: "drawn" }, "BT1-009"],
        },
        1: { deck: ["BT1-028"], security: ["BT1-028"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 2;
    const sourceInstanceId = s.perm("source").topCard.instanceId;
    const drawInstanceId = s.state.players[0]!.deck[0]!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("shoe").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("source").topCard.cardId === "EX7-025" &&
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard?.instanceId === s.inst("arisa").instanceId,
        ),
    );
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawInstanceId);
    expect(s.perm("source").topCard.cardId).toBe("EX7-025");
    expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([sourceInstanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("arisa").instanceId);
    await stopLoop(s, loop, 0);
  });

  it("allows the optional Arisa play to be declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-049", as: "source" }],
          hand: [
            { card: "EX7-025", as: "shoe" },
            { card: "EX7-063", as: "arisa" },
          ],
          deck: ["BT1-028"],
        },
        1: { deck: ["BT1-028"], security: ["BT1-028"] },
      },
      { autoDeclineOptional: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("shoe").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX7-025");
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("arisa").instanceId),
    ).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("arisa").instanceId);
    await stopLoop(s, loop, 0);
  });

  it("does not play Arisa when two Tamers are already present and does not substitute a non-Arisa Tamer", async () => {
    const tooMany = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-049", as: "source" },
            { card: "BT10-090", as: "tamerA" },
            { card: "BT10-090", as: "tamerB" },
          ],
          hand: [
            { card: "EX7-025", as: "shoe" },
            { card: "EX7-063", as: "arisa" },
          ],
          deck: ["BT1-028"],
        },
        1: { deck: ["BT1-028"], security: ["BT1-028"] },
      },
      { autoAcceptOptional: true },
    );
    const loop = tooMany.engine.startTurnLoop();
    await advance(tooMany.engine).waitForMainPhase(0);
    tooMany.state.memory = 2;
    expect(
      tooMany.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: tooMany.perm("source").permanentId,
        instanceId: tooMany.inst("shoe").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => tooMany.perm("source").topCard.cardId === "EX7-025");
    expect(tooMany.state.players[0]!.hand.map((card) => card.instanceId)).toContain(tooMany.inst("arisa").instanceId);
    await stopLoop(tooMany, loop, 0);

    const wrongTarget = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-049", as: "source" }],
          hand: [
            { card: "EX7-025", as: "shoe" },
            { card: "BT10-090", as: "wrongTamer" },
          ],
          deck: ["BT1-028"],
        },
        1: { deck: ["BT1-028"], security: ["BT1-028"] },
      },
      { autoAcceptOptional: true },
    );
    const wrongLoop = wrongTarget.engine.startTurnLoop();
    await advance(wrongTarget.engine).waitForMainPhase(0);
    wrongTarget.state.memory = 2;
    expect(
      wrongTarget.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongTarget.perm("source").permanentId,
        instanceId: wrongTarget.inst("shoe").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => wrongTarget.perm("source").topCard.cardId === "EX7-025");
    expect(wrongTarget.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      wrongTarget.inst("wrongTamer").instanceId,
    );
    expect(
      wrongTarget.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT10-090"),
    ).toHaveLength(0);
    await stopLoop(wrongTarget, wrongLoop, 0);
  });

  it("inherits -3000 DP to opposing Security Digimon only on the owner's turn and proves it in battle", async () => {
    const active = setupEngine({
      0: { battleArea: [{ card: "BT1-059", as: "host", under: ["EX7-025"] }], deck: ["BT1-028"] },
      1: { security: ["BT2-037"], deck: ["BT1-028"] },
    });
    const activeLoop = active.engine.startTurnLoop();
    await advance(active.engine).waitForMainPhase(0);
    expect(observe(active.engine).securityDp(1)).toBe(-3000);
    expect(
      active.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: active.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(active.engine).isAttacking());
    expect(active.state.players[1]!.security).toHaveLength(0);
    expect(active.state.players[0]!.battleArea).toHaveLength(1);
    await stopLoop(active, activeLoop, 0);

    const inactive = setupEngine({
      0: { battleArea: [{ card: "BT1-059", as: "host", under: ["EX7-025"] }], deck: ["BT1-028"] },
      1: { security: ["BT2-037"], deck: ["BT1-028"] },
    });
    inactive.state.turnSeat = 1;
    await inactive.ready();
    expect(observe(inactive.engine).securityDp(1)).toBe(0);
  });

  it("rejects a wrong-color and wrong-level source without paying, drawing, or changing the stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "wrongSource" }],
        hand: [{ card: "EX7-025", as: "shoe" }],
        deck: ["BT1-028"],
      },
    });
    await s.ready();
    s.state.memory = 2;
    const beforeDeck = s.state.players[0]!.deck.map((card) => card.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongSource").permanentId,
        instanceId: s.inst("shoe").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(beforeDeck);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX7-025");
    expect(s.perm("wrongSource").topCard.cardId).toBe("BT1-009");
    expect(s.perm("wrongSource").stack).toHaveLength(0);
  });
});
