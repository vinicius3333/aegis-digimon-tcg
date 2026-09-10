import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
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
      0: { battleArea: [{ card: "EX9-073", as: "host", under: [{ card: "BT26-055", as: "giromon" }] }] },
      1: { security: [{ card: "BT1-009", as: "security" }] },
    });
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("requires choosing an own Ver.3 Digimon before deleting all opposing lowest-play-cost Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT26-055", as: "giromon" }] },
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
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("giromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual([]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-082"]);
  });

  it("uses the exact off-color Lv.4 [DM] cost-3 evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-009", as: "redDm" }],
          hand: [{ card: "BT26-055", as: "giromon" }],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redDm").permanentId,
        instanceId: s.inst("giromon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("redDm").topCard.cardId === "BT26-055");
    expect(s.state.memory).toBe(0);
  });

  it("doesn't delete opposing Digimon when the combined deletion is declined", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT26-055", as: "giromon" }] },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("giromon").instanceId })).toEqual({
      ok: true,
    });

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT26-055");
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT1-010");
  });

  it("keeps hand placement and deletion as separate actions", () => {
    expect(compiled.effects?.[1]?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "PlaceUnder", optional: true, faceDown: true, position: "bottom" }),
        expect.objectContaining({ kind: "SelectBind", optional: true, abortOnDecline: true }),
        expect.objectContaining({ kind: "Delete" }),
      ]),
    );
  });

  it("places an accepted hand card face down at the bottom independently of deletion", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT26-055", as: "giromon" },
          { card: "BT1-009", as: "material" },
        ],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("giromon").instanceId })).toEqual({
      ok: true,
    });
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
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.perm("giromon").stack).toHaveLength(1);
    expect(s.perm("giromon").stack[0]).toMatchObject({
      instanceId: s.inst("material").instanceId,
      faceUp: false,
    });
  });

  it("shares Once Per Turn between On Play, When Digivolving, and Counter", () => {
    expect(compiled.effects?.slice(1, 4).every((effect) => effect.frequency === "OncePerTurn")).toBe(true);
    expect(new Set(compiled.effects?.slice(1, 4).map((effect) => effect.sharedUseKey))).toEqual(
      new Set(["bt26-055-place-delete"]),
    );
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
        1: { battleArea: [{ card: "BT26-055", as: "counterCard" }], security: ["BT1-009"] },
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
