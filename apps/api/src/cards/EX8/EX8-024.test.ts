import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./EX8-024.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT19/BT19-024.js";
import "../BT19/BT19-028.js";
import "../BT19/BT19-018.js";
import "../BT1/BT1-112.js";
import "../EX5/EX5-016.js";
import "../EX5/EX5-025.js";
import "../ST2/ST2-15.js";

describe("EX8-024", () => {
  it("matches the catalog identity and every printed text field", () => {
    expect(getCardDefinition("EX8-024")).toMatchObject({
      cardId: "EX8-024",
      nameEn: "MegaSeadramon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Blue", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Aquatic", "DS"],
      effectText: expect.stringContaining("[On Play] [When Digivolving] 1 of your Digimon unsuspends."),
      inheritedEffectText:
        "[When Attacking] [Once Per Turn] By placing 1 of your other Digimon as this Digimon's bottom digivolution card, it unsuspends.",
    });
  });
  it("traces unsuspend triggers, the one-memory suspension restriction, and inherited placement cost", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Unsuspend",
        target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
      });
    }
    expect(
      compiled.effects?.find((entry) => entry.trigger === "WhenAttacking" && !entry.isInherited)?.actions[0],
    ).toMatchObject({
      kind: "Restrict",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      restriction: "suspend",
      duration: "untilOpponentTurnEnd",
      condition: { kind: "memoryAtLeast", value: 1 },
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Unsuspend",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "place",
            targetIsPermanent: true,
            target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, count: 1 },
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
        },
      ],
    });
  });
  it("unsuspends an allied Digimon on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-024", as: "source", suspended: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.perm("source").isSuspended).toBe(false);
  });
  it("restricts one opposing Digimon from suspending while you have memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-024", as: "source" }], deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"] },
      1: {
        battleArea: [{ card: "EX8-021", as: "opponent" }],
        security: 1,
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
      },
    });
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponent"), "suspend"));
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(true);

    await settle(() => !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponent").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });

    advance(s.engine).endMainPhaseIfOpen(1);
    await secondTurn;
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(false);
  });

  it("does not consume the attack effect at 0 memory, then applies it at 1 (Q3891)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-024", as: "source" }] },
      1: { battleArea: [{ card: "EX8-021", as: "opponent" }], security: 2 },
    });
    await s.ready();
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(false);

    await advance(s.engine).verb.unsuspend([s.perm("source").permanentId]);
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponent"), "suspend"));
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(true);
  });

  it("pays the inherited placement cost, moves the other Digimon under, and unsuspends the host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-030", as: "host", under: ["EX8-024"] },
            { card: "EX8-017", as: "other" },
          ],
        },
        1: { security: 1 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const otherId = s.perm("other").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === otherId));

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("host").stack[0]!.instanceId).toBe(otherId);
  });

  it("keeps the inherited effect optional when its placement cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-030", as: "host", under: ["EX8-024"] },
            { card: "EX8-017", as: "other" },
          ],
        },
        1: { security: 1 },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.perm("host").stack).toHaveLength(1);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("other").instanceId),
    ).toBe(true);
  });

  it("uses the level-4 DS route for 3 and unsuspends an ally when digivolving", async () => {
    expect(digivolutionRequirementsFor("EX8-024")).toContainEqual({
      level: 4,
      traits: ["DS"],
      cost: 3,
      isAlternate: true,
    });
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-020", as: "dolphmon" },
            { card: "EX8-017", as: "ally", suspended: true },
          ],
          hand: [{ card: "EX8-024", as: "megaSeadramon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dolphmon").permanentId,
        instanceId: s.inst("megaSeadramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("ally").isSuspended);
    expect(s.state.memory).toBe(0);
  });

  it("uses the standard Blue level-4 route for 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-037", as: "blueBase" }],
        hand: [{ card: "EX8-024", as: "megaSeadramon" }],
      },
    });
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueBase").permanentId,
        instanceId: s.inst("megaSeadramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blueBase").topCard.instanceId === s.inst("megaSeadramon").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("resets the inherited placement effect after the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-030", as: "host", under: ["EX8-024"] },
            { card: "EX8-017", as: "firstOther" },
            { card: "EX8-017", as: "secondOther" },
          ],
          deck: ["BT1-045"],
        },
        1: { security: 3, deck: ["BT1-045"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const firstOtherId = s.inst("firstOther").instanceId;
    const secondOtherId = s.inst("secondOther").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === firstOtherId));
    expect(s.perm("host").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === secondOtherId)).toBe(
      true,
    );

    s.state.phase = Phase.End;
    const nextTurn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Main && s.state.turnCount === 1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === secondOtherId));
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toContain(secondOtherId);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await nextTurn;
  });
});

