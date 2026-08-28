import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-092.js";

describe("BT13-092 BT13-092", () => {
  it("matches burst timing and the two When Digivolving clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toContainEqual({
      namesExact: ["Ravemon"],
      cost: 0,
      isAlternate: true,
      burstDigivolve: { returnTamerNamesExact: ["Keenan Crier"] },
    });
    expect(compiled.effects.some((entry) => entry.trigger === "EndOfYourTurn")).toBe(false);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Trash", chooser: "opponent", target: { filter: { controller: "opponent", zone: "hand" }, count: 1 } },
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "opponent",
          condition: { kind: "zoneCount", seat: "opponent", zone: "hand", op: "lte", value: 7 },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
          optional: true,
          cost: {
            kind: "return",
            target: { filter: { zone: "trash", controller: "opponent", kind: ["Digimon"] }, count: 1 },
          },
        },
      ],
    });
  });

  it("loads the compiled implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-092", as: "card" }] } });
    await s.ready();
    expect(s.perm("card").topCard?.cardId).toBe("BT13-092");
  });

  it("rejects a longer Ravemon: Burst Mode host despite an exact payable Keenan Crier", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT13-092", as: "near-host" }, { card: "BT13-102", as: "keenan" }],
        hand: [{ card: "BT13-092", as: "burst" }],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("near-host").permanentId,
        instanceId: s.inst("burst").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("near-host").topCard.cardId).toBe("BT13-092");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("burst").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("keenan"));
  });

  it("does not apply Burst pending trash to a standard Ravemon: Burst Mode digivolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT13-089", as: "base" }],
        hand: [{ card: "BT13-092", as: "card" }],
      },
    });
    s.state.memory = 10;
    const priorTopId = s.perm("base").topCard.instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("card").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-092");
    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    expect(s.perm("base").stack.some((card) => card.instanceId === priorTopId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === priorTopId)).toBe(false);
  });

  it("applies Burst pending trash only after a valid exact Ravemon host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT13-089", as: "base" }, { card: "BT13-102", as: "keenan" }],
        hand: [{ card: "BT13-092", as: "card" }],
      },
    });
    const priorTopId = s.perm("base").topCard.instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("card").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-092");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("keenan").instanceId)).toBe(true);
    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    expect(s.perm("base").stack.some((card) => card.instanceId === priorTopId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === priorTopId)).toBe(true);
  });
});
