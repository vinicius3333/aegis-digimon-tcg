import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT7/BT7-087.js";
import "../BT16/BT16-085.js";
import "../EX3/EX3-053.js";
import { compiled } from "./BT17-026.js";
import "./index.js";

describe("BT17-026", () => {
  it("digivolves a Koji Tamer by placing Lobomon and KendoGarurumon from trash for cost 3", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      isFromHand: true,
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: { kind: ["Tamer"], nameOrTrait: [{ tokens: ["Koji Minamoto"], match: "name" }] },
            fromSelectionRef: "beowolfHost",
          },
          costOverride: 3,
          asLevel: 4,
          virtualBase: { level: 4, colors: ["Blue"] },
          additionalCosts: [{ kind: "place" }],
        },
      ],
    });
    expect(compiled.effects?.[0]?.actions?.[0]).not.toHaveProperty("ignoreRequirements");
  });

  it("returns a Hybrid card from its stack to suspend an opposing Digimon or Tamer", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Restrict",
          restriction: "suspend",
          blocksCombatSuspend: true,
          duration: "untilOpponentTurnEnd",
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "return",
            target: { filter: { zone: "digivolutionCards", hostFilter: { isSelfRef: true } } },
          },
        },
      ],
    });
  });

  it("returns a level 4 or lower opponent as inherited when it has Hybrid or Ten Warriors", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Return", to: "hand", condition: { kind: "selfHasTrait" } }],
    });
  });

  it("returns an opposing level 4 Digimon when its Hybrid host attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-023", as: "host", under: ["BT17-026"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    const targetInstanceId = s.perm("target").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === targetInstanceId));
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetInstanceId)).toBe(true);
  });

  it("places both Hybrid materials under the same Koji and digivolves it for exactly 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-087", as: "koji" }],
          hand: [{ card: "BT17-026", as: "beowolf" }],
          trash: [
            { card: "BT17-022", as: "lobomon" },
            { card: "BT17-023", as: "kendo" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const effect = JSON.parse(s.inst("beowolf").activatableEffectsJson) as Array<{ effectKey: string }>;
    expect(effect).toHaveLength(1);
    const lobomonId = s.inst("lobomon").instanceId;
    const kendoId = s.inst("kendo").instanceId;
    const kojiId = s.inst("koji").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("beowolf").instanceId,
        effectKey: effect[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("koji").topCard?.cardId === "BT17-026");

    expect(s.perm("koji").topCard?.cardId).toBe("BT17-026");
    expect(s.perm("koji").stack.map((card) => card.instanceId)).toEqual([kendoId, lobomonId, kojiId]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === lobomonId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === kendoId)).toBe(false);
    expect(s.state.memory).toBe(1);
    expect(observe(s.engine).activatableEffects(s.perm("koji"))).toEqual([]);
  });

  it("draws the digivolve bonus off the Tamer, returns a Hybrid card, and locks an opponent from suspending", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-087", as: "koji" }],
          hand: [{ card: "BT17-026", as: "beowolf" }],
          trash: [
            { card: "BT17-022", as: "lobomon" },
            { card: "BT17-023", as: "kendo" },
          ],
          deck: [{ card: "BT1-009", as: "bonus" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const bonusId = s.inst("bonus").instanceId;
    const materialIds = [s.inst("lobomon").instanceId, s.inst("kendo").instanceId];
    const effect = JSON.parse(s.inst("beowolf").activatableEffectsJson) as Array<{ effectKey: string }>;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("beowolf").instanceId,
        effectKey: effect[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("victim"), "suspend"));

    expect(s.perm("koji").topCard?.cardId).toBe("BT17-026");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === bonusId)).toBe(true);
    const returnedMaterials = s.state.players[0]!.hand.filter((card) => materialIds.includes(card.instanceId));
    expect(returnedMaterials).toHaveLength(1);
    expect(s.perm("koji").stack.some((card) => materialIds.includes(card.instanceId))).toBe(true);

    expect(observe(s.engine).isRestricted(s.perm("victim"), "beSuspended")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("victim"), "suspend")).toBe(true);
    await advance(s.engine).verb.suspend([s.perm("victim").permanentId]);
    expect(s.perm("victim").isSuspended).toBe(false);

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("victim").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("trashes the placed Koji Tamer as a digivolution card when Beowolfmon leaves the field", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-087", as: "koji" }],
          hand: [{ card: "BT17-026", as: "beowolf" }],
          trash: [
            { card: "BT17-022", as: "lobomon" },
            { card: "BT17-023", as: "kendo" },
          ],
          deck: [{ card: "BT1-009", as: "bonus" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const kojiId = s.inst("koji").instanceId;
    const effect = JSON.parse(s.inst("beowolf").activatableEffectsJson) as Array<{ effectKey: string }>;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("beowolf").instanceId,
        effectKey: effect[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("koji").topCard?.cardId === "BT17-026");

    await advance(s.engine).verb.deletePermanent([s.perm("koji").permanentId]);
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === kojiId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === kojiId)).toBe(true);
  });
});

