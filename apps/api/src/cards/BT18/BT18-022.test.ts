import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../BT1/BT1-035.js";
import "../BT5/BT5-091.js";
import "../BT7/BT7-086.js";
import "../BT13/BT13-007.js";
import { compiled } from "./BT18-022.js";
import "./BT18-089.js";

describe("BT18-022 Kumamon", () => {
  it("keeps the Ice-Snow Rule trait and all timing-specific effect boundaries", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "TrashDigivolution", amount: 2, fromTop: false }],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          reduceCost: 1,
          payCost: true,
          into: { colors: ["Red", "Blue"], nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] },
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "Rule",
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Ice-Snow"] }],
    });
    expect(compiled.effects[3]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanYourEffect",
          actions: [{ kind: "PlayWithoutCost", fromOwnDigivolutionStack: true }],
        },
      ],
    });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT18-022", as: "kumamon" }] } });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("kumamon"), "Ice-Snow")).toBe(true);
  });

  it("naturally trashes the bottom 2 cards on a legal Tommy Himi evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-089", as: "tommy" }],
          hand: [{ card: "BT18-022", as: "kumamon" }],
        },
        1: { battleArea: [{ card: "BT1-030", as: "target", under: ["BT1-001", "BT1-003", "BT1-004"] }] },
      },
      { autoSelectCards: true },
    );
    const bottomIds = s
      .perm("target")
      .stack.slice(0, 2)
      .map((card) => card.instanceId);
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tommy").permanentId,
        instanceId: s.inst("kumamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tommy").topCard.cardId === "BT18-022");

    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual(["BT1-004"]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(bottomIds));
  });

  it.each([
    ["Tommy Himi", "BT18-089", 3],
    ["Korikakumon", "BT18-025", 5],
  ])("digivolves from %s with the printed alternate cost", async (_name, baseCard, expectedMemory) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "BT18-022", as: "kumamon" }],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kumamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT18-022");

    expect(s.state.memory).toBe(expectedMemory);
    expect(s.perm("base").stack.at(-1)?.cardId).toBe(baseCard);
  });

  it("evolves a controlled Digimon for 1 less on its first attack each turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-022", as: "kumamon" },
            { card: "BT18-021", as: "penguinmon" },
          ],
          hand: [{ card: "BT18-023", as: "lanamon" }],
        },
        1: { security: ["BT1-030"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("penguinmon").topCard!.instanceId, s.inst("lanamon").instanceId);
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kumamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("penguinmon").topCard.cardId === "BT18-023");

    expect(s.state.memory).toBe(4);
    expect(s.perm("penguinmon").stack.at(-1)?.cardId).toBe("BT18-021");
  });

  it("naturally offers the inherited Tamer play when an opponent deletes the host in battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-060", as: "host", suspended: true, under: ["BT18-089", "BT18-022"] },
            { card: "BT1-030", as: "other", under: ["BT18-090"] },
          ],
        },
        1: { battleArea: [{ card: "BT1-030", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const ownTamerId = s.perm("host").stack.find((card) => card.cardId === "BT18-089")!.instanceId;
    s.perm("host").baseDP = 0;
    s.perm("host").currentDP = 0;
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === ownTamerId),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === ownTamerId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT18-022")).toBe(true);
    expect(s.perm("other").stack.map((card) => card.cardId)).toContain("BT18-090");
  });
});

