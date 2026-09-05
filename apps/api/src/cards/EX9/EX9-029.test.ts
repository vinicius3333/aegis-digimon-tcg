import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-029.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-029", () => {
  it.each([
    { base: "BT1-048", alternate: false, legal: true },
    { base: "BT1-009", alternate: true, legal: false },
  ])("checks the evolution route from $base", async ({ base, alternate, legal }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: base, as: "host" }],
          hand: [{ card: "EX9-029", as: "evo" }],
          deck: ["BT1-046"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: alternate,
      }).ok,
    ).toBe(legal);
    await settle();
    expect(s.perm("host").topCard.cardId).toBe(legal ? "EX9-029" : base);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(legal ? [base] : []);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(legal ? ["BT1-046"] : ["EX9-029"]);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(legal ? 3 : 5);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("has Training and once-per-turn attacks or digivolutions add the top security card after placing a hand card underneath", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.actions).toContainEqual(
      expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Training" } }),
    );
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SecurityManipulation",
            op: "addTop",
            postCostCondition: { kind: "securityAtMostSelfFaceDownDigivolutionCards" },
            cost: { kind: "place", faceDown: true, destination: "digivolutionStack" },
          },
        ],
      });
    }
  });
  it("inherits once-per-turn -2000 DP against an opposing Digimon when attacking", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" }],
    }));

  it("places a hand card face down and adds the deck top to security after attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-029", as: "source" }], hand: ["BT1-046"], deck: ["BT1-090"], security: [] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000, suspended: true }], security: ["BT1-048"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    const source = s.perm("source");
    const target = s.perm("target");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: source.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(source.stack).toHaveLength(1);
    expect(source.stack[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(target.currentDP).toBe(5000);
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-090"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("keeps the hand and security unchanged when the optional attack cost is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-029", as: "source" }], hand: ["BT1-046"], deck: ["BT1-090"], security: [] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 10000, suspended: true }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-046")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-090"]);
    expect(s.perm("target").currentDP).toBe(10000);
  });

  it("activates Training through the public effect intent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-029", as: "source" }], deck: ["BT1-090", "BT1-046"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const source = s.perm("source");
    const training = observe(s.engine)
      .activatableEffects(source)
      .find(({ instanceId }) => instanceId === source.topCard.instanceId);
    expect(training).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: source.topCard.instanceId,
        effectKey: training!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(source.isSuspended).toBe(true);
    expect(source.stack.map(({ cardId }) => cardId)).toEqual(["BT1-090"]);
    expect(source.stack[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("runs the When Digivolving recovery from a legal Ver.3 DM stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-034", as: "host" }],
          hand: [
            { card: "EX9-029", as: "evo" },
            { card: "BT1-010", as: "payment" },
          ],
          deck: ["BT1-046", "BT1-090"],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["BT1-010", "EX9-034"]);
    expect(s.perm("host").stack[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-090", "BT1-009"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("shares the recovery Once Per Turn budget between When Digivolving and When Attacking", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-034", as: "host" }],
          hand: [
            { card: "EX9-029", as: "evo" },
            { card: "BT1-010", as: "digivolvePayment" },
            { card: "BT1-011", as: "attackPayment" },
          ],
          deck: ["BT1-046", "BT1-090", "BT1-048"],
          security: [],
        },
        1: { battleArea: [{ card: "BT1-037", as: "target", dp: 3000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("digivolvePayment").instanceId);
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle();

    const stackAfterDigivolve = s.perm("host").stack.map(({ instanceId }) => instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual(stackAfterDigivolve);
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-090"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-011", "BT1-046"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-037"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("still accepts the placement cost when security is not at most the face-down stack count", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-029", as: "source", under: [{ card: "EX9-022", faceUp: false }] }],
          hand: ["BT1-046"],
          deck: ["BT1-090"],
          security: ["BT1-090", "BT1-090", "BT1-090"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 1000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    const source = s.perm("source");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: source.permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(source.stack.map((card) => card.cardId)).toEqual(["BT1-046", "EX9-022"]);
    expect(source.stack[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-090"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("applies inherited -2000 only once across two real attacks and expires it at turn end", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-057", as: "host", under: ["EX9-029"] }], deck: ["BT1-009", "BT1-009"] },
        1: { battleArea: [{ card: "BT1-037", as: "target" }], security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.state.players[1]!.security).toHaveLength(1);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.state.players[1]!.security).toHaveLength(0);
    await advance(s.engine).runTurn(0);
    expect(s.perm("target").currentDP).toBe(6000);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
