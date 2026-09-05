import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-065.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-065", () => {
  it.each([
    ["BT2-075", false, 4, true],
    ["EX9-030", true, 3, true],
    ["BT1-024", true, 3, false],
  ] as const)(
    "validates real evolution from %s and declines optional revival",
    async (base, alternate, cost, legal) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: base, as: "host" }],
            hand: [{ card: "EX9-065", as: "evo" }],
            deck: ["BT1-048"],
            trash: ["EX9-037"],
          },
        },
        { autoDeclineOptional: true },
      );
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("host").permanentId,
          instanceId: s.inst("evo").instanceId,
          useAlternateCost: alternate,
        }).ok,
      ).toBe(legal);
      await settle();
      expect(s.perm("host").topCard.cardId).toBe(legal ? "EX9-065" : base);
      expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(legal ? [base] : []);
      expect(s.state.memory).toBe(legal ? 5 - cost : 5);
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(legal ? ["BT1-048"] : ["EX9-065"]);
      expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX9-037"]);
      expect(s.state.players[0]!.battleArea).toHaveLength(1);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
  it("Blast Digivolves on an off-color DM level five, plays only an eligible trash card and then blocks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          battleArea: [{ card: "EX9-030", as: "host" }],
          hand: [{ card: "EX9-065", as: "ace" }],
          deck: ["BT1-048"],
          trash: ["BT1-016", "EX9-063", "EX9-010"],
          security: ["BT1-046"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
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
    if (opened?.kind !== "counterWindowOpened") throw new Error("Counter window missing");
    const counter = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("ace").instanceId);
    expect(counter).toBeDefined();
    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: counter!.instanceId,
        effectKey: counter!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.perm("host").topCard.cardId).toBe("EX9-065");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX9-030"]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toEqual(["BT1-048"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-016", "EX9-063"]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["EX9-065", "EX9-010"]);
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("host").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("explicitly declines the optional free play after real play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX9-065", as: "card" }], trash: ["EX9-037"] } },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["EX9-065"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX9-037"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("grants a Ver.4 ally Blocker and Retaliation for a losing block that preserves security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX9-065", as: "source" },
          { card: "EX9-035", as: "ally" },
        ],
        security: ["BT1-046"],
      },
      1: { battleArea: [{ card: "BT1-024", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["EX9-065"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX9-035"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-024"]);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("uses Scapegoat to survive a losing battle without triggering its granted Retaliation", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-065", as: "source", suspended: true },
            { card: "BT1-009", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "BT1-024", as: "attacker", dp: 15000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("source").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["EX9-065"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-024"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("limits its aura to own Ver.4 Digimon and removes the granted keywords when Titamon leaves", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX9-065", as: "source" },
          { card: "EX9-035", as: "matching" },
          { card: "BT1-009", as: "other" },
        ],
      },
      1: { battleArea: [{ card: "EX9-035", as: "opponent" }] },
    });
    await s.ready();
    for (const keyword of ["Blocker", "Retaliation"] as const) {
      expect(observe(s.engine).hasKeyword(s.perm("matching"), keyword)).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("other"), keyword)).toBe(false);
      expect(observe(s.engine).hasKeyword(s.perm("opponent"), keyword)).toBe(false);
    }
    await advance(s.engine).verb.returnToHand([s.perm("source").topCard.instanceId]);
    await settle();
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX9-065"]);
    expect(observe(s.engine).hasKeyword(s.perm("matching"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("matching"), "Retaliation")).toBe(false);
  });
  it("has Blast Digivolve and Scapegoat and plays a level-four-or-lower DM Digimon from trash on play or digivolution", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords).toContainEqual({
      keyword: "BlastDigivolve",
      raw: "＜Blast Digivolve＞",
    });
    expect(
      compiled.effects?.find((entry) => entry.trigger === "Static" && entry.keywords?.length)?.keywords,
    ).toContainEqual({ keyword: "Scapegoat", raw: "＜Scapegoat＞" });
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["trash"],
        target: { filter: { levelComparison: { op: "lte", value: 4 } } },
      });
  });
  it("grants Blocker and Retaliation to all own Ver.4 Digimon", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions ?? [];
    expect(
      actions.find((action) => action.kind === "GainKeyword" && action.keyword?.keyword === "Blocker"),
    ).toBeDefined();
    expect(
      actions.find((action) => action.kind === "GainKeyword" && action.keyword?.keyword === "Retaliation"),
    ).toBeDefined();
  });
  it("keeps both play triggers optional and restricts their free play to own level-four-or-lower DM Digimon in trash", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "PlayWithoutCost",
        optional: true,
        payCost: false,
        from: ["trash"],
        target: {
          count: 1,
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            levelComparison: { op: "lte", value: 4 },
            nameOrTrait: [{ tokens: ["DM"], match: "trait" }],
          },
        },
      });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions).toMatchObject([
      {
        target: {
          count: "all",
          filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ver.4"], match: "trait" }] },
        },
      },
      {
        target: {
          count: "all",
          filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ver.4"], match: "trait" }] },
        },
      },
    ]);
  });
  it("plays a level-four DM from trash and grants both keywords to own Ver.4 Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-035", as: "ver4" }],
          hand: [{ card: "EX9-065", as: "card" }],
          trash: ["BT1-016", "EX9-063", "EX9-001", "EX9-037"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-016", "EX9-063", "EX9-001"]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([
      "EX9-035",
      "EX9-065",
      "EX9-037",
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).hasKeyword(s.perm("ver4"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ver4"), "Retaliation")).toBe(true);
  });
  it("plays a level-four DM Digimon from trash after a real normal digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-075", as: "source" }],
          hand: [{ card: "EX9-065", as: "evo" }],
          deck: ["BT1-048"],
          trash: ["EX9-059"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.memory).toBe(1);
    expect(s.perm("source").topCard.cardId).toBe("EX9-065");
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["BT2-075"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX9-065", "EX9-059"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
