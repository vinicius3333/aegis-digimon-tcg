import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-027.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  expect(s.engine.applyIntent(seat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

async function endMainAndReach(s: ReturnType<typeof setupEngine>, seat: 0 | 1): Promise<void> {
  advance(s.engine).endMainPhaseIfOpen(seat);
  await advance(s.engine).waitForMainPhase(seat === 0 ? 1 : 0);
}

function attackPermanent(s: ReturnType<typeof setupEngine>, seat: 0 | 1, attacker: string, target: string) {
  return s.engine.applyIntent(seat, {
    type: "attack",
    attackerPermanentId: s.perm(attacker).permanentId,
    target: { kind: "permanent", permanentId: s.perm(target).permanentId },
  });
}

describe("EX7-027 Chaperomon", () => {
  it("matches the catalog, erratum, full IR, standard evolution, and exclusive registration", () => {
    expect(getCardDefinition("EX7-027")).toMatchObject({
      cardId: "EX7-027",
      nameEn: "Chaperomon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Yellow", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Puppet", "LIBERATOR"],
      effectText:
        "＜Overclock ([Puppet] trait)＞(At the end of your turn, by deleting 1 of your Tokens or other [Puppet] trait Digimon, this Digimon attacks a player without suspending).\n[When Digivolving] You may play 1 level 3 Digimon card with the [Puppet] trait from your hand without paying the cost.",
      inheritedEffectText:
        "[All Turns] [Once Per Turn] When this Digimon would leave the battle area other than by one of your effects, by deleting 1 of your Tokens or 1 of your other Digimon with the [Puppet] trait trait, prevent it from leaving.",
    });
    expect(digivolutionRequirementsFor("EX7-027")).toBeUndefined();
    expect(hasRegisteredCompiledCard("EX7-027")).toBe(true);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      {
        trigger: "Static",
        actions: [],
        keywords: [{ keyword: "Overclock", raw: "＜Overclock ([Puppet] trait)＞" }],
      },
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "PlayWithoutCost",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                levels: [3],
                nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }],
              },
              count: 1,
            },
            from: ["hand"],
            payCost: false,
            optional: true,
          },
        ],
      },
      {
        trigger: "EndOfYourTurn",
        actions: [
          {
            kind: "Attack",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            attackPlayer: true,
            withoutSuspending: true,
            cost: {
              kind: "deleteOwn",
              target: {
                filter: {
                  controller: "mine",
                  excludeSelf: true,
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }],
                  allowTokens: true,
                },
                count: 1,
              },
              raw: "by deleting 1 of your Tokens or other [Puppet] trait Digimon",
            },
          },
        ],
      },
      {
        trigger: "AllTurns",
        actions: [
          {
            kind: "Replacement",
            event: "wouldLeavePlay",
            leaveCause: "otherThanYourEffect",
            sourceFilter: { isSelfRef: true },
            actions: [
              {
                kind: "Prevent",
                cost: {
                  kind: "deleteOwn",
                  target: {
                    filter: {
                      controller: "mine",
                      excludeSelf: true,
                      kind: ["Digimon"],
                      nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }],
                      allowTokens: true,
                    },
                    count: 1,
                  },
                  raw: "by deleting 1 of your Tokens or 1 of your other Digimon with the [Puppet] trait trait",
                },
                optional: true,
                abortOnDecline: true,
              },
            ],
          },
        ],
        isInherited: true,
        frequency: "OncePerTurn",
      },
    ]);
  });

  it("legally evolves from Yellow level 4 for cost 3, draws, preserves the source stack, and plays one exact Puppet", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-025", as: "source" }],
          hand: [
            { card: "EX7-027", as: "chaperomon" },
            { card: "EX7-024", as: "puppet" },
            { card: "BT1-009", as: "nonPuppet" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012"], security: ["BT1-014", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("puppet").instanceId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    const sourceInstanceId = s.perm("source").topCard!.instanceId;
    const drawInstanceId = s.state.players[0]!.deck[0]!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("chaperomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.instanceId === s.inst("chaperomon").instanceId);
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(drawInstanceId);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-011"]);
    expect(s.perm("source").stack.map(({ instanceId }) => instanceId)).toEqual([sourceInstanceId]);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("puppet").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("nonPuppet").instanceId);
    expect(s.state.memory).toBe(7);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
    await stopLoop(s, loop, 0);
  });

  it("publicly declines the optional When Digivolving play and still pays, draws, and stacks the evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-025", as: "source" }],
          hand: [
            { card: "EX7-027", as: "chaperomon" },
            { card: "EX7-024", as: "puppet" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012"], security: ["BT1-014", "BT1-014"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    const sourceInstanceId = s.perm("source").topCard!.instanceId;
    const drawInstanceId = s.state.players[0]!.deck[0]!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("chaperomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.instanceId === s.inst("chaperomon").instanceId);
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(drawInstanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("puppet").instanceId);
    expect(
      s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.instanceId === s.inst("puppet").instanceId),
    ).toHaveLength(0);
    expect(s.perm("source").stack.map(({ instanceId }) => instanceId)).toEqual([sourceInstanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
    await stopLoop(s, loop, 0);
  });

  it("executes errata-mandated Overclock at the real end of turn by deleting another Puppet and attacking without suspending", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-027", as: "chap" },
            { card: "EX7-024", as: "fodder" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-011", "BT1-012"], security: ["BT1-014", "BT1-014"] },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const chapId = s.perm("chap").permanentId;
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("fodder").instanceId) &&
        s.events.some((event) => event.kind === "attackDeclared" && event.attackerPermanentId === chapId),
    );
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("fodder").instanceId),
    ).toBe(false);
    expect(s.perm("chap").isSuspended).toBe(false);
    expect(s.events.some((event) => event.kind === "attackDeclared" && event.attackerPermanentId === chapId)).toBe(
      true,
    );
    await advance(s.engine).waitForMainPhase(1);
    await stopLoop(s, loop, 1);
  });

  it("prevents one battle departure, refuses the same-turn second use, and deletes the host on that second attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-024", as: "host", under: ["EX7-027"], suspended: true },
            { card: "EX7-024", as: "fodder" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-014", as: "attackerOne" },
            { card: "BT1-014", as: "attackerTwo" },
          ],
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-013", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    expect(attackPermanent(s, 1, "attackerOne", "host")).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("host").permanentId) &&
        !s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("fodder").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("host").permanentId)).toBe(
      true,
    );
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("fodder").instanceId),
    ).toBe(false);
    expect(attackPermanent(s, 1, "attackerTwo", "host")).toEqual({ ok: true });
    await settle(
      () => !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("host").permanentId),
    );
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("host").permanentId)).toBe(
      false,
    );
    await stopLoop(s, loop, 1);
  });

  it("retained red: resets the inherited prevention budget on the next real turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-024", as: "host", under: ["EX7-027"], suspended: true },
            { card: "EX7-024", as: "firstFodder" },
            { card: "EX7-024", as: "secondFodder" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "attacker" }],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-090", "BT1-091", "BT1-092"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    expect(attackPermanent(s, 1, "attacker", "host")).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("host").permanentId) &&
        !s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("firstFodder").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("host").permanentId)).toBe(
      true,
    );
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("secondFodder").instanceId),
    ).toBe(true);

    await endMainAndReach(s, 1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("host").isSuspended).toBe(true);
    await endMainAndReach(s, 0);
    expect(s.perm("attacker").isSuspended).toBe(false);
    expect(attackPermanent(s, 1, "attacker", "host")).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("host").permanentId) &&
        !s.state.players[0]!.battleArea.some(
          ({ topCard }) => topCard?.instanceId === s.inst("secondFodder").instanceId,
        ),
    );
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("host").permanentId)).toBe(
      true,
    );
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("secondFodder").instanceId),
    ).toBe(false);
    await stopLoop(s, loop, 1);
  });

  it("rejects an illegal non-Yellow level-4 evolution source without paying, drawing, or changing the stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "wrongSource" }],
        hand: [{ card: "EX7-027", as: "chaperomon" }],
        deck: ["BT1-009"],
      },
      1: { deck: ["BT1-010"], security: ["BT1-011"] },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    const handBefore = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    const deckBefore = s.state.players[0]!.deck.map(({ instanceId }) => instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongSource").permanentId,
        instanceId: s.inst("chaperomon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(handBefore);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(deckBefore);
    expect(s.perm("wrongSource").topCard?.cardId).toBe("BT1-014");
    expect(s.perm("wrongSource").stack).toHaveLength(0);
    assertNoLoudGap(s);
    await stopLoop(s, loop, 0);
  });
});
