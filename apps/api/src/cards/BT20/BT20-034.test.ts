import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-034.js";
import "./index.js";
import "./BT20-003.js";
import "../BT14/BT14-087.js";
import "../BT1/BT1-036.js";
import "./BT20-043.js";

describe("BT20-034 Boutmon", () => {
  it("has Fortitude, restricts one opponent Digimon after a Tamer enters the stack, and trashes security on inherited battle deletion", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Static")?.keywords).toEqual([
      { keyword: "Fortitude", raw: "＜Fortitude＞" },
    ]);
    const main = compiled.effects.find((entry) => entry.trigger === "AllTurns" && !entry.isInherited);
    expect(main).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { controllerDefault: "mine" },
          triggerFilter: { isSelfRef: true },
          addedDigivolutionCardFilter: { kind: ["Tamer"] },
          actions: [
            {
              kind: "Restrict",
              restriction: "cannotActivateWhenDigivolving",
              duration: "untilOpponentTurnEnd",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            },
          ],
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, texts: ["Pulsemon"], cost: 3, isAlternate: true },
      { level: 4, traits: ["SEEKERS"], cost: 3, isAlternate: true },
    ]);
  });

  it("has Fortitude and restricts an opponent after a Tamer enters its source stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-034", as: "boutmon" }],
          hand: [{ card: "BT20-085", as: "tamer" }],
        },
        1: { battleArea: [{ card: "BT20-010", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("boutmon"), "Fortitude")).toBe(true);
    await advance(s.engine).verb.placeUnder(s.perm("boutmon").permanentId, [s.inst("tamer").instanceId]);
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving"));

    const unrelatedHost = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-034", as: "boutmon" },
            { card: "BT20-030", as: "otherHost" },
          ],
          hand: [{ card: "BT20-085", as: "tamer" }],
        },
        1: { battleArea: [{ card: "BT20-010", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await unrelatedHost.ready();
    await advance(unrelatedHost.engine).verb.placeUnder(unrelatedHost.perm("otherHost").permanentId, [
      unrelatedHost.inst("tamer").instanceId,
    ]);
    expect(
      observe(unrelatedHost.engine).isRestricted(unrelatedHost.perm("target"), "cannotActivateWhenDigivolving"),
    ).toBe(false);
  });

  it("publicly replays the same Fortitude Digimon after it is deleted in battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-034", suspended: true, as: "boutmon", under: ["BT20-032"] }],
          security: ["BT1-010"],
          deck: ["BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-010", dp: 13000, as: "attacker" }],
          security: ["BT1-010"],
          deck: ["BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const originalInstanceId = s.inst("boutmon").instanceId;
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("boutmon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === originalInstanceId),
    );
    const replayed = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === originalInstanceId,
    );
    expect(replayed).toBeDefined();
    expect(replayed!.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT20-032")).toBe(true);
  });

  it("publicly places a matching Tamer through Bibimon's inherited end-of-turn effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-034", as: "boutmon", under: ["BT20-003", "BT20-029", "BT20-032"] },
            { card: "BT14-087", as: "tamer" },
          ],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT20-010", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("boutmon").permanentId;
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    await settle(() => s.perm("boutmon").stack.some((card) => card.instanceId === s.inst("tamer").instanceId));
    expect(s.perm("boutmon").stack.some((card) => card.instanceId === s.inst("tamer").instanceId)).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving")).toBe(true);
    expect(hostId).toBe(s.perm("boutmon").permanentId);
  });

  it("publicly evolves from a level-4 Digimon with Pulsemon in its text and rejects a level-3 source", async () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT20-032", as: "bulkmon" }], hand: [{ card: "BT20-034", as: "boutmon" }] },
    });
    legal.state.memory = 3;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("bulkmon").permanentId,
        instanceId: legal.inst("boutmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => legal.perm("bulkmon").topCard.cardId === "BT20-034" && legal.state.pendingDecision === undefined,
    );
    expect(legal.perm("bulkmon").stack.map((card) => card.cardId)).toEqual(["BT20-032"]);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT20-029", as: "pulsemon" }], hand: [{ card: "BT20-034", as: "boutmon" }] },
    });
    illegal.state.memory = 3;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("pulsemon").permanentId,
        instanceId: illegal.inst("boutmon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(illegal.perm("pulsemon").topCard.cardId).toBe("BT20-029");
    expect(illegal.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT20-034");
  });

  it("restricts exactly one selected opposing Digimon and expires at the real opponent turn end", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-034", as: "boutmon" }], hand: [{ card: "BT20-085", as: "tamer" }] },
        1: {
          battleArea: [
            { card: "BT20-010", as: "selected" },
            { card: "BT20-010", as: "other" },
          ],
          hand: [{ card: "BT1-070", as: "playable" }],
          deck: ["BT20-001", "BT20-001", "BT20-001", "BT20-001"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("selected").permanentId);
    await s.ready();
    await advance(s.engine).verb.placeUnder(s.perm("boutmon").permanentId, [s.inst("tamer").instanceId]);
    await settle(() => observe(s.engine).isRestricted(s.perm("selected"), "cannotActivateWhenDigivolving"));
    expect(observe(s.engine).isRestricted(s.perm("other"), "cannotActivateWhenDigivolving")).toBe(false);

    s.state.memory = -4;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    expect(observe(s.engine).isRestricted(s.perm("selected"), "cannotActivateWhenDigivolving")).toBe(false);
  });

  it("suppresses a restricted target's When Digivolving effect on a public evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-034", as: "boutmon" }],
          hand: [{ card: "BT20-085", as: "tamer" }],
        },
        1: {
          battleArea: [{ card: "BT20-071", as: "target" }],
          hand: [{ card: "BT20-035", as: "evolution" }],
          security: ["BT20-001", "BT20-002", "BT20-003"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.placeUnder(s.perm("boutmon").permanentId, [s.inst("tamer").instanceId]);
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving"));
    s.state.turnSeat = 1;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("target").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "BT20-035");
    expect(s.perm("boutmon").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(3);
  });

  it("inherits one opposing top-security trash after its host deletes in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-035", as: "host", under: ["BT20-034"] }] },
      1: {
        battleArea: [{ card: "BT20-010", dp: 1000, suspended: true, as: "opponent" }],
        security: ["BT20-001", "BT20-002"],
      },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 1);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("host"));
  });

  it("does not trash security when its host and the opponent leave simultaneously", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-043", dp: 12000, as: "host", under: ["BT20-034"] }] },
      1: {
        battleArea: [{ card: "BT20-010", dp: 12000, suspended: true, as: "opponent" }],
        security: ["BT1-010", "BT1-010"],
        deck: ["BT1-010", "BT1-010"],
      },
    });
    const hostId = s.perm("host").permanentId;
    const opponentId = s.perm("opponent").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: opponentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === opponentId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("resets inherited security trash after a real turn while the host remains over Boutmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-035", dp: 12000, as: "host", under: ["BT20-034"] }],
          hand: [{ card: "BT1-036", as: "garurumon" }, "BT1-010"],
          security: ["BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT20-010", dp: 1000, suspended: true, as: "first" },
            { card: "BT20-010", dp: 1000, suspended: true, as: "second" },
            { card: "BT20-010", dp: 3000, suspended: true, as: "third" },
          ],
          security: ["BT1-010", "BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoDeclineOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    const firstId = s.perm("first").permanentId;
    const secondId = s.perm("second").permanentId;
    const thirdId = s.perm("third").permanentId;
    await s.ready();
    s.state.memory = 6;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: firstId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 1 &&
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === firstId),
    );
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.memory).toBe(6);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("garurumon").instanceId));
    expect(s.state.memory).toBe(0);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: secondId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === secondId));
    expect(s.state.players[1]!.security).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: thirdId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "combatResolved").length === 3);
    expect(s.perm("third").isSuspended).toBe(true);
    expect(s.perm("host").topCard.cardId).toBe("BT20-035");
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: thirdId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === thirdId) &&
        s.state.players[1]!.security.length === 0,
    );
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT20-034")).toBe(false);
    expect(s.perm("host").stack.map((card) => card.cardId)).toContain("BT20-034");
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("does not trash security when another allied Digimon deletes in battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-035", as: "host", under: ["BT20-034"] },
          { card: "BT20-010", as: "otherAttacker" },
        ],
      },
      1: {
        battleArea: [{ card: "BT20-010", dp: 1000, suspended: true, as: "opponent" }],
        security: ["BT20-001", "BT20-002"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("otherAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("host"));
  });
});
