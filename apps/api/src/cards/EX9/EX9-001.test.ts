import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-001.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-001", () => {
  it("inherits a once-per-turn attack digivolution into a Ver.1 Digimon from hand with cost reduced by 1", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: true,
          reduceCost: 1,
          optional: true,
          target: { filter: { digivolutionCards: "hasFaceDown" } },
        },
      ],
    }));

  it("behaviorally digivolves the attacking Digimon into a Ver.1 from hand for the reduced cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-050", as: "attacker", under: ["EX9-001", { card: "BT1-009", faceUp: false }] }],
          hand: ["EX9-053"],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 2;
    await s.ready();

    const attacker = s.perm("attacker");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.perm("attacker").topCard?.cardId === "EX9-053");
    expect(s.perm("attacker").topCard?.cardId).toBe("EX9-053");
    expect(s.state.memory).toBe(0);
  });

  it("can decline the optional attack evolution without paying or changing the stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-050", as: "attacker", under: ["EX9-001", { card: "BT1-009", faceUp: false }] }],
          hand: ["EX9-053"],
        },
        1: { security: ["BT1-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("attacker").topCard?.cardId).toBe("EX9-050");
    expect(s.perm("attacker").stack.map((card) => [card.cardId, card.faceUp])).toEqual([
      ["EX9-001", true],
      ["BT1-009", false],
    ]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX9-053"]);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("enforces the inherited Once Per Turn limit across two attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-050", as: "attacker", under: ["EX9-001", { card: "BT1-009", faceUp: false }] }],
          hand: ["EX9-053", "EX9-013"],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard?.cardId === "EX9-053" && s.state.players[1]!.security.length === 1);

    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("attacker").topCard?.cardId).toBe("EX9-053");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX9-013"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("rejects a legal non-Ver.1 evolution candidate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-050", as: "attacker", under: ["EX9-001", { card: "BT1-009", faceUp: false }] }],
          hand: ["BT10-064"],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("attacker").topCard?.cardId).toBe("EX9-050");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT10-064"]);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    { ruling: "Q4751", host: "EX9-008", evolution: "EX9-009", cost: 2, targetDp: 1000 },
    { ruling: "Q4752", host: "EX9-010", evolution: "EX9-011", cost: 4, targetDp: 5000 },
  ])(
    "does not activate Raid newly inherited after $ruling attack evolution",
    async ({ host, evolution, cost, targetDp }) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: host, as: "attacker", under: ["EX9-001", { card: "BT1-009", faceUp: false }] }],
            hand: [evolution],
          },
          1: {
            battleArea: [{ card: "BT1-009", as: "redirect", dp: targetDp }],
            security: ["BT1-001"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      s.state.memory = cost + 1;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("attacker").topCard?.cardId === evolution && s.state.players[1]!.security.length === 0);

      expect(s.perm("attacker").topCard?.cardId).toBe(evolution);
      expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(true);
      expect(s.state.players[1]!.security).toHaveLength(0);
      expect(s.state.memory).toBe(2);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("digivolves when the reduced cost crosses memory to the opponent's side", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-050", as: "attacker", under: ["EX9-001", { card: "BT1-009", faceUp: false }] }],
          hand: ["EX9-053"],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard?.cardId === "EX9-053");
    expect(s.perm("attacker").topCard?.cardId).toBe("EX9-053");
    expect(s.state.memory).toBe(-1);
  });

  it("does not activate without a face-down digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-050", as: "attacker", under: ["EX9-001", "BT1-009"] }],
          hand: ["EX9-053"],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("attacker").topCard?.cardId).toBe("EX9-050");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX9-053")).toBe(true);
    expect(s.state.memory).toBe(5);
  });
});
