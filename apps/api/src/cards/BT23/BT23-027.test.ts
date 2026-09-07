import { type DecisionResponse, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-027.js";

describe("BT23-027 Angemon", () => {
  it("draws first, then DNA evolves itself and another Digimon into an unsuspended Shakkoumon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-027", as: "angemon" },
            { card: "BT23-050", as: "other", suspended: true },
          ],
          hand: [{ card: "BT23-032", as: "shakkoumon" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const drawnId = s.inst("drawn").instanceId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("angemon"));

    const result = s.state.players[0]!.battleArea.find((card) => card.topCard?.cardId === "BT23-032");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === drawnId)).toBe(true);
    expect(result).toBeDefined();
    expect(result?.isSuspended).toBe(false);
    expect(result?.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT23-027", "BT23-050"]));
  });

  it("does not DNA digivolve an Angemon played under a digivolution restriction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-018", as: "host", under: ["BT23-017"] }],
          hand: [
            { card: "BT23-027", as: "angemon" },
            { card: "BT23-032", as: "shakkoumon" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle();
    const angemon = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === s.inst("angemon").instanceId,
    );
    expect(angemon).toBeDefined();
    expect(observe(s.engine).isRestricted(angemon!, "digivolve")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("shakkoumon").instanceId);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("shakkoumon").instanceId,
      ),
    ).toBe(false);
  });

  it("publicly follows Betamon's inherited attack play and refuses DNA while restricted (Q5256)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-018", as: "host", under: ["BT23-017"] }],
          hand: [
            { card: "BT23-027", as: "angemon" },
            { card: "BT23-032", as: "shakkoumon" },
          ],
          deck: [{ card: "BT1-009", as: "effectDraw" }, { card: "BT1-010", as: "nextDeck" }, "BT1-011"],
        },
        1: { security: ["BT1-009"], deck: Array(8).fill("BT1-010") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    // The first player skips the initial Draw phase; only Angemon will draw here.
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("angemon").instanceId),
    );
    await settle(() => !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    const played = s.perm("angemon");
    expect(played.topCard.instanceId).toBe(s.inst("angemon").instanceId);
    expect(observe(s.engine).isRestricted(played, "digivolve")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("shakkoumon").instanceId, s.inst("effectDraw").instanceId]),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("shakkoumon").instanceId)).toBe(
      false,
    );
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("nextDeck").instanceId);
    expect(s.perm("host").topCard.cardId).toBe("BT23-018");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT23-017"]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each([
    ["one own material", [], [], [], [], true],
    ["enemy-only second material", [], [{ card: "BT23-050", as: "enemyMaterial" }], [], [], true],
    [
      "Shakkoumon in trash",
      [{ card: "BT23-050", as: "material" }],
      [],
      [],
      [{ card: "BT23-032", as: "shakkoumon" }],
      false,
    ],
    [
      "Shakkoumon in opponent hand",
      [{ card: "BT23-050", as: "material" }],
      [],
      [{ card: "BT23-032", as: "shakkoumon" }],
      [],
      false,
    ],
    ["invalid level-3 Tentomon second material", [{ card: "BT23-037", as: "invalid" }], [], [], [], true],
  ])(
    "public On Play draws but refuses DNA with %s",
    async (_label, ownBattle, enemyBattle, enemyHand, ownTrash, resultInOwnHand) => {
      const s = setupEngine(
        {
          0: {
            battleArea: ownBattle,
            hand: [
              { card: "BT23-027", as: "angemon" },
              ...(resultInOwnHand ? [{ card: "BT23-032", as: "shakkoumon" }] : []),
            ],
            trash: ownTrash,
            deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010"],
          },
          1: { battleArea: enemyBattle, hand: enemyHand, deck: ["BT1-011", "BT1-012"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      const angemonId = s.inst("angemon").instanceId;
      const materialIds = ownBattle.map((entry) => s.inst(entry.as).instanceId);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: angemonId })).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
      expect(s.state.memory).toBe(5);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === angemonId)).toBe(true);
      for (const materialId of materialIds) {
        expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === materialId)).toBe(true);
      }
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
        ownTrash.map((entry) => s.inst(entry.as).instanceId),
      );
      expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual(
        enemyHand.map((entry) => s.inst(entry.as).instanceId),
      );
      expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard.instanceId)).toEqual(
        enemyBattle.map((entry) => s.inst(entry.as).instanceId),
      );
      expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT23-032")).toBe(resultInOwnHand);
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-032")).toBe(false);
      expect(observe(s.engine).isAttacking()).toBe(false);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("publicly declines an otherwise legal DNA option without moving either material", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-050", as: "first" },
            { card: "BT23-050", as: "second" },
          ],
          hand: [
            { card: "BT23-027", as: "angemon" },
            { card: "BT23-032", as: "shakkoumon" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010"],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 10;
    const angemonId = s.inst("angemon").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: angemonId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.state.pendingDecision).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === angemonId)).toBe(true);
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT23-050")).toHaveLength(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("shakkoumon").instanceId);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declares Barrier", () => {
    expect(getCardDefinition("BT23-027")).toMatchObject({
      cardId: "BT23-027",
      nameEn: "Angemon",
      colors: ["Yellow", "Blue"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [
        { color: "Yellow", level: 3, memoryCost: 3 },
        { color: "Black", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Angel", "Hudie", "CS"],
    });
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static")!;
    expect(staticEffect.keywords).toEqual([{ keyword: "Barrier", raw: "＜Barrier＞" }]);
  });

  it("draws one, then may DNA digivolve two of your Digimon into Shakkoumon on your turn", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = compiled.effects.find((entry) => entry.trigger === trigger)!.actions;
      expect(actions[0]).toEqual({ kind: "Draw", controller: "mine", amount: 1 });
      expect(actions[1]).toMatchObject({
        kind: "DnaDigivolve",
        materials: { filter: { controller: "mine", kind: ["Digimon"] }, count: 2 },
        into: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Shakkoumon"], match: "nameExact" }] },
        from: ["hand"],
        payCost: true,
        condition: { kind: "isYourTurn" },
        optional: true,
      });
    }
  });

  it("publicly plays Angemon, draws, and DNA digivolves with a legal second material", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-050", as: "material", suspended: true }],
          hand: [
            { card: "BT23-027", as: "angemon" },
            { card: "BT23-032", as: "shakkoumon" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }, { card: "BT1-010", as: "dnaDraw" }, "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const angemonId = s.inst("angemon").instanceId;
    const materialId = s.inst("material").instanceId;
    const drawnId = s.inst("drawn").instanceId;
    const dnaDrawId = s.inst("dnaDraw").instanceId;
    const shakkoumonId = s.inst("shakkoumon").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: angemonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === shakkoumonId));
    const result = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === shakkoumonId);
    expect(result?.topCard?.instanceId).toBe(shakkoumonId);
    expect(result?.stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining([angemonId, materialId]));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawnId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(dnaDrawId);
    expect(s.state.memory).toBe(5);
  });

  it.each([
    ["Patamon", "BT1-048", 0],
    ["level-3 CS", "BT23-037", 1],
  ])("publicly evolves from the %s alternate source for 2", async (_label, sourceCard, requirementIndex) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: sourceCard, as: "source" }],
        hand: [{ card: "BT23-027", as: "angemon" }],
        deck: [
          { card: "BT1-009", as: "drawn" },
          { card: "BT1-010", as: "effectDraw" },
        ],
      },
    });
    s.state.memory = 2;
    const sourceId = s.inst("source").instanceId;
    const angemonId = s.inst("angemon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: angemonId,
        useAlternateCost: true,
        alternateRequirementIndex: requirementIndex,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.instanceId === angemonId);
    expect(s.perm("source").topCard.instanceId).toBe(angemonId);
    expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("drawn").instanceId,
      s.inst("effectDraw").instanceId,
    ]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.gameOver).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it.each([
    ["yellow", "BT1-048"],
    ["black", "BT10-058"],
  ])(
    "publicly normal-evolves from a level-3 %s source for 3 and draws its bonus and effect cards",
    async (_label, sourceCard) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: sourceCard, as: "source" }],
            hand: [{ card: "BT23-027", as: "evolved" }],
            deck: [
              { card: "BT1-009", as: "playDraw" },
              { card: "BT1-010", as: "evoDraw" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 3;
      const sourceId = s.inst("source").instanceId;
      const evolvedId = s.inst("evolved").instanceId;
      const playDrawId = s.inst("playDraw").instanceId;
      const evoDrawId = s.inst("evoDraw").instanceId;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("source").permanentId,
          instanceId: evolvedId,
        }),
      ).toEqual({
        ok: true,
      });
      await settle(() => s.perm("source").topCard.instanceId === evolvedId);
      expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([sourceId]);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
        expect.arrayContaining([playDrawId, evoDrawId]),
      );
      expect(s.state.players[0]!.hand).toHaveLength(2);
      expect(s.state.players[0]!.deck).toHaveLength(0);
      expect(s.state.memory).toBe(0);
      expect(s.state.gameOver).toBe(false);
    },
  );

  it.each([
    ["non-CS yellow", "BT1-045"],
    ["wrong-color red", "BT1-009"],
    ["wrong-level", "BT23-050"],
  ])("rejects the CS alternate source when it is %s", async (_label, sourceCard) => {
    const s = setupEngine({
      0: { battleArea: [{ card: sourceCard, as: "source" }], hand: [{ card: "BT23-027", as: "angemon" }] },
    });
    s.state.memory = 2;
    const sourceId = s.inst("source").instanceId;
    const angemonId = s.inst("angemon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: angemonId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("source").topCard.instanceId).toBe(sourceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(angemonId);
    expect(s.state.memory).toBe(2);
  });

  it("declares inherited Barrier", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Barrier" }],
    });
  });

  it("exposes Barrier both directly and from a realistic evolution stack", async () => {
    const direct = setupEngine({ 0: { battleArea: [{ card: "BT23-027", as: "angemon" }] } });
    await direct.ready();
    expect(observe(direct.engine).hasKeyword(direct.perm("angemon"), "Barrier")).toBe(true);

    const inherited = setupEngine({ 0: { battleArea: [{ card: "BT23-032", as: "host", under: ["BT23-027"] }] } });
    await inherited.ready();
    expect(observe(inherited.engine).hasKeyword(inherited.perm("host"), "Barrier")).toBe(true);
  });

  it("draws but does not offer DNA digivolution on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-027", as: "angemon" },
            { card: "BT23-050", as: "other" },
          ],
          hand: [{ card: "BT23-032", as: "shakkoumon" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("angemon"));
    await settle();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("shakkoumon").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it.each([
    ["direct", false],
    ["inherited", true],
  ])("public Barrier combat can be accepted or refused (%s)", async (_label, inherited) => {
    for (const accept of [true, false]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              inherited
                ? { card: "BT23-032", as: "target", under: ["BT23-027"], suspended: true }
                : { card: "BT23-027", as: "target", suspended: true },
            ],
            security: [{ card: "BT1-009", as: "payment" }],
            deck: Array(8).fill("BT1-010"),
          },
          1: { battleArea: [{ card: "BT23-025", as: "attacker" }], deck: Array(8).fill("BT1-009") },
        },
        { autoAcceptOptional: false, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      const targetId = s.perm("target").permanentId;
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: targetId },
        }),
      ).toEqual({ ok: true });
      const combat = (s.engine as unknown as { combat: { hasOpenBarrierDecision: boolean } }).combat;
      await settle(() => combat.hasOpenBarrierDecision);
      expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: targetId, accept })).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      let replacementResponse = { ok: true };
      if (!accept && s.state.pendingDecision) {
        const response: DecisionResponse =
          s.state.pendingDecision.kind === "selectCards"
            ? { kind: "selectCards", instanceIds: [] }
            : { kind: "optional", accept: false };
        replacementResponse = s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision.decisionId,
          response,
        });
        await settle(() => !observe(s.engine).isAttacking());
      }
      expect(replacementResponse).toMatchObject({ ok: true });
      expect(observe(s.engine).isAttacking()).toBe(false);
      expect(s.state.pendingDecision).toBeUndefined();
      const remains = s.state.players[0]!.battleArea.some((p) => p.permanentId === targetId);
      expect(remains).toBe(accept);
      expect(s.state.players[0]!.security).toHaveLength(accept ? 0 : 1);
    }
  });
});