describe("BT17-026 Beowolfmon — KB Q&A rulings", () => {
  function kojiBoard(options: { kojiEnteredThisTurn?: boolean; kojiSuspended?: boolean; autoAccept?: boolean } = {}) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT7-087",
              as: "koji",
              enteredThisTurn: options.kojiEnteredThisTurn ?? false,
              suspended: options.kojiSuspended ?? false,
            },
            { card: "BT16-085", as: "watcher" },
          ],
          hand: [{ card: "BT17-026", as: "beowolf" }],
          trash: [
            { card: "BT17-022", as: "lobomon" },
            { card: "BT17-023", as: "kendo" },
          ],
          deck: [{ card: "BT1-009", as: "bonus" }, "BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-012", as: "dummy", suspended: true }] },
      },
      options.autoAccept === true
        ? { autoAcceptOptional: true, autoSelectCards: true }
        : { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    return s;
  }

  function activateBeowolfMain(s: ReturnType<typeof kojiBoard>) {
    const effects = JSON.parse(s.inst("beowolf").activatableEffectsJson) as Array<{ effectKey: string }>;
    expect(effects).toHaveLength(1);
    return s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.inst("beowolf").instanceId,
      effectKey: effects[0]!.effectKey,
    });
  }

  it("digivolves Koji through [Main] for exactly 3, not the printed level 4 cost of 4 (Q2772)", async () => {
    const s = kojiBoard();
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("koji").permanentId,
        instanceId: s.inst("beowolf").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(4);

    expect(activateBeowolfMain(s)).toEqual({ ok: true });
    await settle(() => s.perm("koji").topCard?.cardId === "BT17-026");
    await settle();

    expect(s.perm("koji").topCard?.cardId).toBe("BT17-026");
    const digivolvePayments = s.events.filter(
      (event) => event.kind === "memoryChanged" && event.reason === "digivolve",
    );
    expect(digivolvePayments).toEqual([expect.objectContaining({ from: 4, to: 1 })]);
  });

  it("treats the Koji Tamer as a digivolving Digimon, and a 'Digimon can't digivolve' lock stops it (Q6568)", async () => {
    const s = kojiBoard({ autoAccept: true });
    await s.ready();
    const materialIds = [s.inst("lobomon").instanceId, s.inst("kendo").instanceId];

    expect(activateBeowolfMain(s)).toEqual({ ok: true });
    await settle(() => s.perm("koji").topCard?.cardId === "BT17-026");
    await settle();

    expect(s.perm("koji").topCard?.cardId).toBe("BT17-026");
    expect(s.state.players[0]!.hand.filter((card) => materialIds.includes(card.instanceId))).toHaveLength(1);
    expect(s.perm("watcher").isSuspended).toBe(true);

    async function digivolveUnderUnsuspendedLock(kojiSuspended: boolean) {
      const locked = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT7-087", as: "koji", suspended: kojiSuspended },
              { card: "BT17-022", as: "lobomonField" },
            ],
            hand: [
              { card: "BT17-026", as: "beowolf" },
              { card: "BT17-026", as: "secondBeowolf" },
            ],
            trash: [
              { card: "BT17-022", as: "lobomon" },
              { card: "BT17-023", as: "kendo" },
            ],
            deck: ["BT1-009", "BT1-009", "BT1-009"],
          },
          1: { battleArea: [{ card: "EX3-053", as: "metallicdramon" }] },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      locked.state.memory = 4;
      await locked.ready();
      await advance(locked.engine).fire(EffectTiming.OnPlay, locked.perm("metallicdramon"));
      await settle();

      expect(
        locked.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: locked.perm("lobomonField").permanentId,
          instanceId: locked.inst("secondBeowolf").instanceId,
        }),
      ).toMatchObject({ ok: false });

      const effects = JSON.parse(locked.inst("beowolf").activatableEffectsJson || "[]") as Array<{
        effectKey: string;
      }>;
      expect(effects.length > 0).toBe(kojiSuspended);
      locked.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: locked.inst("beowolf").instanceId,
        effectKey: effects[0]?.effectKey ?? "",
      });
      await settle();
      return locked.perm("koji").topCard?.cardId;
    }

    expect(await digivolveUnderUnsuspendedLock(false)).toBe("BT7-087");
    expect(await digivolveUnderUnsuspendedLock(true)).toBe("BT17-026");
  });

  it("performs the digivolution bonus draw when digivolving from the Koji Tamer (Q6569)", async () => {
    const s = kojiBoard();
    await s.ready();
    const bonusId = s.inst("bonus").instanceId;
    const deckBefore = s.state.players[0]!.deck.length;

    expect(activateBeowolfMain(s)).toEqual({ ok: true });
    await settle(() => s.perm("koji").topCard?.cardId === "BT17-026");
    await settle();

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([bonusId]);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 1);
  });

  it("cannot attack the turn it digivolves from a Koji played this turn (Q6570)", async () => {
    async function digivolveThenAttack(kojiEnteredThisTurn: boolean) {
      const s = kojiBoard({ kojiEnteredThisTurn });
      await s.ready();
      expect(activateBeowolfMain(s)).toEqual({ ok: true });
      await settle(() => s.perm("koji").topCard?.cardId === "BT17-026");
      await settle();
      return s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("koji").permanentId,
        target: { kind: "permanent", permanentId: s.perm("dummy").permanentId },
      });
    }

    expect((await digivolveThenAttack(true)).ok).toBe(false);
    expect((await digivolveThenAttack(false)).ok).toBe(true);
  });

  it("keeps the Koji Tamer as a digivolution card and trashes it with the stack when Beowolfmon leaves (Q6571)", async () => {
    const s = kojiBoard();
    await s.ready();
    const kojiId = s.inst("koji").instanceId;
    const stackIds = [kojiId, s.inst("lobomon").instanceId, s.inst("kendo").instanceId];

    expect(activateBeowolfMain(s)).toEqual({ ok: true });
    await settle(() => s.perm("koji").topCard?.cardId === "BT17-026");
    await settle();
    expect(s.perm("koji").stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining(stackIds));

    await advance(s.engine).verb.deletePermanent([s.perm("koji").permanentId]);
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === kojiId));

    const trashIds = s.state.players[0]!.trash.map((card) => card.instanceId);
    expect(trashIds).toEqual(expect.arrayContaining([...stackIds, s.inst("beowolf").instanceId]));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT17-026")).toBe(false);
  });

  it("does not gain the Koji Tamer's [Security] effect, while its inherited effect still applies (Q6572)", async () => {
    const control = kojiBoard();
    const securityTriggersOf = (events: typeof control.events, from: number) =>
      events.slice(from).filter((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT7-087");
    await control.ready();
    const controlEventsBefore = control.events.length;
    await advance(control.engine).fire(EffectTiming.SecuritySkill, control.perm("koji"));
    await settle();
    expect(securityTriggersOf(control.events, controlEventsBefore)).not.toEqual([]);

    const s = kojiBoard({ autoAccept: true });
    await s.ready();

    expect(activateBeowolfMain(s)).toEqual({ ok: true });
    await settle(() => s.perm("koji").topCard?.cardId === "BT17-026");
    await settle();

    expect(observe(s.engine).canUseInheritedEffect(s.perm("koji"), "BT7-087")).toBe(true);

    const eventsBefore = s.events.length;
    await advance(s.engine).fire(EffectTiming.SecuritySkill, s.perm("koji"));
    await settle();

    expect(securityTriggersOf(s.events, eventsBefore)).toEqual([]);
    expect(s.state.players[0]!.battleArea.filter((perm) => perm.topCard?.cardId === "BT7-087")).toEqual([]);
  });
  it("gains the Koji Tamer's inherited effect from its digivolution cards (Q6573)", async () => {
    async function digivolveFromKoji(returnHybridCard: boolean) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT7-087", as: "koji" }],
            hand: [{ card: "BT17-026", as: "beowolf" }],
            trash: [
              { card: "BT17-022", as: "lobomon" },
              { card: "BT17-023", as: "kendo" },
            ],
            deck: [],
          },
          1: { battleArea: [{ card: "BT1-010", as: "victim" }] },
        },
        returnHybridCard
          ? { autoAcceptOptional: true, autoSelectCards: true }
          : { autoDeclineOptional: true, autoSelectCards: true },
      );
      s.state.memory = 4;
      await s.ready();
      expect(activateBeowolfMain(s)).toEqual({ ok: true });
      await settle(() => s.perm("koji").topCard?.cardId === "BT17-026");
      await settle();
      expect(s.perm("koji").topCard?.cardId).toBe("BT17-026");
      return {
        memory: s.state.memory,
        cantBeBlocked: observe(s.engine).isRestricted(s.perm("koji"), "cantBeBlocked"),
      };
    }

    expect(await digivolveFromKoji(true)).toEqual({ memory: 2, cantBeBlocked: true });
    expect(await digivolveFromKoji(false)).toEqual({ memory: 1, cantBeBlocked: false });
  });
});
