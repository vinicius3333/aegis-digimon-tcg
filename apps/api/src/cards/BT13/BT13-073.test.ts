import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-073.js";
import "./BT13-042.js";
import "./BT13-070.js";

describe("BT13-073 QueenChessmon", () => {
  it("keeps Blocker, Chessmon evolution cost 3, and deletion-triggered unsuspend", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toContainEqual(
      expect.objectContaining({ level: 5, names: ["Chessmon"], cost: 3 }),
    );
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ match: "name", tokens: ["Chessmon"] }],
          },
          actions: [{ kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }],
        },
      ],
    });
  });

  it("unsuspends itself when your Chessmon is deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-073", as: "queen" },
          { card: "BT13-070", as: "pawn" },
        ],
      },
    });
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("queen").permanentId]);
    await advance(s.engine).verb.deletePermanent([s.perm("pawn").permanentId]);

    expect(s.perm("queen").isSuspended).toBe(false);
  });

  it("uses the alternate route from a real level-5 Chessmon and rejects a non-Chessmon", async () => {
    const valid = setupEngine({
      0: { battleArea: [{ card: "BT13-042", as: "bishop" }], hand: [{ card: "BT13-073", as: "queen" }] },
    });
    valid.state.memory = 4;
    await valid.ready();
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("bishop").permanentId,
        instanceId: valid.inst("queen").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("bishop").topCard?.cardId === "BT13-073");
    expect(valid.perm("bishop").topCard?.cardId).toBe("BT13-073");

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT13-043", as: "nonChessmon" }], hand: [{ card: "BT13-073", as: "queen" }] },
    });
    invalid.state.memory = 4;
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("nonChessmon").permanentId,
        instanceId: invalid.inst("queen").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
  });

  it("uses Blocker in a real opponent attack block window", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-073", as: "queen" }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
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
    expect(s.events.find((event) => event.kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [s.perm("queen").permanentId],
    });

    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: s.perm("queen").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blocked"));
    expect(s.perm("queen").isSuspended).toBe(true);
  });
});
