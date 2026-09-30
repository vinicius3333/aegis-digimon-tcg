import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-021.js";
import "../index.js";

const CARD_ID = "EX10-021";

describe("EX10-021 Belphemon: Sleep Mode", () => {
  it("matches the catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Belphemon: Sleep Mode",
      colors: ["Green", "Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Demon Lord", "Seven Great Demon Lords"],
    });
    const definition = getCardDefinition(CARD_ID)!;
    expect(definition.inheritedEffectText ?? "").toBe("");
    expect(definition.securityEffectText ?? "").toBe("");
  });

  it("compiles the printed clauses into IR", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Belphemon: Rage Mode"], cost: 1, isAlternate: true }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Restrict",
            restriction: "attack",
            duration: "untilOpponentTurnEnd",
            optional: true,
            abortOnDecline: true,
            cost: {
              kind: "place",
              destination: "digivolutionStack",
              position: "top",
              host: "self",
              target: {
                filter: {
                  zone: "trash",
                  controller: "mine",
                  nameOrTrait: [{ match: "nameExact", tokens: ["Belphemon: Rage Mode"] }],
                },
                count: 1,
              },
            },
          },
          { kind: "GrantImmunity", immuneFrom: "opponentEffects", duration: "untilOpponentTurnEnd", optional: false },
        ],
      });
    }
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [
            {
              kind: "Suspend",
              optional: true,
              abortOnDecline: true,
              target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 2 },
              cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 2 } },
            },
          ],
        },
      ],
    });
  });

  it("digivolves by the printed Purple Lv.5 route and by the alternate [Belphemon: Rage Mode]: Cost 1 route", async () => {
    const normal = setupEngine(
      { 0: { battleArea: [{ card: "BT10-081", as: "base" }], hand: [{ card: CARD_ID, as: "sleep" }], trash: [] } },
      { autoDeclineOptional: true },
    );
    normal.state.memory = 3;
    await normal.ready();
    expect(
      normal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: normal.perm("base").permanentId,
        instanceId: normal.inst("sleep").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => normal.perm("base").topCard!.cardId === CARD_ID);
    expect(normal.state.memory).toBe(0);
    expect(normal.perm("base").stack.map((card) => card.cardId)).toEqual(["BT10-081"]);

    const alternate = setupEngine(
      { 0: { battleArea: [{ card: "EX10-022", as: "rage" }], hand: [{ card: CARD_ID, as: "sleep" }] } },
      { autoDeclineOptional: true },
    );
    alternate.state.memory = 1;
    await alternate.ready();
    expect(
      alternate.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: alternate.perm("rage").permanentId,
        instanceId: alternate.inst("sleep").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => alternate.perm("rage").topCard!.cardId === CARD_ID);
    expect(alternate.state.memory).toBe(0);
    expect(alternate.perm("rage").stack.map((card) => card.cardId)).toEqual(["EX10-022"]);

    const illegal = setupEngine(
      { 0: { battleArea: [{ card: "BT1-070", as: "green4" }], hand: [{ card: CARD_ID, as: "sleep" }] } },
      { autoDeclineOptional: true },
    );
    illegal.state.memory = 10;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("green4").permanentId,
        instanceId: illegal.inst("sleep").instanceId,
      }).ok,
    ).toBe(false);
    expect(illegal.perm("green4").topCard!.cardId).toBe("BT1-070");
  });

  it("[On Play]: places exactly [Belphemon: Rage Mode] as the top digivolution card and locks its attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "sleep" }, "BT1-013"],
          trash: [
            { card: "BT13-088", as: "decoy" },
            { card: "EX10-022", as: "rage" },
          ],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-012", as: "wall" }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("decoy").instanceId, s.inst("rage").instanceId);
    s.state.memory = 11;
    const sleepId = s.inst("sleep").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: sleepId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === sleepId));
    await settle(() => s.perm("sleep").stack.length === 1);

    const played = s.perm("sleep");
    expect(played.topCard!.cardId).toBe(CARD_ID);
    expect(played.stack.map((card) => card.cardId)).toEqual(["EX10-022"]);
    expect(played.stack.at(-1)!.instanceId).toBe(s.inst("rage").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("decoy").instanceId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-013"]);

    expect(observe(s.engine).isRestricted(played, "attack")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: played.permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(played.isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("accepts every [Belphemon: Rage Mode] printing and no other [Belphemon] card", async () => {
    for (const rageModePrinting of ["EX10-022", "BT13-091", "EX6-060"]) {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            hand: [{ card: CARD_ID, as: "sleep" }, "BT1-013"],
            trash: [
              { card: "BT23-070", as: "belphemonX" },
              { card: "BT13-088", as: "sleepMode" },
              { card: rageModePrinting, as: "rage" },
            ],
            security: ["BT1-009"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      await s.ready();
      preferred.push(s.inst("belphemonX").instanceId, s.inst("sleepMode").instanceId, s.inst("rage").instanceId);
      s.state.memory = 11;
      const sleepId = s.inst("sleep").instanceId;

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: sleepId })).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === sleepId));
      await settle(() => s.perm("sleep").stack.length === 1);

      expect(s.perm("sleep").stack.map((card) => card.cardId)).toEqual([rageModePrinting]);
      expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT23-070", "BT13-088"]);
      expect(s.state.pendingDecision).toBeUndefined();
    }
  });

  it("[When Digivolving]: the same clause fires off the alternate [Rage Mode] route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-022", as: "rage" }],
          hand: [{ card: CARD_ID, as: "sleep" }, "BT1-013"],
          trash: [{ card: "EX10-022", as: "fromTrash" }],
          deck: ["BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rage").permanentId,
        instanceId: s.inst("sleep").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rage").stack.length === 2);

    expect(s.perm("rage").topCard!.cardId).toBe(CARD_ID);
    expect(s.perm("rage").stack.map((card) => card.instanceId)).toEqual([
      s.inst("rage").instanceId,
      s.inst("fromTrash").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([]);
    expect(observe(s.engine).isRestricted(s.perm("rage"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("rage"), "beAffected")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("may refuse the placement, and then gains neither the attack lock nor the immunity", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "sleep" }, "BT1-013"],
          trash: [{ card: "EX10-022", as: "rage" }],
          security: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 11;
    const sleepId = s.inst("sleep").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: sleepId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === sleepId));
    await settle(() => false, 30);

    expect(s.perm("sleep").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("rage").instanceId]);
    expect(observe(s.engine).isRestricted(s.perm("sleep"), "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("sleep"), "beAffected")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("with no [Belphemon: Rage Mode] in the trash the cost cannot be paid, so neither half applies", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "sleep" }, "BT1-013"],
          trash: [
            { card: "BT13-088", as: "otherBelphemon" },
            { card: "EX10-023", as: "sameSet" },
          ],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 11;
    const sleepId = s.inst("sleep").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: sleepId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === sleepId));
    await settle(() => false, 30);

    expect(s.perm("sleep").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(observe(s.engine).isRestricted(s.perm("sleep"), "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("sleep"), "beAffected")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("your opponent's effects don't affect it: an opposing [On Play] suspend leaves it unsuspended", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "sleep" }, "BT1-013"],
          trash: [{ card: "EX10-022", as: "rage" }],
          security: ["BT1-009"],
        },
        1: { hand: [{ card: "BT1-070", as: "suspender" }, "BT1-013"], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 11;
    const sleepId = s.inst("sleep").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: sleepId })).toEqual({ ok: true });
    await settle(() => s.perm("sleep").stack.length === 1);
    expect(observe(s.engine).isRestricted(s.perm("sleep"), "beAffected")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle(() => false, 30);

    expect(s.perm("sleep").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("KB Q5067: an immune Digimon is still offered as a candidate for an opponent's effect", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "sleep" }, "BT1-013"],
          trash: [{ card: "EX10-022", as: "rage" }],
          security: ["BT1-009"],
        },
        1: { hand: [{ card: "BT1-070", as: "suspender" }, "BT1-013"], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 11;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sleep").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("sleep").stack.length === 1);

    s.state.turnSeat = 1;
    s.state.memory = 4;
    await s.ready();
    const before = s.decisions.length;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle(() => false, 30);

    const offered = s.decisions
      .slice(before)
      .filter((entry) => entry.req.kind === "chooseTargets")
      .flatMap((entry) => entry.req.options?.candidateInstanceIds ?? []);
    expect(offered).toContain(s.perm("sleep").permanentId);
    expect(s.perm("sleep").isSuspended).toBe(false);
  });

  it("both halves last until the opponent's turn ends, and the same effect then lands", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "sleep" }, "BT1-013"],
          trash: [{ card: "EX10-022", as: "rage" }],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-009", "BT1-012"],
        },
        1: {
          hand: [{ card: "BT1-070", as: "suspenderA" }, { card: "BT1-070", as: "suspenderB" }, "BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-009", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 11;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sleep").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("sleep").stack.length === 1);
    expect(observe(s.engine).isRestricted(s.perm("sleep"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("sleep"), "beAffected")).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).isRestricted(s.perm("sleep"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("sleep"), "beAffected")).toBe(true);
    s.state.memory = 6;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("suspenderA").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle(() => false, 30);
    expect(s.perm("sleep").isSuspended).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).isRestricted(s.perm("rage"), "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("rage"), "beAffected")).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 6;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("suspenderB").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("rage").isSuspended);
    expect(s.perm("rage").isSuspended).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[Opponent's Turn]: an opposing attack declaration pays 2 hand cards and suspends 2 of their permanents", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "sleep" }],
          hand: [
            { card: "BT1-009", as: "cost1" },
            { card: "BT1-012", as: "cost2" },
            { card: "BT1-013", as: "spare" },
          ],
          security: ["BT1-009", "BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker", dp: 20_000 },
            { card: "BT1-012", as: "digimon" },
            { card: "BT1-085", as: "tamer" },
          ],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    await s.ready();
    preferred.push(
      s.inst("cost1").instanceId,
      s.inst("cost2").instanceId,
      s.perm("digimon").permanentId,
      s.perm("tamer").permanentId,
    );

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("digimon").isSuspended && s.perm("tamer").isSuspended);
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("spare").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("cost1").instanceId, s.inst("cost2").instanceId]),
    );
    expect(s.perm("digimon").isSuspended).toBe(true);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("sleep").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("cannot pay the cost with a single card in hand: nothing is trashed and nothing suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "sleep" }],
          hand: [{ card: "BT1-009", as: "only" }],
          security: ["BT1-009", "BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker", dp: 20_000 },
            { card: "BT1-012", as: "digimon" },
          ],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => false, 30);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("only").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("only").instanceId);
    expect(s.perm("digimon").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[Opponent's Turn]: does not fire when MY own Digimon suspends on my own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "sleep" },
            { card: "BT1-009", as: "myAttacker", dp: 20_000 },
          ],
          hand: [
            { card: "BT1-009", as: "cost1" },
            { card: "BT1-012", as: "cost2" },
          ],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-012", as: "digimon" }],
          security: ["BT1-009", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("myAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    await settle(() => false, 30);

    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("digimon").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[Once Per Turn]: a second opposing attack in the same turn does not fire, and the next opponent turn does", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "sleep" }],
          hand: [
            { card: "BT1-009", as: "a1" },
            { card: "BT1-012", as: "a2" },
            { card: "BT1-013", as: "b1" },
            { card: "BT1-014", as: "b2" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-012"],
          security: ["BT1-009", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attackerA", dp: 20_000 },
            { card: "BT1-013", as: "attackerB", dp: 20_000 },
            { card: "BT1-012", as: "victim1" },
            { card: "BT1-014", as: "victim2" },
          ],
          hand: ["BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-012"],
          security: ["BT1-009", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    preferred.push(
      s.inst("a1").instanceId,
      s.inst("a2").instanceId,
      s.perm("victim1").permanentId,
      s.perm("victim2").permanentId,
    );

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerA").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("victim1").isSuspended && s.perm("victim2").isSuspended);
    await settle(() => !observe(s.engine).isAttacking());
    const handAfterFirst = s.state.players[0]!.hand.length;
    const trashAfterFirst = s.state.players[0]!.trash.length;
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("a1").instanceId, s.inst("a2").instanceId]),
    );

    s.perm("victim1").isSuspended = false;
    s.perm("victim2").isSuspended = false;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerB").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => false, 30);
    expect(s.state.players[0]!.hand).toHaveLength(handAfterFirst);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toEqual(
      expect.arrayContaining([s.inst("b1").instanceId, s.inst("b2").instanceId]),
    );
    expect(s.perm("victim1").isSuspended).toBe(false);
    expect(s.perm("victim2").isSuspended).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    preferred.length = 0;
    preferred.push(
      s.inst("b1").instanceId,
      s.inst("b2").instanceId,
      s.perm("victim1").permanentId,
      s.perm("victim2").permanentId,
    );

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerA").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("victim1").isSuspended && s.perm("victim2").isSuspended);
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("b1").instanceId, s.inst("b2").instanceId]),
    );
    expect(s.state.players[0]!.trash.length).toBeGreaterThanOrEqual(trashAfterFirst + 2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("spare").instanceId);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("EX10-021 Belphemon: Sleep Mode — KB Q&A rulings", () => {
  type Setup = ReturnType<typeof setupEngine>;

  async function playImmuneSleepMode(s: Setup): Promise<void> {
    s.state.memory = 11;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sleep").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("sleep").stack.length === 1 && s.state.pendingDecision === undefined);
    expect(observe(s.engine).isRestricted(s.perm("sleep"), "beAffected")).toBe(true);
  }

  async function playForOpponent(s: Setup, alias: string, memory: number): Promise<void> {
    s.state.turnSeat = 1;
    s.state.memory = memory;
    await s.ready();
    const instanceId = s.inst(alias).instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.some(({ topCard }) => topCard.instanceId === instanceId) &&
        s.state.pendingDecision === undefined,
    );
  }

  it("cannot pay the 2-card cost with a single hand card, so no opposing permanent suspends (Q5065)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "sleep" }],
          hand: [{ card: "BT1-012", as: "only" }],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker", dp: 20_000 },
            { card: "BT1-012", as: "digimon" },
            { card: "BT1-085", as: "tamer" },
          ],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("only").instanceId]);
    expect(s.perm("digimon").isSuspended).toBe(false);
    expect(s.perm("tamer").isSuspended).toBe(false);
  });

  it("an opposing -3000 DP effect that chooses it leaves its DP unchanged (Q5066)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: CARD_ID, as: "sleep" }], trash: [{ card: "EX10-022", as: "rage" }] },
        1: { hand: [{ card: "BT1-055", as: "angemon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await playImmuneSleepMode(s);
    expect(s.perm("sleep").currentDP).toBe(11000);

    await playForOpponent(s, "angemon", 5);
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("sleep").currentDP).toBe(11000);
  });

  it("can be given an opposing ＜Security A. -1＞, but is not considered to have it while immune (Q5068)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "sleep" }, ...Array(7).fill("BT1-013")],
          trash: [{ card: "EX10-022", as: "rage" }],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-012"],
          security: ["BT1-009", "BT1-012"],
        },
        1: {
          hand: [{ card: "BT5-036", as: "renamon" }],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-012"],
          security: ["BT1-009", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await playImmuneSleepMode(s);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 4;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("renamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT5-036") &&
        s.state.pendingDecision === undefined,
    );
    expect(observe(s.engine).isRestricted(s.perm("rage"), "beAffected")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("rage"), "SecurityAttack")).toBe(0);

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.hand.length).toBeGreaterThan(6);
    expect(observe(s.engine).isRestricted(s.perm("rage"), "beAffected")).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("rage"), "SecurityAttack")).toBe(-1);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("stops being affected by an opposing ＜Security A. -1＞ the moment it gains the immunity (Q5069)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-022", as: "rage" }],
          hand: [{ card: CARD_ID, as: "sleep" }],
          trash: [{ card: "EX10-022", as: "fromTrash" }],
          deck: ["BT1-013"],
        },
        1: { hand: [{ card: "BT5-036", as: "renamon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await playForOpponent(s, "renamon", 4);
    expect(observe(s.engine).keywordAmount(s.perm("rage"), "SecurityAttack")).toBe(-1);

    s.state.turnSeat = 0;
    s.state.memory = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rage").permanentId,
        instanceId: s.inst("sleep").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rage").stack.length === 2 && s.state.pendingDecision === undefined);

    expect(s.perm("rage").topCard.cardId).toBe(CARD_ID);
    expect(observe(s.engine).isRestricted(s.perm("rage"), "beAffected")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("rage"), "SecurityAttack")).toBe(0);
  });

  it("a [When Attacking] effect given while immune applies once the immunity ends (Q5070)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "sleep" }],
          trash: [{ card: "EX10-022", as: "rage" }],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-012"],
          security: ["BT1-009", "BT1-012"],
        },
        1: {
          hand: [{ card: "EX4-018", as: "granter" }],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-012"],
          security: ["BT1-009", "BT1-012", "BT1-014"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await playImmuneSleepMode(s);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 5;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("granter").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "EX4-018") &&
        s.state.pendingDecision === undefined,
    );
    expect(observe(s.engine).customEffectGrants(s.perm("rage")).length).toBeGreaterThan(0);
    expect(observe(s.engine).isRestricted(s.perm("rage"), "beAffected")).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("rage").topCard.cardId).toBe("EX10-022");
    expect(observe(s.engine).isRestricted(s.perm("rage"), "beAffected")).toBe(false);
    expect(observe(s.engine).customEffectGrants(s.perm("rage")).length).toBeGreaterThan(0);
    s.state.memory = 5;
    for (const permanent of s.state.players[1]!.battleArea) permanent.isSuspended = true;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("rage").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(3);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each([
    { immuneAtDeletion: false, memoryShift: 1 },
    { immuneAtDeletion: true, memoryShift: 0 },
  ])(
    "a granted [On Deletion] triggers only if it is affected when deleted: immune=$immuneAtDeletion (Q5071)",
    async ({ immuneAtDeletion, memoryShift }) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: CARD_ID, as: "sleep", suspended: true }],
            trash: [{ card: "EX10-022", as: "rage" }],
            security: ["BT1-009"],
          },
          1: {
            battleArea: [{ card: "BT1-009", as: "attacker", dp: 20_000 }],
            hand: [{ card: "BT15-068", as: "granter" }],
            security: ["BT1-009"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      if (immuneAtDeletion) {
        await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("sleep"));
        await settle(() => s.perm("sleep").stack.length === 1 && s.state.pendingDecision === undefined);
      }
      expect(observe(s.engine).isRestricted(s.perm("sleep"), "beAffected")).toBe(immuneAtDeletion);
      const sleepId = s.perm("sleep").permanentId;

      await playForOpponent(s, "granter", 5);
      expect(observe(s.engine).customEffectGrants(s.perm("sleep")).length).toBeGreaterThan(0);
      s.state.memory = 5;

      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: sleepId },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === sleepId) &&
          !observe(s.engine).isAttacking() &&
          s.state.pendingDecision === undefined,
      );

      expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain(CARD_ID);
      expect(s.state.memory).toBe(5 + memoryShift);
    },
  );
});
