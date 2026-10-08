import { EffectTiming, Zone } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-076.js";
import "../EX9/EX9-070.js";
import "./BT22-038.js";
import "./BT22-060.js";

describe("BT22-076 ShinMonzaemon", () => {
  it("keeps the ordinary purple/yellow routes and DM alternate route", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, colors: ["Purple"], cost: 5, isAlternate: false },
      { level: 5, colors: ["Yellow"], cost: 5, isAlternate: false },
      { level: 5, traits: ["DM"], cost: 5, isAlternate: true },
    ]);
  });
  it("reduces only Ver.1 digivolutions into ShinMonzaemon", () => {
    const modifier = compiled.effects.find((entry) => entry.trigger === "Static")?.actions[0];
    expect(modifier).toMatchObject({
      kind: "CostModifier",
      costType: "digivolve",
      mode: "delta",
      amount: -2,
      handResident: true,
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Ver.1"], match: "trait" }],
      },
      into: { cardId: "BT22-076" },
      duration: "permanent",
    });
    expect(compiled.digivolutionRequirement).toContainEqual({ level: 5, traits: ["DM"], cost: 5, isAlternate: true });
  });

  it("places either player's qualifying Digimon into security after trashing the bottom face-down card", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "SecurityManipulation",
        ownerSecurity: true,
        source: {
          filter: { controllerDefault: "any", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
          count: 1,
        },
        cost: {
          kind: "trash",
          target: { filter: { isSelfRef: true, faceDown: true, position: "bottom" }, isSelf: true },
        },
      });
    }
  });

  it("stacks the Ver.1 self-reduction with the printed public evolution cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT22-038", as: "monzaemon" }], hand: [{ card: "BT22-076", as: "shin" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("monzaemon").permanentId,
        instanceId: s.inst("shin").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("monzaemon").topCard?.cardId === "BT22-076");
    expect(s.state.memory).toBe(7);
  });

  it("does not multiply the incoming card's intrinsic reduction for extra copies in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT22-038", as: "monzaemon" }],
        hand: [
          { card: "BT22-076", as: "shin" },
          { card: "BT22-076", as: "spare" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("monzaemon").permanentId,
        instanceId: s.inst("shin").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("monzaemon").topCard?.cardId === "BT22-076");
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("spare").instanceId)).toBe(true);
  });

  it("keeps the intrinsic reduction owner-scoped when both players hold copies", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT22-038", as: "monzaemon" }], hand: [{ card: "BT22-076", as: "own" }] },
      1: { hand: [{ card: "BT22-076", as: "opponent" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("monzaemon").permanentId,
        instanceId: s.inst("own").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("monzaemon").topCard?.cardId === "BT22-076");
    expect(s.state.memory).toBe(7);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("opponent").instanceId)).toBe(true);

    const reverse = setupEngine({
      0: { hand: [{ card: "BT22-076", as: "opponent" }] },
      1: { battleArea: [{ card: "BT22-038", as: "monzaemon" }], hand: [{ card: "BT22-076", as: "own" }] },
    });
    reverse.state.turnSeat = 1;
    reverse.state.memory = 10;
    await reverse.ready();
    expect(
      reverse.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: reverse.perm("monzaemon").permanentId,
        instanceId: reverse.inst("own").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => reverse.perm("monzaemon").topCard?.cardId === "BT22-076");
    expect(reverse.state.memory).toBe(7);
    expect(reverse.state.players[0]!.hand.some((card) => card.instanceId === reverse.inst("opponent").instanceId)).toBe(
      true,
    );
  });

  it("places a qualifying opponent Digimon into security on a public digivolution", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-038", as: "base", under: [{ card: "BT22-037", faceUp: false }] }],
          hand: [{ card: "BT22-076", as: "shin" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("target").topCard!.instanceId);
    const bottomSourceId = s.perm("base").stack[0]!.instanceId;
    const targetId = s.perm("target").topCard!.instanceId;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shin").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.some((card) => card.instanceId === targetId));

    expect(s.state.players[1]!.security[0]?.instanceId).toBe(targetId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === bottomSourceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("places a qualifying Digimon into security from the public attack trigger", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-076", as: "shin", under: [{ card: "BT22-037", faceUp: false }] }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "target", suspended: true }],
          deck: ["BT1-013", "BT1-014", "BT1-015", "BT1-016", "BT1-017", "BT1-018"],
          security: ["BT1-013", "BT1-014", "BT1-015", "BT1-016"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    await s.ready();
    const targetId = s.perm("target").topCard!.instanceId;
    preferInstanceIds.push(targetId);
    const bottomSourceId = s.perm("shin").stack[0]!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("shin").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.some((card) => card.instanceId === targetId));

    expect(s.state.players[1]!.security[0]?.instanceId).toBe(targetId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === bottomSourceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("shares the Once Per Turn use between digivolving and attacking, then resets next turn", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT22-038",
              as: "host",
              under: [
                { card: "BT22-037", faceUp: false },
                { card: "BT22-037", faceUp: false },
              ],
            },
          ],
          hand: [{ card: "BT22-076", as: "shin" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "firstTarget" },
            { card: "BT1-013", as: "secondTarget", suspended: true },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      preferInstanceIds.push(s.perm("firstTarget").topCard!.instanceId);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("host").permanentId,
          instanceId: s.inst("shin").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("host").topCard?.cardId === "BT22-076");
      expect(s.perm("host").stack.filter((card) => card.cardId === "BT22-037")).toHaveLength(1);

      await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("host").isSuspended);
      expect(s.perm("host").stack.filter((card) => card.cardId === "BT22-037")).toHaveLength(1);
      expect(s.state.players[1]!.battleArea).toHaveLength(1);

      advance(s.engine).endMainPhaseIfOpen(0);
      await advance(s.engine).waitForMainPhase(1);
      advance(s.engine).endMainPhaseIfOpen(1);
      await advance(s.engine).waitForMainPhase(0);
      preferInstanceIds.push(s.perm("secondTarget").topCard!.instanceId);
      const secondTargetId = s.perm("secondTarget").topCard!.instanceId;
      await advance(s.engine).verb.suspend([s.perm("secondTarget").permanentId]);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "permanent", permanentId: s.perm("secondTarget").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("host").stack.filter((card) => card.cardId === "BT22-037").length === 0);
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(s.state.players[1]!.security.some((card) => card.instanceId === secondTargetId)).toBe(true);
      expect(s.state.pendingDecision).toBeUndefined();
      expect(observe(s.engine).isAttacking()).toBe(false);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("settles an attack-trigger refusal without trashing a source or moving a target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-076", as: "shin", under: [{ card: "BT22-037", faceUp: false }] }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "target" }],
          deck: ["BT1-013", "BT1-014", "BT1-015", "BT1-016"],
          security: ["BT1-013", "BT1-014", "BT1-015", "BT1-016"],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();
    const targetId = s.perm("target").topCard!.instanceId;
    const sourceId = s.perm("shin").stack[0]!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("shin").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const prompt = s.state.pendingDecision;
    expect(prompt).toBeDefined();
    expect(
      s.engine.applyIntent(prompt!.seat, {
        type: "respondDecision",
        decisionId: prompt!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("shin").stack.some((card) => card.instanceId === sourceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === targetId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });
  it("preserves the turn use on refusal and allows a later attack activation", async () => {
    const preferInstanceIds: string[] = [];
    const options = { autoDeclineOptional: true, autoAcceptOptional: false, autoSelectCards: true, preferInstanceIds };
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT22-076",
              as: "host",
              under: [
                { card: "BT22-037", faceUp: false },
                { card: "BT22-037", faceUp: false },
              ],
            },
          ],
          hand: [],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      options,
    );
    await s.ready();
    preferInstanceIds.push(s.perm("victim").topCard!.instanceId);
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("host"));
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "BT22-076")).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(0);
    options.autoDeclineOptional = false;
    options.autoAcceptOptional = true;
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "BT22-076")).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(1);
    const decisions = s.decisions.length;
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.decisions).toHaveLength(decisions);
  });
});

