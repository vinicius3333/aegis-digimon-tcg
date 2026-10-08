import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./BT26-080.js";
import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT26-080 compiled behavior", () => {
  it.each(["BT25-055", "BT26-074", "BT1-077", "BT2-063", "BT25-077"])(
    "#5301 offers Arts after Option resolution onto legal base %s, paying only the Option's 5",
    async (baseCard) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: baseCard, as: "base", suspended: true },
              { card: "BT25-086", as: "ts" },
            ],
            hand: [{ card: "BT26-080", as: "option" }],
            deck: ["BT1-009"],
          },
          1: { battleArea: [{ card: "BT1-009", as: "deleted" }] },
        },
        { autoDeclineOptional: true },
      );
      s.state.memory = 5;
      await s.ready();
      const optionId = s.inst("option").instanceId;
      const baseId = s.perm("base").topCard.instanceId;

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId, useAs: "option" })).toEqual({
        ok: true,
      });
      await settle(() => s.state.pendingDecision?.promptText.includes("Arts Digivolve") === true);
      const arts = s.state.pendingDecision!;
      expect(arts.kind).toBe("selectCards");
      const request = s.decisions.find(({ req }) => req.decisionId === arts.decisionId)!.req;
      expect(request).toMatchObject({
        kind: "selectCards",
        sourceCardId: "BT26-080",
        sourceInstanceId: optionId,
        options: { candidateInstanceIds: [baseId], min: 0, max: 1 },
      });
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-009");
      expect(s.state.memory).toBe(0);
      expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === optionId)).toBe(false);

      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: arts.decisionId,
          response: { kind: "selectCards", instanceIds: [baseId] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.instanceId === optionId && s.state.pendingDecision === undefined);
      expect(s.perm("base").stack.some(({ instanceId }) => instanceId === baseId)).toBe(true);
      expect(s.perm("base").isSuspended).toBe(true);
      expect(s.state.memory).toBe(0);
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
      expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === optionId)).toBe(false);
    },
  );

  it("#5301 lets the player decline an offered Arts choice and then trashes the used Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-055", as: "base" }],
          hand: [{ card: "BT26-080", as: "option" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.promptText.includes("Arts Digivolve") === true);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT26-080") && s.state.pendingDecision === undefined,
    );
    expect(s.decisions.filter(({ req }) => req.promptText.includes("Arts Digivolve"))).toHaveLength(1);
    expect(s.perm("base").topCard.cardId).toBe("BT25-055");
    expect(s.state.memory).toBe(0);
  });

  it("#5301 preserves the Option color gate even with a legal green Lv.5 Arts base", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-077", as: "base" }], hand: [{ card: "BT26-080", as: "option" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" }),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT26-080"]);
    expect(s.decisions).toHaveLength(0);
  });

  it("#5301 offers Arts before turn handoff even when Option payment crosses zero", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-055", as: "base" }],
          hand: [{ card: "BT26-080", as: "option" }],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.promptText.includes("Arts Digivolve") === true);
    expect(s.state.memory).toBe(-2);
    expect(s.state.pendingDecision!.seat).toBe(0);
    expect(s.state.turnSeat).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [s.perm("base").topCard.instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT26-080" && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(-2);
  });

  it("#5301 uses and trashes the Option with only a TS Tamer and no Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-086", as: "ts" }], hand: [{ card: "BT26-080", as: "option" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT26-080") && s.state.pendingDecision === undefined,
    );
    expect(s.decisions.some(({ req }) => req.promptText.includes("Arts Digivolve"))).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it.each(["BT1-020", "BT2-071", "BT26-080"])(
    "#5301 does not offer Arts when %s is the only Digimon and fails the printed base requirement",
    async (baseCard) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: baseCard, as: "illegal" },
              { card: "BT25-086", as: "ts" },
            ],
            hand: [{ card: "BT26-080", as: "option" }],
          },
        },
        { autoDeclineOptional: true },
      );
      s.state.memory = 5;
      await s.ready();
      const optionId = s.inst("option").instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId, useAs: "option" })).toEqual({
        ok: true,
      });
      await settle(
        () =>
          s.state.players[0]!.trash.some(({ instanceId }) => instanceId === optionId) &&
          s.state.pendingDecision === undefined,
      );
      expect(s.decisions.some(({ req }) => req.promptText.includes("Arts Digivolve"))).toBe(false);
      expect(s.perm("illegal").topCard.cardId).toBe(baseCard);
      expect(s.state.memory).toBe(0);
    },
  );

  it("proves dual-card keywords and Bacchusmon evolution", () => {
    expect(getCardDefinition("BT26-080")).toMatchObject({
      nameEn: "Bacchusmon",
      colors: ["Purple", "Green"],
      kinds: ["Digimon", "Option"],
      level: 6,
      playCost: 5,
      dp: 13000,
      types: ["Shaman", "Olympos XII", "Iliad", "TS"],
      isDualCard: true,
      dualEffect: "Reversal of the Dead",
      optionColorRequirements: ["Purple"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toHaveLength(0);
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Bacchusmon"], basePlayCost: 12, cost: 2, isAlternate: true },
    ]);
    expect(digivolutionRequirementsFor("BT26-080")).toEqual(compiled.digivolutionRequirement);
    expect(compiled.keywords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyword: "SecurityAttack", amount: 1 }),
        expect.objectContaining({ keyword: "Succession" }),
      ]),
    );
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "Attack",
          withoutSuspending: true,
          cost: { kind: "suspend", target: { filter: { kind: ["Digimon"] }, count: 1 } },
        },
      ],
    });
    expect(
      compiled.effects.find((effect) => effect.trigger === "Static" && effect.actions?.[0]?.kind === "GrantStatic"),
    ).toMatchObject({
      actions: [
        {
          grant: "effects",
          filter: { nameOrTrait: [{ tokens: ["Bacchusmon"], match: "nameExact" }] },
        },
      ],
    });
    expect(compiled.effects.slice(2)).toMatchObject([
      {
        trigger: "Static",
        actions: [{ kind: "GrantStatic", grant: "effects", topmostOnly: true, duration: "permanent" }],
      },
      { trigger: "Static", actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHave" } }] },
      {
        trigger: "Main",
        actions: [
          { kind: "Unsuspend", target: { filter: { kind: ["Digimon"] }, count: 1 }, optional: true },
          {
            kind: "Delete",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], suspended: false, superlative: "lowestDP" },
              count: "all",
            },
          },
        ],
      },
    ]);
  });

  it("digivolves for 2 from a play-cost-12 Bacchusmon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-077", as: "bacchusmon" }],
        hand: [{ card: "BT26-080", as: "dual" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("bacchusmon").permanentId,
        instanceId: s.inst("dual").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("bacchusmon").topCard.cardId === "BT26-080");
    expect(s.state.memory).toBe(0);
  });

  it("uses Succession to gain the topmost Bacchusmon card's On Play effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-080", as: "dual", under: [{ card: "BT25-077", as: "successionSource" }] }],
          hand: [{ card: "BT26-009", as: "smallTs" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("dual"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT26-009");
  });

  it("encodes Q7112 as a source-relative live orientation filter", () => {
    expect(compiled.residual).toHaveLength(0);
    expect(compiled.effects.find((effect) => effect.trigger === "WhenAttacking")?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], sameOrientationAsSource: true } },
    });
  });

  it("deletes only an opposing Digimon with the same live orientation", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-080", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "same", suspended: true },
            { card: "BT1-011", as: "different", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-010")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-011")).toBe(true);
  });

  it("shares the orientation deletion once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-080", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first", suspended: true },
            { card: "BT1-011", as: "second", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("Q7113 may suspend an opponent's Digimon to attack without suspending", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-077", as: "base", suspended: false }],
          hand: [{ card: "BT26-080", as: "source" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponentCost" }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponentCost").permanentId);
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT26-080");

    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-009");
  });

  it("Q7113 may suspend your Digimon and still attack without suspending", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-077", as: "base" },
            { card: "BT1-009", as: "ownCost" },
          ],
          hand: [{ card: "BT26-080", as: "source" }],
        },
        1: { security: ["BT1-009"], deck: ["BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ownCost").permanentId);
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT26-080");
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("ownCost").isSuspended).toBe(true);
    expect(s.perm("source").isSuspended).toBe(false);
  });

  it("uses the DUAL Option with a TS use requirement and may unsuspend either player's Digimon (Q7114)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-086", as: "ts" }],
          hand: [{ card: "BT26-080", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "opponentSuspended", suspended: true, dp: 3000 },
            { card: "BT1-080", as: "opponentHigher", suspended: false, dp: 12000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT26-080"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-080"]);
  });

  it("enforces the DUAL Option's Purple color requirement when no TS card is in play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT26-080", as: "option" }] } });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });

  it("Q7114 may unsuspend your Digimon before deleting all opposing lowest-DP unsuspended Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-086", as: "ts" },
            { card: "BT1-009", as: "ownSuspended", suspended: true },
          ],
          hand: [{ card: "BT26-080", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "lowA", dp: 3000 },
            { card: "BT1-011", as: "lowB", dp: 3000 },
            { card: "BT1-080", as: "higher", dp: 12000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ownSuspended").permanentId);
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT26-080"));

    expect(s.perm("ownSuspended").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-080"]);
  });

  it("performs 2 security checks with Security A. +1", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-080", as: "source" }] },
      1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-011", "BT1-012"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("resets the copied BT25-077 play watcher on the next production turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-080", as: "host", under: [{ card: "BT25-077", as: "source" }] }],
          hand: [
            { card: "BT25-078", as: "firstPlay" },
            { card: "BT25-078", as: "secondPlay" },
            { card: "BT25-078", as: "thirdPlay" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-011", "BT1-011", "BT1-011", "BT1-011"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "firstTarget" },
            { card: "BT1-011", as: "secondTarget" },
            { card: "BT1-012", as: "thirdTarget" },
          ],
          deck: ["BT1-013", "BT1-013", "BT1-013", "BT1-013"],
          security: ["BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    preferred.push(s.perm("firstTarget").permanentId, s.perm("secondTarget").permanentId);

    try {
      const firstTurn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstPlay").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.perm("firstTarget").isSuspended);
      preferred.splice(0, preferred.length, s.perm("secondTarget").permanentId);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondPlay").instanceId })).toEqual({
        ok: true,
      });
      await settle(() =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("secondPlay").instanceId),
      );
      expect(s.perm("secondTarget").isSuspended).toBe(false);
      expect(
        s.decisions.filter(
          ({ req }) =>
            req.kind === "chooseTargets" &&
            req.options?.purpose === "optionalTarget" &&
            req.sourceCardId === "BT25-077",
        ),
      ).toHaveLength(1);
      advance(s.engine).endMainPhaseIfOpen(0);
      await firstTurn;

      s.state.turnSeat = 1;
      s.state.memory = -s.state.memory;
      await advance(s.engine).runTurn(1);
      s.state.turnSeat = 0;
      s.state.memory = -s.state.memory;
      preferred.splice(0, preferred.length, s.perm("secondTarget").permanentId);
      const nextTurn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thirdPlay").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.perm("secondTarget").isSuspended);
      expect(s.perm("thirdTarget").isSuspended).toBe(false);
      expect(
        s.decisions.filter(
          ({ req }) =>
            req.kind === "chooseTargets" &&
            req.options?.purpose === "optionalTarget" &&
            req.sourceCardId === "BT25-077",
        ),
      ).toHaveLength(2);
      advance(s.engine).endMainPhaseIfOpen(0);
      await nextTurn;
      expect(observe(s.engine).isAttacking()).toBe(false);
    } finally {
      advance(s.engine).endMainPhaseIfOpen(s.state.turnSeat);
      if (!s.state.gameOver) s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
    }
  });
});
