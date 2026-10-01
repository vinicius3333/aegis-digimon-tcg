import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-063.js";
import "./index.js";
import "../BT7/BT7-086.js";
import "../BT7/BT7-091.js";
import "../ST16/ST16-07.js";

const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];

describe("BT18-063 Beetlemon", () => {
  it("prevents opponent-effect deletion after digivolving", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[2]).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Replacement",
          leaveCause: "otherThanYourEffect",
          actions: [{ kind: "PlayWithoutCost", fromOwnDigivolutionStack: true }],
        },
      ],
    });
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-057", as: "base" }], hand: [{ card: "BT18-063", as: "beetlemon" }] },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("beetlemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT18-063");
    await settle(() => observe(s.engine).isRestricted(s.perm("base"), "beDeleted"));

    expect(observe(s.engine).isRestricted(s.perm("base"), "beDeleted")).toBe(true);
    s.state.turnSeat = 1;
    expect(await advance(s.engine).verb.deletePermanent([s.perm("base").permanentId], "byEffect")).toBe(0);
    assertNoLoudGap(s);
  });

  it("Q2993/Q2995 digivolves from J.P. for two, draws, and retains the Tamer as a digivolution card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-091", as: "jp", enteredThisTurn: true }],
        hand: [{ card: "BT18-063", as: "beetlemon" }],
        deck: ["BT1-009"],
      },
      1: { security: ["BT1-010"] },
    });
    s.state.turnCount = 1;
    s.perm("jp").enterFieldTurnCount = 1;
    s.state.memory = 5;
    const handBefore = s.state.players[0]!.hand.length;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("jp").permanentId,
        instanceId: s.inst("beetlemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("jp").topCard.cardId === "BT18-063");

    expect(s.state.memory).toBe(3);
    expect(s.perm("jp").stack.map(({ cardId }) => cardId)).toContain("BT18-091");
    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("jp").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
    expect(s.perm("jp").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("digivolves from MetalKabuterimon for zero", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-067", as: "metalKabuterimon" }],
        hand: [{ card: "BT18-063", as: "beetlemon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("metalKabuterimon").permanentId,
        instanceId: s.inst("beetlemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("metalKabuterimon").topCard.cardId === "BT18-063");
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });

  it("when attacking evolves a friendly Digimon into a black/yellow Hybrid for one less", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-063", as: "attacker" },
            { card: "BT18-059", as: "base" },
          ],
          hand: [{ card: "BT18-063", as: "destination" }],
          deck: ["BT1-009"],
        },
        1: { security: ["BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("base").topCard!.instanceId, s.inst("destination").instanceId);
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT18-063");
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toContain("BT18-059");
    assertNoLoudGap(s);
  });

  it("plays only an inherited-effect Tamer from its host when an opposing effect makes it leave", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-078", as: "host", under: ["BT18-063", "BT18-091", "BT18-093"] },
            { card: "BT1-078", as: "other", under: ["BT18-088"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT18-091"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT18-091")).toBe(true);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT18-093")).toBe(false);
    expect(s.perm("other").stack.map(({ cardId }) => cardId)).toEqual(["BT18-088"]);

    const ownEffect = setupEngine(
      { 0: { battleArea: [{ card: "BT1-078", as: "host", under: ["BT18-063", "BT18-091"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await ownEffect.ready();
    expect(await advance(ownEffect.engine).verb.deletePermanent([ownEffect.perm("host").permanentId], "byEffect")).toBe(
      1,
    );
    expect(ownEffect.state.players[0]!.battleArea).toHaveLength(0);
    expect(ownEffect.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-078", "BT18-063", "BT18-091"]),
    );
    assertNoLoudGap(s);
    assertNoLoudGap(ownEffect);
  });
});

describe("BT18-063 Beetlemon — KB Q&A rulings", () => {
  it("lets the player choose the order of the deleted Digimon's [On Deletion] and the played Tamer's [On Play] (Q2994)", async () => {
    for (const firstCardId of ["ST16-07", "BT7-086"]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "ST16-07", as: "meramon", under: ["BT18-063", { card: "BT7-086", as: "tommy" }] }],
            deck: [...FILLER],
          },
          1: {
            battleArea: [{ card: "BT1-078", as: "opponentDigimon", under: ["BT1-009", "BT1-013", "BT1-009"] }],
            deck: [...FILLER],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: [firstCardId] },
      );
      s.state.turnSeat = 1;
      await s.ready();
      const driver = advance(s.engine);
      driver.verb.enterEffectResolution(1, ["Digimon"]);
      expect(await driver.verb.deletePermanent([s.perm("meramon").permanentId], "byEffect")).toBe(1);
      await settle(() => s.state.pendingDecision === undefined);
      driver.verb.leaveEffectResolution();

      expect(s.perm("tommy").topCard.cardId).toBe("BT7-086");
      expect(s.perm("opponentDigimon").stack).toHaveLength(0);
      const orderRequests = s.decisions.filter(
        ({ seat, req }) =>
          seat === 0 &&
          req.kind === "orderTriggers" &&
          ["ST16-07", "BT7-086"].every((cardId) => req.options?.triggerCardIds?.includes(cardId)),
      );
      expect(orderRequests).toHaveLength(1);
      const resolvedOrder = s.events.flatMap((event) =>
        event.kind === "effectResolved" && (event.sourceCardId === "ST16-07" || event.sourceCardId === "BT7-086")
          ? [event.sourceCardId]
          : [],
      );
      expect(resolvedOrder).toEqual(firstCardId === "ST16-07" ? ["ST16-07", "BT7-086"] : ["BT7-086", "ST16-07"]);
    }
  });

  it("cannot attack with a Beetlemon that digivolved from a J.P. Shibayama played this turn (Q6633)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-091", as: "establishedJp" }],
        hand: [
          { card: "BT18-091", as: "newJp" },
          { card: "BT18-063", as: "beetlemonOnNewJp" },
          { card: "BT18-063", as: "beetlemonOnEstablishedJp" },
        ],
        deck: [...FILLER],
      },
      1: { security: ["BT1-009", "BT1-013"], deck: [...FILLER] },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("newJp").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    for (const [jp, beetlemon] of [
      ["newJp", "beetlemonOnNewJp"],
      ["establishedJp", "beetlemonOnEstablishedJp"],
    ] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm(jp).permanentId,
          instanceId: s.inst(beetlemon).instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm(jp).topCard.cardId === "BT18-063");
    }

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("newJp").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
    expect(s.perm("newJp").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("establishedJp").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    expect(s.perm("establishedJp").isSuspended).toBe(true);
  });

  it("treats a Tamer placed under the Digimon as a digivolution card and trashes it when the Digimon leaves (Q6634)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-091", as: "jp" }],
        hand: [{ card: "BT18-063", as: "beetlemon" }],
        deck: [...FILLER],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("jp").permanentId,
        instanceId: s.inst("beetlemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("jp").topCard.cardId === "BT18-063");
    expect(s.perm("jp").stack.map(({ cardId }) => cardId)).toEqual(["BT18-091"]);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("jp").permanentId], "byEffect")).toBe(1);

    const player = s.state.players[0]!;
    expect(player.battleArea).toHaveLength(0);
    expect(player.trash.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["BT18-063", "BT18-091"]));
    assertNoLoudGap(s);
  });

  it("does not give the Digimon the [Security] effect in a stacked Tamer's lower text (Q6635)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "BT7-091", as: "stackedKoichi" }] }],
          deck: [...FILLER],
        },
        1: { security: [{ card: "BT7-091", as: "securityKoichi" }], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT7-091"));

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.instanceId)).toEqual([
      s.inst("securityKoichi").instanceId,
    ]);
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("stackedKoichi").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    const securityTriggerSeats = s.events.flatMap((event) =>
      event.kind === "effectTriggered" && event.sourceCardId === "BT7-091" && event.timing === "Security"
        ? [event.seat]
        : [],
    );
    expect(securityTriggerSeats).toEqual([1]);
  });

  it("gives the Digimon the inherited effect in a stacked Tamer's lower text (Q6636)", async () => {
    for (const under of [["BT7-091"], ["BT1-013"]]) {
      const s = setupEngine(
        { 0: { battleArea: [{ card: "BT1-009", as: "host", under }], deck: [...FILLER] } },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 3;
      await s.ready();

      expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
      await settle(() => s.state.pendingDecision === undefined);

      expect(s.state.memory).toBe(under[0] === "BT7-091" ? 4 : 3);
    }
  });
});
