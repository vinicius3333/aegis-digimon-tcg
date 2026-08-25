import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { irNode } from "../../engine/testkit/irNode.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-004.js";

describe("EX10-004 Cupimon compiled contract", () => {
  it("models the inherited Lucemon breeding move effect and shared hand-trash cost", () => {
    const effect = compiled.effects?.[0];
    const move = effect?.actions?.[0];
    expect(effect).toMatchObject({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn" });
    expect(move).toMatchObject({
      kind: "SubTrigger",
      event: "whenMovedFromBreeding",
      sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Lucemon"], match: "name" }] },
    });
    expect(irNode(move).actions).toEqual([
      expect.objectContaining({
        kind: "Draw",
        amount: 1,
        optional: true,
        abortOnDecline: true,
        cost: expect.objectContaining({ kind: "trash" }),
      }),
      expect.objectContaining({
        kind: "GainMemory",
        amount: 1,
        condition: { kind: "ifThisEffectActed", raw: "if you did" },
      }),
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("pays the hand-trash cost after a Lucemon stack moves from breeding, then draws and gains 1 memory", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX10-013", as: "lucemon", under: [{ card: "EX10-004", as: "cupimon" }] },
          hand: [{ card: "BT1-009", as: "discarded" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.phase = Phase.Breeding;
    const memoryBefore = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("lucemon").permanentId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.memory === memoryBefore + 1 &&
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId),
    );

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("discarded").instanceId)).toBe(
      true,
    );
    expect(s.state.memory).toBe(memoryBefore + 1);

    await advance(s.engine).fireSubTrigger("whenMovedFromBreeding", {
      subjectPermanentId: s.perm("lucemon").permanentId,
    });
    await settle(() => false, 30);
    expect(s.state.memory).toBe(memoryBefore + 1);
  });

  it("does not trigger for a non-Lucemon breeding stack", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-009", as: "nonLucemon", under: ["EX10-004"] },
          hand: ["BT1-010"],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.phase = Phase.Breeding;
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("nonLucemon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => false, 60);

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(memoryBefore);
  });

  it("keeps the hand and grants nothing when the cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX10-013", as: "lucemon", under: ["EX10-004"] },
          hand: ["BT1-009"],
          deck: ["BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.phase = Phase.Breeding;
    const memoryBefore = s.state.memory;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("lucemon").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(memoryBefore);
  });
});