describe("BT22-076 ShinMonzaemon — KB Q&A rulings", () => {
  it("stacks its Ver.1 reduction of 2 on top of Meat's <Delay> reduction of 2 (Q4939)", async () => {
    // BT22-060 Datamon is a [DM] host without [Ver.1]: only Meat's reduction applies (5 - 2 = 3 paid).
    for (const { host, expectedMemory } of [
      { host: "BT22-038", expectedMemory: 4 },
      { host: "BT22-060", expectedMemory: 2 },
    ]) {
      const options = {
        autoDeclineOptional: false,
        autoSelectCards: true,
        autoChooseOption: true,
        preferInstanceIds: [] as string[],
      };
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "EX9-070", as: "meat", placedByEffect: true },
              { card: host, as: "host" },
            ],
            hand: [
              { card: "BT1-009", as: "cost" },
              { card: "BT22-076", as: "shin" },
            ],
            deck: ["BT1-048"],
          },
        },
        options,
      );
      options.preferInstanceIds.push(s.inst("cost").instanceId);
      s.state.memory = 5;
      await s.ready();
      const delay = observe(s.engine).activatableEffects(s.perm("meat"))[0];
      expect(delay).toBeDefined();

      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: s.perm("meat").topCard.instanceId,
          effectKey: delay!.effectKey,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const choice = s.state.pendingDecision!;

      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: choice.decisionId,
          response: { kind: "optional", accept: true },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      options.autoDeclineOptional = true;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "optional", accept: true },
        }),
      ).toEqual({ ok: true });

      await settle();

      expect(s.perm("host").topCard.cardId).toBe("BT22-076");
      expect(s.perm("host").stack[0]).toMatchObject({ cardId: "BT1-009", faceUp: false });
      expect(s.state.memory).toBe(expectedMemory);
    }
  });

  it("may place either your own or an opponent's Digimon as the top security card (Q4940)", async () => {
    for (const side of ["own", "opponent"] as const) {
      const preferInstanceIds: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT22-038", as: "base", under: [{ card: "BT22-037", faceUp: false }] },
              { card: "BT1-009", as: "own" },
            ],
            hand: [{ card: "BT22-076", as: "shin" }],
            deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
            security: ["BT1-010", "BT1-011"],
          },
          1: {
            battleArea: [{ card: "BT1-013", as: "opponent" }],
            deck: ["BT1-013", "BT1-014", "BT1-015", "BT1-016"],
            security: ["BT1-014", "BT1-015"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
      );
      s.state.memory = 8;
      await s.ready();
      const ownId = s.perm("own").topCard.instanceId;
      const opponentId = s.perm("opponent").topCard.instanceId;
      const ownPermanentId = s.perm("own").permanentId;
      const opponentPermanentId = s.perm("opponent").permanentId;
      const chosenId = side === "own" ? ownId : opponentId;
      preferInstanceIds.push(chosenId);

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("shin").instanceId,
        }),
      ).toEqual({ ok: true });
      const destination = side === "own" ? 0 : 1;
      await settle(() => s.state.players[destination]!.security.some((card) => card.instanceId === chosenId));

      const placementChoice = s.decisions.find(
        ({ req }) =>
          req.sourceCardId === "BT22-076" &&
          req.options?.candidateInstanceIds?.some((id) => id === ownPermanentId || id === opponentPermanentId),
      );
      expect(placementChoice?.req.options?.candidateInstanceIds).toEqual(
        expect.arrayContaining([ownPermanentId, opponentPermanentId]),
      );
      expect(s.state.players[destination]!.security[0]?.instanceId).toBe(chosenId);
      expect(s.state.players[destination]!.security).toHaveLength(3);
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === ownId)).toBe(
        side === "opponent",
      );
      expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === opponentId)).toBe(
        side === "own",
      );
    }
  });
});