describe("BT18-022 Kumamon — KB Q&A rulings", () => {
  const TOMMY = "BT18-089";
  const BLUE_ROOKIE = "BT1-030";
  const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];

  function digivolveKumamon(s: EngineSetup, base: string) {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm(base).permanentId,
      instanceId: s.inst("kumamon").instanceId,
    });
  }

  it("digivolves from the Tamer as-is: Digimon digivolve watchers stay silent and Digimon can't-digivolve locks do not apply (Q2933)", async () => {
    function boardWithTakumiAiba() {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: TOMMY, as: "tommy" },
              { card: BLUE_ROOKIE, as: "rookie" },
              { card: "BT5-091", as: "takumi" },
            ],
            hand: [{ card: "BT18-022", as: "kumamon" }],
            deck: [...FILLER],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      return s;
    }

    const digimonControl = boardWithTakumiAiba();
    expect(digivolveKumamon(digimonControl, "rookie")).toEqual({ ok: true });
    await settle(() => digimonControl.perm("rookie").topCard.cardId === "BT18-022");
    await settle();
    expect(digimonControl.perm("takumi").isSuspended).toBe(true);
    expect(digimonControl.state.players[0]!.hand).toHaveLength(2);

    const fromTamer = boardWithTakumiAiba();
    expect(digivolveKumamon(fromTamer, "tommy")).toEqual({ ok: true });
    await settle(() => fromTamer.perm("tommy").topCard.cardId === "BT18-022");
    await settle();
    expect(fromTamer.state.memory).toBe(8);
    expect(fromTamer.perm("takumi").isSuspended).toBe(false);
    expect(fromTamer.state.players[0]!.hand).toHaveLength(1);

    function lockedBoard() {
      const s = setupEngine(
        {
          0: {
            breeding: "BT13-007",
            battleArea: [
              { card: TOMMY, as: "tommy" },
              { card: BLUE_ROOKIE, as: "rookie" },
            ],
            hand: [{ card: "BT18-022", as: "kumamon" }],
            deck: [...FILLER],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      return s;
    }

    const lockedDigimon = lockedBoard();
    await lockedDigimon.ready();
    expect(digivolveKumamon(lockedDigimon, "rookie")).toMatchObject({ ok: false });
    expect(lockedDigimon.perm("rookie").topCard.cardId).toBe(BLUE_ROOKIE);

    const lockedTamer = lockedBoard();
    await lockedTamer.ready();
    expect(digivolveKumamon(lockedTamer, "tommy")).toEqual({ ok: true });
    await settle(() => lockedTamer.perm("tommy").topCard.cardId === "BT18-022");
    expect(lockedTamer.state.memory).toBe(8);
  });

  it("lets the player order the deleted Digimon's [On Deletion] and the played Tamer's [On Play], which trigger together (Q2934)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-035", as: "leomon", under: ["BT7-086", "BT18-022"] }],
          deck: [...FILLER],
        },
        1: {
          battleArea: [{ card: BLUE_ROOKIE, as: "target", under: ["BT1-001", "BT1-003", "BT1-004", "BT1-009"] }],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: ["BT1-035"] },
    );
    s.state.memory = 0;
    await s.ready();
    const tommyId = s.perm("leomon").stack.find(({ cardId }) => cardId === "BT7-086")!.instanceId;

    const driver = advance(s.engine);
    driver.verb.enterEffectResolution(1, ["Digimon"]);
    await driver.verb.deletePermanent([s.perm("leomon").permanentId], "byEffect");
    driver.verb.leaveEffectResolution();
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.instanceId)).toEqual([tommyId]);
    expect(s.state.memory).toBe(2);
    expect(s.perm("target").stack).toHaveLength(1);

    const orderRequest = s.decisions.find(({ seat, req }) => seat === 0 && req.kind === "orderTriggers");
    expect(orderRequest?.req.options?.triggerCardIds).toEqual(expect.arrayContaining(["BT1-035", "BT7-086"]));
    const resolvedOrder = s.events.flatMap((event) => (event.kind === "effectResolved" ? [event.sourceCardId] : []));
    expect(resolvedOrder).toEqual(["BT1-035", "BT7-086"]);
  });

  it("performs the digivolution bonus draw when digivolving from a Tamer (Q2935)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TOMMY, as: "tommy" }],
          hand: [{ card: "BT18-022", as: "kumamon" }],
          deck: [{ card: "BT1-009", as: "drawn" }, ...FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(digivolveKumamon(s, "tommy")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.perm("tommy").topCard.cardId).toBe("BT18-022");
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(FILLER.length);
  });

  it("cannot attack the turn it digivolves from a Tamer played that turn (Q6589)", async () => {
    function boardWithTommy(tommyZone: "hand" | "battleArea") {
      const tommy = { card: TOMMY, as: "tommy" };
      const kumamon = { card: "BT18-022", as: "kumamon" };
      const s = setupEngine(
        {
          0: {
            battleArea: tommyZone === "battleArea" ? [tommy] : [],
            hand: tommyZone === "hand" ? [kumamon, tommy] : [kumamon],
            deck: [...FILLER],
          },
          1: { security: 3, deck: [...FILLER] },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      return s;
    }
    async function digivolveOntoTommy(s: EngineSetup) {
      expect(digivolveKumamon(s, "tommy")).toEqual({ ok: true });
      await settle(() => s.perm("tommy").topCard.cardId === "BT18-022");
      await settle();
    }
    function attackPlayer(s: EngineSetup) {
      return s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tommy").permanentId,
        target: { kind: "player" },
      });
    }

    const fresh = boardWithTommy("hand");
    expect(fresh.engine.applyIntent(0, { type: "playCard", instanceId: fresh.inst("tommy").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => fresh.state.players[0]!.battleArea.length === 1);
    expect(fresh.state.memory).toBe(6);
    await digivolveOntoTommy(fresh);
    expect(attackPlayer(fresh)).toMatchObject({ ok: false });
    expect(fresh.perm("tommy").isSuspended).toBe(false);
    expect(fresh.state.players[1]!.security).toHaveLength(3);

    const established = boardWithTommy("battleArea");
    await digivolveOntoTommy(established);
    expect(attackPlayer(established)).toEqual({ ok: true });
    await settle(() => established.state.players[1]!.security.length === 2);
    expect(established.perm("tommy").isSuspended).toBe(true);
  });

  it("keeps the Tamer as a digivolution card that is trashed when the Digimon leaves the field (Q6590)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TOMMY, as: "tommy" }],
          hand: [{ card: "BT18-022", as: "kumamon" }],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const tommyCard = s.perm("tommy").topCard.instanceId;
    expect(digivolveKumamon(s, "tommy")).toEqual({ ok: true });
    await settle(() => s.perm("tommy").topCard.cardId === "BT18-022");
    expect(s.perm("tommy").stack.map(({ instanceId }) => instanceId)).toEqual([tommyCard]);

    await advance(s.engine).verb.deletePermanent([s.perm("tommy").permanentId]);
    await settle(() => s.state.players[0]!.trash.length === 2);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([tommyCard, s.inst("kumamon").instanceId]),
    );
  });

  it("does not gain the [Security] effect of a Tamer in its digivolution cards (Q6591)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TOMMY, as: "tommy" }],
          hand: [{ card: "BT18-022", as: "kumamon" }],
          security: [{ card: TOMMY, as: "securityTommy" }],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(digivolveKumamon(s, "tommy")).toEqual({ ok: true });
    await settle(() => s.perm("tommy").topCard.cardId === "BT18-022");
    await s.ready();

    await advance(s.engine).fire(EffectTiming.SecuritySkill, s.perm("tommy"));
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("tommy").stack.map(({ cardId }) => cardId)).toEqual([TOMMY]);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTommy"));
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.perm("securityTommy").topCard.cardId).toBe(TOMMY);
  });
  it("gains the inherited [When Attacking] effect of a Tamer in its digivolution cards (Q6592)", async () => {
    async function attackWithKumamon(kumamon: { card: string; as: string; under?: string[] }) {
      const s = setupEngine(
        {
          0: { battleArea: [kumamon], deck: [...FILLER] },
          1: {
            battleArea: [{ card: BLUE_ROOKIE, as: "target", under: ["BT1-001", "BT1-003"] }],
            security: 3,
            deck: [...FILLER],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      await s.ready();
      const bottomSourceId = s.perm("target").stack[0]!.instanceId;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("kumamon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.security.length === 2);
      await settle();
      return { s, bottomSourceId };
    }

    const withTommy = await attackWithKumamon({ card: "BT18-022", as: "kumamon", under: [TOMMY] });
    expect(withTommy.s.perm("target").stack.map(({ cardId }) => cardId)).toEqual(["BT1-003"]);
    expect(withTommy.s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(withTommy.bottomSourceId);

    const withoutTamer = await attackWithKumamon({ card: "BT18-022", as: "kumamon" });
    expect(withoutTamer.s.perm("target").stack.map(({ cardId }) => cardId)).toEqual(["BT1-001", "BT1-003"]);
    expect(withoutTamer.s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).not.toContain(
      withoutTamer.bottomSourceId,
    );
  });
});
