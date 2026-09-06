import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-028.js";
import "./index.js";
import "../BT11/BT11-098.js";

describe("BT20-028 GigaSeadramon", () => {
  it("once per turn plays a level 5 or lower stack card only with the required exact name", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        condition: {
          kind: "selfDigivolutionStackMatchesFilter",
          filter: {
            nameOrTrait: [
              { tokens: ["MetalSeadramon"], match: "nameExact" },
              { tokens: ["X Antibody"], match: "nameExact" },
            ],
          },
        },
        actions: [
          {
            kind: "PlayWithoutCost",
            target: { filter: { levelComparison: { op: "lte", value: 5 } }, source: "thisDigimon" },
            from: ["digivolutionCards"],
            payCost: false,
            optional: true,
          },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"], fromDigivolution: true },
          actions: [{ kind: "DeDigivolve", amount: 2 }],
        },
      ],
    });
    expect(compiled.effects.filter((entry) => entry.keywords?.length)).toHaveLength(3);
  });

  it("plays a level-5 card only from its own qualifying stack and de-digivolves by 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-031", as: "giga", under: ["BT20-026"] },
            { card: "BT20-027", as: "otherHost", under: ["BT20-025"] },
          ],
          hand: [{ card: "BT20-028", as: "gigaEvolution" }],
        },
        1: { battleArea: [{ card: "BT20-017", as: "opponentStack", under: ["BT20-013", "BT20-014"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("giga").permanentId,
        instanceId: s.inst("gigaEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT20-026"));

    expect(s.perm("giga").stack.map((card) => card.cardId)).toEqual(["BT15-031"]);
    expect(s.perm("otherHost").stack.map((card) => card.cardId)).toEqual(["BT20-025"]);
    expect(s.perm("opponentStack").stack).toHaveLength(0);
    expect(s.perm("opponentStack").topCard.cardId).toBe("BT20-013");
    expect(observe(s.engine).keywordAmount(s.perm("giga"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("giga"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("giga"), "Blocker")).toBe(true);
  });

  it("blocks an actual opposing player attack without losing security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-028", as: "giga" }], security: ["BT1-010"] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const attackerId = s.inst("attacker").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("giga").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
    expect(s.perm("giga").isSuspended).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(attackerId);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it.each(["ownHand", "opponentSource"] as const)(
    "does not De-Digivolve for a Digimon played from %s",
    async (route) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT20-028", as: "giga" }], hand: [{ card: "BT20-022", as: "normalPlay" }] },
          1: {
            battleArea: [{ card: "BT20-026", as: "opponentHost", under: ["BT20-024"] }],
            hand: [{ card: "BT11-098", as: "maelstrom" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      const seat = route === "ownHand" ? 0 : 1;
      s.state.turnSeat = seat;
      s.state.memory = 10;
      await s.ready();
      expect(
        s.engine.applyIntent(seat, {
          type: "playCard",
          instanceId: s.inst(route === "ownHand" ? "normalPlay" : "maelstrom").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[seat]!.battleArea.length === 2);
      expect(s.state.players[seat]!.battleArea).toHaveLength(2);
      expect(s.perm("opponentHost").topCard.cardId).toBe("BT20-026");
      expect(s.perm("opponentHost").stack.map((card) => card.cardId)).toEqual(route === "ownHand" ? ["BT20-024"] : []);
    },
  );

  it("does not play a stack card with only an X Antibody-trait source through public evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-025", as: "wingdramon", under: ["BT15-021", "BT20-023"] }],
          hand: [{ card: "BT20-028", as: "giga" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wingdramon").permanentId,
        instanceId: s.inst("giga").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("wingdramon").topCard.cardId === "BT20-028");
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("wingdramon").stack.map((card) => card.cardId)).toEqual(["BT15-021", "BT20-023", "BT20-025"]);
  });

  it("reaches GigaSeadramon from a legal MegaSeadramon/X Antibody stack through public evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-026", as: "mega", under: ["BT20-024"] }],
        hand: [{ card: "BT20-028", as: "giga" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("mega").permanentId,
        instanceId: s.inst("giga").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mega").topCard.cardId === "BT20-028");
    expect(s.perm("mega").topCard.cardId).toBe("BT20-028");
    expect(s.perm("mega").stack.map((card) => card.cardId)).toEqual(["BT20-024", "BT20-026"]);
  });

  it.each([true, false])("offers a feasible source play, accepts %s, and leaves the level-6 source", async (accept) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-031", as: "base", under: ["BT20-022", "BT20-023", "BT20-025"] }],
          hand: [{ card: "BT20-028", as: "giga" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: accept, autoDeclineOptional: !accept },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("giga").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-028");
    await settle();
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(accept ? 2 : 1);
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("BT15-031");
    expect(s.perm("base").stack).toHaveLength(accept ? 3 : 4);
  });

  it("shares the source-play use across evolution and attack, limits its watcher, and resets both next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-026", as: "mega", under: ["BT9-109", "BT20-022", "BT20-023"] }],
          hand: [
            { card: "BT20-028", as: "giga" },
            { card: "BT11-098", as: "maelstrom" },
          ],
          deck: Array(8).fill("BT1-010"),
          security: ["BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT5-086", as: "target", under: ["BT20-008", "BT20-013", "BT20-014", "BT20-017"] }],
          security: Array(4).fill("BT1-010"),
          deck: Array(8).fill("BT1-010"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("mega").permanentId,
        instanceId: s.inst("giga").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "BT20-014");
    expect(s.perm("mega").stack.map((card) => card.cardId)).toEqual(["BT9-109", "BT20-023", "BT20-026"]);
    expect(s.perm("target").topCard.cardId).toBe("BT20-014");
    expect(s.state.memory).toBe(5);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mega").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.perm("mega").stack).toHaveLength(3);
    expect(s.perm("mega").isSuspended).toBe(true);

    // A second actual source play cannot repeat the All Turns De-Digivolve in this turn.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("maelstrom").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("mega").stack.length === 2);
    expect(s.perm("mega").stack.map((card) => card.cardId)).toEqual(["BT9-109", "BT20-026"]);
    expect(s.perm("target").topCard.cardId).toBe("BT20-014");
    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual(["BT20-008", "BT20-013"]);
    expect(s.state.memory).toBe(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("mega").isSuspended).toBe(false); // Reboot at the opponent's unsuspend phase.
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mega").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "combatResolved").length === 2 && !observe(s.engine).isAttacking(),
    );
    expect(s.perm("mega").stack.map((card) => card.cardId)).toEqual(["BT9-109"]);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-026")).toBe(true);
    expect(s.perm("target").topCard.cardId).toBe("BT20-008");
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("accepts X Antibody Proto Form's Rule Name through public evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-023", as: "base", under: ["EX5-070", "BT20-022"] }],
          hand: [
            { card: "BT20-025", as: "wingdramon" },
            { card: "BT20-028", as: "giga" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wingdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-025");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("giga").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-028");
    expect(s.state.players[0]!.battleArea.length).toBe(2);
  });

  it("triggers De-Digivolve when GigaSeadramon itself is played from a source stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-045", as: "host", under: ["BT20-028"] }],
          hand: [{ card: "BT11-098", as: "sourcePlayer" }],
        },
        1: { battleArea: [{ card: "BT20-017", as: "opponent", under: ["BT20-013", "BT20-014"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sourcePlayer").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-028") &&
        s.perm("opponent").stack.length === 0,
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-028")).toBe(true);
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT11-098"));
    expect(s.perm("opponent").topCard.cardId).toBe("BT20-013");
    expect(s.perm("opponent").stack).toHaveLength(0);
    expect(s.state.players[1]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT20-017", "BT20-014"]),
    );
  });
});
