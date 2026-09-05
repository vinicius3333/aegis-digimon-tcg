import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-006.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-006", () => {
  it("may pay a hidden source but does not evolve when the revealed card is ineligible", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-007", as: "source", under: [{ card: "BT1-009", faceUp: false }, "EX9-006"] }] },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("source").topCard.cardId).toBe("EX9-007");
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["EX9-006"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("inherits a once-per-turn Ver.5 digivolution from trash by trashing its bottom face-down digivolution card", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          from: ["trash"],
          payCost: true,
          reduceCost: 1,
          optional: true,
          cost: {
            kind: "trash",
            target: {
              count: 1,
              filter: {
                zone: "digivolutionCards",
                controller: "mine",
                faceDown: true,
                position: "bottom",
                sameHost: true,
                hostFilter: { isSelfRef: true },
              },
            },
          },
        },
      ],
    }));

  it("trashes the bottom face-down source and digivolves into a Ver.5 from trash on attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-007", as: "source", under: [{ card: "BT1-009", faceUp: false }, "EX9-006"] }],
          trash: ["EX9-010"],
        },
        1: { security: ["EX9-071"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "EX9-010" && s.state.players[1]!.security.length === 0);

    expect(s.perm("source").topCard?.cardId).toBe("EX9-010");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
    // EX9-010 costs 2 (reduced by 1), then EX9-071's [Security] effect gains 1 memory
    // for the defending player, moving the gauge from 2 to 1 for player 0.
    expect(s.state.memory).toBe(1);
    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(["EX9-006", "EX9-007"]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX9-010")).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("can decline the optional attack evolution without trashing its face-down source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-007", as: "source", under: [{ card: "BT1-009", faceUp: false }, "EX9-006"] }],
          trash: ["EX9-010"],
        },
        1: { security: ["BT1-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("source").topCard?.cardId).toBe("EX9-007");
    expect(s.perm("source").stack.map((card) => [card.cardId, card.faceUp])).toEqual([
      ["BT1-009", false],
      ["EX9-006", true],
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX9-010"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not use an upper face-down card when the bottom card is face up", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX9-007",
              as: "source",
              under: [{ card: "BT1-009", faceUp: true }, { card: "BT1-010", faceUp: false }, "EX9-006"],
            },
          ],
          trash: ["EX9-010"],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("source").topCard?.cardId).toBe("EX9-007");
    expect(s.perm("source").stack.map((card) => [card.cardId, card.faceUp])).toEqual([
      ["BT1-009", true],
      ["BT1-010", false],
      ["EX9-006", true],
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX9-010"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q4748 reuses the card just trashed as the Ver.5 evolution target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-007", as: "source", under: [{ card: "EX9-010", faceUp: false }, "EX9-006"] }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "EX9-010" && s.state.players[1]!.security.length === 0);

    expect(s.perm("source").topCard?.cardId).toBe("EX9-010");
    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(["EX9-006", "EX9-007"]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX9-010")).toBe(false);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("enforces the inherited Once Per Turn limit across two attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX9-007",
              as: "source",
              under: [{ card: "BT1-009", faceUp: false }, { card: "BT1-010", faceUp: false }, "EX9-006"],
            },
          ],
          trash: ["EX9-010", "EX9-043"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 10000 }], security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "EX9-010" && s.state.players[1]!.security.length === 1);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX9-043", "BT1-009"]);
    const stackAfterFirst = s.perm("source").stack.map(({ instanceId }) => instanceId);

    await advance(s.engine).verb.unsuspend([s.perm("source").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("source").topCard?.cardId).toBe("EX9-010");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX9-043", "BT1-009"]);
    expect(s.perm("source").stack.map(({ instanceId }) => instanceId)).toEqual(stackAfterFirst);
    expect(s.state.memory).toBe(4);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