describe("Discord 1557652222744199228 ShinMonzaemon security ownership", () => {
  for (const actor of [0, 1] as const) {
    for (const targetOwner of [0, 1] as const) {
      it(`digivolution by seat ${actor} places seat ${targetOwner}'s equal-DP target at its owner's top security`, async () => {
        const preferInstanceIds: string[] = [];
        const s = setupEngine(
          {
            0: { security: ["BT1-009"] },
            1: { security: ["BT1-010"] },
          },
          { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
        );
        s.putOnBoard(actor, {
          card: "BT22-038",
          as: "base",
          under: [{ card: "EX9-013", as: "payment", faceUp: false }],
        });
        s.putOnBoard(targetOwner, {
          card: "BT1-013",
          as: "target",
          dp: 13000,
          under: [{ card: "BT1-009", as: "attachment" }],
        });
        s.give(actor, Zone.Hand, { card: "BT22-076", as: "shin" });
        s.state.turnSeat = actor;
        s.state.memory = 8;
        await s.ready();
        preferInstanceIds.push(s.inst("target").instanceId);
        const targetId = s.inst("target").instanceId;
        const other = targetOwner === 0 ? 1 : 0;
        const otherSecurity = s.state.players[other]!.security.map((card) => card.instanceId);
        expect(
          s.engine.applyIntent(actor, {
            type: "digivolve",
            permanentId: s.perm("base").permanentId,
            instanceId: s.inst("shin").instanceId,
          }),
        ).toEqual({ ok: true });
        await settle(() =>
          s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT22-076"),
        );
        expect(s.state.players[targetOwner]!.security[0]?.instanceId).toBe(targetId);
        expect(s.state.players[targetOwner]!.security[0]?.faceUp).toBe(false);
        expect(s.state.players[other]!.security.map((card) => card.instanceId)).toEqual(otherSecurity);
        expect(
          s.state.players[targetOwner]!.trash.some((card) => card.instanceId === s.inst("attachment").instanceId),
        ).toBe(true);
        expect(s.state.players[actor]!.trash.some((card) => card.instanceId === s.inst("payment").instanceId)).toBe(
          true,
        );
        expect(s.state.memory).toBe(5);
        expect(s.state.pendingDecision).toBeUndefined();
      });
    }
  }
});

describe("Discord 1557652222744199228 ShinMonzaemon controls", () => {
  for (const control of ["noSource", "decline", "dpAbove"] as const) {
    it(`${control} respects payment and the current DP ceiling`, async () => {
      const preferInstanceIds: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: "BT22-038",
                as: "base",
                under: control === "noSource" ? [] : [{ card: "EX9-013", as: "payment", faceUp: false }],
              },
            ],
            hand: [{ card: "BT22-076", as: "shin" }],
          },
          1: { battleArea: [{ card: "BT1-013", as: "target", dp: control === "dpAbove" ? 14000 : 13000 }] },
        },
        {
          autoAcceptOptional: control !== "decline",
          autoDeclineOptional: control === "decline",
          autoSelectCards: true,
          preferInstanceIds,
        },
      );
      const targetId = s.inst("target").instanceId;
      const targetPermanentId = s.perm("target").permanentId;
      preferInstanceIds.push(targetId);
      s.state.memory = 8;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("shin").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle();
      expect(s.state.pendingDecision).toBeUndefined();
      expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === targetId)).toBe(true);
      expect(s.state.players[1]!.security).toHaveLength(0);
      expect(s.state.memory).toBe(5);
      expect(s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "overflow")).toHaveLength(0);
      const faceDownSources = [...s.state.players[0]!.battleArea].flatMap((permanent) =>
        [...permanent.stack].filter((card) => !card.faceUp),
      );
      expect(faceDownSources).toHaveLength(control === "decline" ? 1 : 0);
      expect(s.state.players[0]!.security[0]?.cardId).toBe(control === "dpAbove" ? "BT22-076" : undefined);
      expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(targetPermanentId);
    });
  }

  for (const owner of [0, 1] as const) {
    it(`placing seat ${owner}'s face-up ACE charges only that owner while its face-down ACE attachment stays suppressed`, async () => {
      const preferInstanceIds: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT22-038", as: "base", under: [{ card: "EX9-013", as: "payment", faceUp: false }] }],
            hand: [{ card: "BT22-076", as: "shin" }],
          },
          1: {},
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
      );
      s.putOnBoard(owner, {
        card: "BT14-014",
        as: "target",
        under: [{ card: "EX9-013", as: "attachment", faceUp: false }],
      });
      s.state.memory = 8;
      await s.ready();
      const targetId = s.inst("target").instanceId;
      preferInstanceIds.push(targetId);
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("shin").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(
        () => s.state.players[owner]!.security[0]?.instanceId === targetId && s.state.pendingDecision === undefined,
      );
      expect(s.state.memory).toBe(owner === 0 ? 2 : 8);
      expect(s.state.players[owner]!.trash.some((card) => card.instanceId === s.inst("attachment").instanceId)).toBe(
        true,
      );
      expect(s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "overflow")).toHaveLength(1);
    });
  }
});
