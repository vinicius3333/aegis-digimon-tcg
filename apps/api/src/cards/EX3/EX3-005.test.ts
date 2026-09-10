import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX3-005.js";
import "./EX3-011.js";
import "./EX3-065.js";

describe("EX3-005 Vorvomon", () => {
  it("matches its official identity and complete effect text", () => {
    expect(getCardDefinition("EX3-005")).toMatchObject({
      cardId: "EX3-005",
      nameEn: "Vorvomon",
      colors: ["Red"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Red", level: 2, memoryCost: 0 },
        { color: "Black", level: 2, memoryCost: 0 },
      ],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Rock Dragon"],
      effectText:
        "[Your Turn][Once Per Turn] When you play a [Hina Kurihara], delete 1 of your opponent's Digimon with 3000 DP or less.",
      inheritedEffectText:
        "[When Attacking] If this Digimon has an [On Play] effect, delete 1 of your opponent's Digimon with 3000 DP or less.",
    });
  });

  it("publishes both clauses as full compiled IR", () => {
    expect(getCompiledCard("EX3-005")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "YourTurn",
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenPlayed",
              sourceFilter: {
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["Hina Kurihara"], match: "name" }],
              },
              actions: [
                {
                  kind: "Delete",
                  target: {
                    filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } },
                    count: 1,
                  },
                },
              ],
            },
          ],
        },
        {
          trigger: "WhenAttacking",
          isInherited: true,
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } },
                count: 1,
              },
              condition: { kind: "selfHasOnPlayEffect" },
            },
          ],
        },
      ],
    });
  });
  it("deletes exactly a 3000-DP target once per turn for Hina, then resets on the next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-005", as: "vorvomon" }],
          hand: [
            { card: "EX3-065", as: "hina1" },
            { card: "EX3-065", as: "hina2" },
            { card: "EX3-065", as: "hina3" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target1", dp: 3000 },
            { card: "BT1-009", as: "target2", dp: 3000 },
            { card: "BT1-009", as: "target3", dp: 3001 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const target1Id = s.perm("target1").permanentId;
    const target2Id = s.perm("target2").permanentId;
    const target3Id = s.perm("target3").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hina1").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hina2").instanceId })).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "EX3-065").length === 2,
    );
    await settle(() => s.state.players[1]!.battleArea.length === 2);

    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.map(({ currentDP }) => currentDP)).toEqual(
      expect.arrayContaining([3000, 3001]),
    );
    expect(
      s.decisions.find(({ req }) => req.sourceCardId === "EX3-005" && req.kind === "chooseTargets")?.req,
    ).toMatchObject({
      options: {
        candidateInstanceIds: expect.arrayContaining([target1Id, target2Id]),
      },
    });
    expect(
      s.decisions.find(({ req }) => req.sourceCardId === "EX3-005" && req.kind === "chooseTargets")?.req.options
        ?.candidateInstanceIds,
    ).not.toContain(target3Id);

    const deletionChoice = s.decisions.find(
      ({ req }) => req.sourceCardId === "EX3-005" && req.kind === "chooseTargets",
    )?.req;
    expect(deletionChoice).toMatchObject({
      sourceCardId: "EX3-005",
      options: { timing: "YourTurn", min: 1, max: 1 },
    });
    expect(deletionChoice?.options?.effectText).toContain("3000 DP or less");

    await advance(s.engine).runTurn(0);
    await advance(s.engine).verb.playInstances([s.inst("hina3").instanceId], "EX3-005");
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.currentDP).toBe(3001);
  });

  it("consumes its once-per-turn trigger even when no 3000-DP-or-less target exists", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-005", as: "vorvomon" }],
        hand: ["EX3-065", "EX3-065"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "tooLarge", dp: 3001 }] },
    });
    s.state.memory = 10;
    await s.ready();

    for (const instance of [...s.state.players[0]!.hand]) {
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: instance.instanceId })).toEqual({ ok: true });
      await settle(() =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === instance.instanceId),
      );
    }

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("tooLarge").permanentId,
    ]);
    expect(s.decisions.some(({ req }) => req.sourceCardId === "EX3-005" && req.kind === "chooseTargets")).toBe(false);
  });

  it("does not trigger for Hina played by the opponent or outside its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-005", as: "vorvomon" }] },
      1: {
        hand: [{ card: "EX3-065", as: "hina" }],
        battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("hina").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-065"));
    await settle(() => s.events.some((event) => event.kind === "cardPlayed" && event.cardId === "EX3-065"));

    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("target").permanentId)).toBe(
      true,
    );
    expect(s.decisions.some(({ req }) => req.sourceCardId === "EX3-005")).toBe(false);
  });

  it("its inherited attack deletion requires the carrier to have an On Play effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX3-011", under: ["EX3-005", "EX3-006"], as: "attacker" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }], security: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not use the inherited deletion on a carrier without an On Play effect or against 3001 DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-038", under: ["EX3-005"], as: "attacker" }] },
      1: {
        battleArea: [{ card: "BT1-009", as: "tooLarge", dp: 3001 }],
        security: ["BT1-009"],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.decisions.some(({ req }) => req.sourceCardId === "EX3-005")).toBe(false);
  });

  it("keeps the inherited deletion boundary at 3000 DP when the carrier has an On Play effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-011", under: ["EX3-005", "EX3-006"], as: "attacker" }] },
      1: { battleArea: [{ card: "BT1-009", as: "tooLarge", dp: 3001 }], security: ["BT1-009"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("tooLarge").permanentId);
    expect(s.decisions.some(({ req }) => req.sourceCardId === "EX3-005")).toBe(false);
  });

  it("its inherited attack effect is not once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX3-011", under: ["EX3-005", "EX3-006"], as: "attacker", dp: 20_000 }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "delete1", dp: 3000 },
            { card: "BT1-009", as: "delete2", dp: 3000 },
            { card: "BT1-012", as: "battle1", suspended: true },
            { card: "BT1-013", as: "battle2", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    for (const battle of ["battle1", "battle2"]) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: s.perm(battle).permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    }

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