// #5352 names these inherited effects but supplies no host or replay route.
// Kaiser Nail / Xiangpengmon exercise a real source play and reinsertion on the same host.
describe("GitHub #5352 inherited source OPT identity", () => {
  for (const sourceCard of ["EX8-024", "BT19-024"] as const) {
    for (const seat of [0, 1] as const) {
      it.each(["replay", "evolution", "reorder"] as const)(`${sourceCard}, seat ${seat}: %s`, async (route) => {
        const opponent = seat === 0 ? 1 : 0;
        const preferred: string[] = [];
        const declined: string[] = [];
        const s = setupEngine(
          {
            [seat]: {
              battleArea: [
                {
                  card: route === "reorder" ? "EX5-025" : "BT1-038",
                  as: "host",
                  under: [
                    { card: sourceCard, as: "source" },
                    { card: "BT19-018", as: "payload1" },
                    { card: "BT19-018", as: "payload2" },
                    { card: "BT19-018", as: "payload3" },
                    ...(route === "reorder"
                      ? [
                          { card: "EX5-016", as: "lunamon" },
                          { card: "BT1-038", as: "revealedHost" },
                        ]
                      : []),
                  ],
                },
                { card: "BT1-088", as: "green" },
                { card: "BT1-009", as: "fodder1" },
                { card: "BT1-009", as: "fodder2" },
                { card: "BT1-009", as: "fodder3" },
              ],
              hand: [
                { card: "BT1-112", as: "scissor" },
                ...(route === "replay" ? [{ card: "ST2-15", as: "nail" }] : []),
                ...(route !== "reorder" ? [{ card: "BT19-028", as: "evolution" }] : []),
              ],
              deck: Array.from({ length: 8 }, () => "BT1-009"),
              security: ["BT1-009"],
            },
            [opponent]: {
              battleArea: [
                { card: "BT1-009", as: "target1", suspended: true },
                { card: "BT1-009", as: "target2", suspended: true },
                { card: "BT1-009", as: "target3", suspended: true },
              ],
              security: ["BT1-009"],
            },
          },
          {
            autoAcceptOptional: true,
            autoSelectCards: true,
            preferInstanceIds: preferred,
            declinePrompts: declined,
          },
        );
        s.state.turnSeat = seat;
        s.state.memory = 10;
        await s.ready();
        const player = s.state.players[seat]!;
        const sourceId = s.inst("source").instanceId;
        const host = s.perm("host");
        const hostId = host.permanentId;
        const originalTopId = host.topCard.instanceId;
        const turn = s.state.turnCount;
        const activations = () =>
          s.events.filter(
            (event) => event.kind === "effectResolved" && event.sourceInstanceId === sourceId && event.isInherited,
          ).length;
        const attack = async (target: string) => {
          const targetId = s.perm(target).permanentId;
          expect(
            s.engine.applyIntent(seat, {
              type: "attack",
              attackerPermanentId: hostId,
              target: { kind: "permanent", permanentId: targetId },
            }),
          ).toEqual({ ok: true });
          await settle(
            () =>
              !observe(s.engine).isAttacking() &&
              !s.state.pendingDecision &&
              !s.state.players[opponent]!.battleArea.some((p) => p.permanentId === targetId),
          );
        };
        // An actual Option supplies repeat attacks; no direct unsuspend or usage reset.
        preferred.push(originalTopId);
        const scissorId = s.inst("scissor").instanceId;
        expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: scissorId })).toEqual({
          ok: true,
        });
        await settle(() => player.trash.some((c) => c.instanceId === scissorId) && !s.state.pendingDecision);
        preferred.splice(0, preferred.length, s.inst("fodder1").instanceId, s.inst("payload1").instanceId);
        await attack("target1");
        expect(activations()).toBe(1);
        if (sourceCard === "EX8-024") {
          expect(host.stack.some((c) => c.instanceId === s.inst("fodder1").instanceId)).toBe(true);
        } else {
          expect(player.battleArea.some((p) => p.topCard.instanceId === s.inst("payload1").instanceId)).toBe(true);
        }
        expect(host.isSuspended).toBe(false);

        if (route === "replay") {
          preferred.splice(0, preferred.length, sourceId, originalTopId);
          // Decline MarineBullmon's unrelated On Play hand placement only for this play.
          declined.push("");
          const nailId = s.inst("nail").instanceId;
          expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: nailId })).toEqual({ ok: true });
          await settle(() => player.trash.some((c) => c.instanceId === nailId) && !s.state.pendingDecision);
          declined.length = 0;
          const replay = player.battleArea.find((p) => p.topCard.instanceId === sourceId);
          expect(replay).toBeDefined();
          expect(replay?.permanentId).not.toBe(hostId);
          expect(replay?.enterFieldTurnCount).toBe(turn);
          expect(host.stack.some((c) => c.instanceId === sourceId)).toBe(false);
          expect(s.events.filter((e) => e.kind === "cardPlayed" && e.cardId === sourceCard)).toHaveLength(1);
        }
        if (route === "reorder") {
          const stackBefore = host.stack.map((c) => c.instanceId);
          const main = observe(s.engine)
            .activatableEffects(host)
            .find((effect) => effect.effectKey.startsWith("EX5-016/"));
          expect(main).toBeDefined();
          expect(
            s.engine.applyIntent(seat, {
              type: "activateEffect",
              sourceInstanceId: s.inst("lunamon").instanceId,
              effectKey: main!.effectKey,
            }),
          ).toEqual({ ok: true });
          await settle(() => host.topCard.instanceId === s.inst("revealedHost").instanceId && !s.state.pendingDecision);
          expect(host.stack.map((c) => c.instanceId)).toEqual([originalTopId, ...stackBefore.slice(0, -1)]);
        } else {
          preferred.splice(0, preferred.length, sourceId, originalTopId);
          // In the control, decline Xiangpengmon's placement: the source never leaves.
          if (route === "evolution") declined.push("");
          expect(
            s.engine.applyIntent(seat, {
              type: "digivolve",
              permanentId: hostId,
              instanceId: s.inst("evolution").instanceId,
            }),
          ).toEqual({ ok: true });
          await settle(() => host.topCard.instanceId === s.inst("evolution").instanceId && !s.state.pendingDecision);
          declined.length = 0;
        }
        expect(host.permanentId).toBe(hostId);
        expect(host.stack.filter((c) => c.instanceId === sourceId)).toHaveLength(1);
        expect(player.battleArea.some((p) => p.topCard.instanceId === sourceId)).toBe(false);
        expect(activations()).toBe(1);
        preferred.splice(0, preferred.length, s.inst("fodder2").instanceId, s.inst("payload2").instanceId);
        await attack("target2");
        expect(activations()).toBe(route === "replay" ? 2 : 1);
        if (sourceCard === "EX8-024") {
          expect(host.stack.some((c) => c.instanceId === s.inst("fodder2").instanceId)).toBe(route === "replay");
        } else {
          expect(player.battleArea.some((p) => p.topCard.instanceId === s.inst("payload2").instanceId)).toBe(
            route === "replay",
          );
        }
        // The refreshed residency still has only one use, despite another legal attack.
        preferred.splice(0, preferred.length, s.inst("fodder3").instanceId, s.inst("payload3").instanceId);
        await attack("target3");
        expect(activations()).toBe(route === "replay" ? 2 : 1);
        expect(s.state.turnSeat).toBe(seat);
        expect(s.state.turnCount).toBe(turn);
        expect(s.state.pendingDecision).toBeUndefined();
      });
    }
  }
});
