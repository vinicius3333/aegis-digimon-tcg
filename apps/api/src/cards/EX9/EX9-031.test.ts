import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-031.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-031", () => {
  it("resolves Security and the active player's check effect before the inherited choice (Q4786)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST3-10", as: "host", under: ["EX9-031"] }],
        security: ["ST2-13"],
      },
      1: {
        battleArea: [
          { card: "BT16-033", as: "attacker" },
          { card: "BT1-009", as: "peer" },
        ],
        security: ["BT1-045", "BT1-046", "BT1-010"],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    expect(s.state.pendingDecision?.kind).toBe("chooseTargets");
    expect(s.decisions.at(-1)?.seat).toBe(0);
    // Hammer Spark gives the defender 2; Harpymon gives the active player 1.
    expect(s.state.memory).toBe(2);
    expect(s.events.filter((event) => event.kind === "memoryChanged").map(({ from, to }) => [from, to])).toEqual([
      [3, 1],
      [1, 2],
    ]);
    expect(s.perm("attacker").currentDP).toBe(5000);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("attacker").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("attacker").currentDP).toBe(1000);
    expect(s.perm("peer").currentDP).toBe(3000);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["ST2-13"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    { base: "BT3-063", cost: 3, legal: true },
    { base: "EX9-039", cost: 4, legal: true },
    { base: "BT1-071", cost: 0, legal: false },
    { base: "BT13-065", cost: 0, legal: false },
  ])("checks the independent alternate route from $base", async ({ base, cost, legal }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: base, as: "host" }],
          hand: [{ card: "EX9-031", as: "evo" }],
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
        useAlternateCost: true,
      }).ok,
    ).toBe(legal);
    await settle();
    expect(s.perm("host").topCard.cardId).toBe(legal ? "EX9-031" : base);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(legal ? [base] : []);
    expect(s.state.memory).toBe(5 - cost);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(legal ? ["BT1-046"] : ["EX9-031"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(legal ? [] : ["BT1-046"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("shares paid recovery between real digivolution and attack despite a second payable source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT1-051",
              as: "host",
              under: [
                { card: "BT1-009", faceUp: false },
                { card: "BT1-012", faceUp: false },
              ],
            },
          ],
          hand: [{ card: "EX9-031", as: "evo" }],
          deck: ["BT1-046", "BT1-045", "BT1-010"],
        },
        1: { security: ["BT1-045", "BT1-046"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-045"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").stack.map(({ cardId, faceUp }) => [cardId, faceUp])).toEqual([
      ["BT1-012", false],
      ["BT1-051", true],
    ]);
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-045"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    { base: "EX9-029", memory: 2 },
    { base: "BT1-051", memory: 1 },
  ])("counts only hidden sources and requires Ver.3 on $base", async ({ base, memory }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: base, as: "host", under: [{ card: "BT1-009", faceUp: false }, "BT1-045"] }],
          hand: [{ card: "EX9-031", as: "evo" }],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").topCard.cardId).toBe("EX9-031");
    expect(s.state.memory).toBe(memory);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-045", base]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("reduces Ver.3 digivolution cost and has Security A. +1", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static" && entry.actions.length > 0)).toMatchObject({
      actions: [{ kind: "Replacement", actions: [{ mode: "reduceCost", amount: 1 }] }],
    });
    expect(
      compiled.effects?.find((entry) => entry.keywords?.some((keyword) => keyword.keyword === "SecurityAttack"))
        ?.keywords,
    ).toContainEqual({ keyword: "SecurityAttack", amount: 1, raw: "＜Security A. +1＞" });
  });
  it("recovers on digivolving or attacking by trashing a bottom face-down source", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SecurityManipulation",
            op: "addTop",
            amount: 1,
            cost: {
              kind: "trash",
              target: {
                filter: {
                  zone: "digivolutionCards",
                  faceDown: true,
                  position: "bottom",
                  hostFilter: { isSelfRef: true },
                },
              },
            },
          },
        ],
      });
  });
  it("inherits an opposing -4000 DP response when security is removed", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved" }],
    }));

  it("skips the bottom face-up source, pays the lowest hidden source and checks twice (Q4785)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX9-031",
              as: "source",
              under: ["BT1-051", { card: "BT1-009", faceUp: false }, { card: "BT1-012", faceUp: false }],
            },
            { card: "BT1-010", as: "other", under: [{ card: "BT1-011", faceUp: false }] },
          ],
          deck: ["BT1-090"],
          security: ["BT1-045"],
        },
        1: { security: ["BT1-045", "BT1-046"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const source = s.perm("source");
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: source.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle();
    expect(source.stack.map(({ cardId, faceUp }) => [cardId, faceUp])).toEqual([
      ["BT1-051", true],
      ["BT1-012", false],
    ]);
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-090", "BT1-045"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId, faceUp }) => [cardId, faceUp])).toEqual([["BT1-009", true]]);
    expect(s.perm("other").stack.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-045", "BT1-046"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("reduces a real Ver.3 digivolution by one for each face-down source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX9-029",
              as: "source",
              under: [
                { card: "BT1-009", faceUp: false },
                { card: "BT1-010", faceUp: false },
              ],
            },
          ],
          hand: [{ card: "EX9-031", as: "evo" }],
          deck: ["BT1-046"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.memory).toBe(3);
    expect(s.perm("source").stack.map((card) => [card.cardId, card.faceUp])).toEqual([
      ["BT1-009", false],
      ["BT1-010", false],
      ["EX9-029", true],
    ]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("inherits -4000 DP on an opposing Digimon when the host removes security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST3-10", as: "host", under: ["EX9-031"] }], security: ["BT1-090"] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.trashFromSecurity(0, 1);
    await settle(() => s.perm("target").currentDP !== 5000);
    expect(s.perm("target").currentDP).toBe(1000);
  });

  it("applies inherited -4000 only once for two security removals and expires at turn end", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST3-10", as: "host", under: ["EX9-031"] }], security: ["BT1-090", "BT1-090"] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 6000 }] },
      },
      { autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(0, 1);
    await settle(() => s.perm("target").currentDP !== 6000);
    expect(s.perm("target").currentDP).toBe(2000);

    await advance(s.engine).verb.trashFromSecurity(0, 1);
    await settle();
    expect(s.perm("target").currentDP).toBe(2000);
    expect(s.state.players[0]!.security).toHaveLength(0);

    await advance(s.engine).runTurn(0);
    expect(s.perm("target").currentDP).toBe(6000);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
