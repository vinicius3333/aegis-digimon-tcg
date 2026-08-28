import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-055.js";
import "../index.js";

describe("BT26-055 Giromon", () => {
  it("shares the Once Per Turn body across play, digivolution, and Counter and inherits security trash", () => {
    expect(digivolutionRequirementsFor("BT26-055")).toContainEqual({
      level: 4,
      traits: ["DM"],
      cost: 3,
      isAlternate: true,
    });
    expect(compiled.effects?.slice(1, 4).map((effect) => effect.sharedUseKey)).toEqual([
      "bt26-055-place-delete",
      "bt26-055-place-delete",
      "bt26-055-place-delete",
    ]);
    expect(compiled.effects?.[0]?.keywords).toContainEqual(expect.objectContaining({ keyword: "Fragment", amount: 2 }));
    expect(compiled.effects?.[1]?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "SelectBind", optional: true, abortOnDecline: true }),
        expect.objectContaining({ kind: "Delete", target: { filter: { boundRef: "ownVer3ToDelete" }, count: 1 } }),
        expect.objectContaining({
          kind: "Delete",
          target: { filter: expect.objectContaining({ superlative: "lowestPlayCost" }), count: "all" },
        }),
      ]),
    );
    expect(compiled.effects?.[4]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        { kind: "SubTrigger", event: "whenLeavesPlay", actions: [{ kind: "SecurityManipulation", op: "trashTop" }] },
      ],
    });
  });

  it("publicly trashes the opponent's top security when the inherited source leaves play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "BT26-055", as: "giromon" }] }] },
      1: { security: [{ card: "BT1-001", as: "security" }] },
    });
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("requires choosing an own Ver.3 Digimon before deleting all opposing lowest-play-cost Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-055", as: "giromon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowA" },
            { card: "BT1-009", as: "lowB" },
            { card: "BT1-082", as: "higher" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("giromon"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual([]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-082"]);
  });

  it("doesn't delete opposing Digimon when the combined deletion is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-055", as: "giromon" }] },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("giromon"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT26-055");
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT1-010");
  });

  it("may decline the hand placement and still accept the separate combined deletion", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-055", as: "source" },
            { card: "BT26-055", as: "sacrifice" },
          ],
          hand: [{ card: "BT1-001", as: "keptInHand" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("sacrifice").permanentId);
    const sacrificeId = s.perm("sacrifice").permanentId;
    await s.ready();

    const resolving = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const placementDecision = s.state.pendingDecision!.decisionId;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: placementDecision,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.pendingDecision?.kind === "optional" && s.state.pendingDecision.decisionId !== placementDecision,
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await resolving;

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("keptInHand").instanceId);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(sacrificeId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("places an accepted hand card face down at the bottom independently of deletion", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-055", as: "giromon" }],
        hand: [{ card: "BT1-001", as: "material" }],
      },
    });
    await s.ready();

    const resolving = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("giromon"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const placementDecision = s.state.pendingDecision!.decisionId;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: placementDecision,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.pendingDecision?.kind === "optional" && s.state.pendingDecision.decisionId !== placementDecision,
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await resolving;

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.perm("giromon").stack).toHaveLength(1);
    expect(s.perm("giromon").stack[0]).toMatchObject({
      instanceId: s.inst("material").instanceId,
      faceUp: false,
    });
  });

  it("shares Once Per Turn between On Play and When Digivolving", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-055", as: "source" },
            { card: "BT26-055", as: "sacrifice" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstOpponent" },
            { card: "BT1-082", as: "higherOpponent" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("sacrifice").permanentId);
    const higherOpponentId = s.perm("higherOpponent").permanentId;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(higherOpponentId);
  });

  it("uses Fragment 2 to survive battle by trashing exactly 2 digivolution cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-082", as: "attacker", dp: 12000 }] },
        1: {
          battleArea: [
            {
              card: "BT26-055",
              as: "giromon",
              dp: 7000,
              suspended: true,
              under: [
                { card: "BT1-009", as: "fragmentOne" },
                { card: "BT1-010", as: "fragmentTwo" },
              ],
            },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(s.perm("giromon").stack).toHaveLength(2);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("giromon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "respondCounter" })).toEqual({ ok: true });
    await settle(() => s.perm("giromon").stack.length === 0);
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.perm("giromon").stack).toHaveLength(0);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("giromon").permanentId,
    );
    expect(s.events.filter((event) => event.kind === "cardsMoved")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          instanceIds: expect.arrayContaining([s.inst("fragmentOne").instanceId, s.inst("fragmentTwo").instanceId]),
          to: "trash",
        }),
      ]),
    );
    const trashedIds = [...s.state.players[0]!.trash, ...s.state.players[1]!.trash].map(({ instanceId }) => instanceId);
    expect(trashedIds).toEqual(
      expect.arrayContaining([s.inst("fragmentOne").instanceId, s.inst("fragmentTwo").instanceId]),
    );
  });

  it("Q7058: activates as the attack's only Counter and rejects a second Counter response", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 1000 }] },
        1: { battleArea: [{ card: "BT26-055", as: "counterCard" }], security: ["BT1-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counterWindowOpened not found");
    const eligible = opened.eligibleCounters.find(
      ({ instanceId }) => instanceId === s.perm("counterCard").topCard.instanceId,
    );
    expect(eligible).toBeDefined();

    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectActivated"));
    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }).ok,
    ).toBe(false);
  });
});
