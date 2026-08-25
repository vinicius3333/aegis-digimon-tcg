import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT15-016.js";

describe("BT15-016", () => {
  it("restricts an opposing 8000+ DP Digimon or deletes one at 6000 DP or less based on memory", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "Restrict", restriction: "attack", condition: { kind: "memoryAtMost", value: 4 } },
        { kind: "Delete", condition: { kind: "memoryAtLeast", value: 4 } },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "Restrict" }, { kind: "Delete" }],
    });
  });
  it("returns an opposing Digimon with 7000 DP or less on deletion", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [{ kind: "Return", to: "hand", target: { filter: { dp: { op: "lte", value: 7000 } } } }],
    }));

  it("applies both branches at exactly 4 opponent memory, with their exact DP boundaries", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-016", as: "brachiomon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "large", dp: 8000 },
            { card: "BT1-009", as: "small", dp: 6000 },
            { card: "BT1-009", as: "middle", dp: 7000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = -4;
    const smallId = s.perm("small").permanentId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("brachiomon"));
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === smallId));

    expect(observe(s.engine).isRestricted(s.perm("large"), "attack")).toBe(true);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("large").permanentId,
      s.perm("middle").permanentId,
    ]);
  });

  it("when digivolving with memory on its owner's side, applies only the 4-or-less restriction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-013", as: "base" }],
          hand: [{ card: "BT15-016", as: "brachiomon" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "large", dp: 8000 },
            { card: "BT1-009", as: "small", dp: 6000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("brachiomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("large"), "attack"));

    expect(s.state.memory).toBe(4);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(observe(s.engine).isRestricted(s.perm("large"), "attack")).toBe(true);
  });

  it("returns only the exact-boundary 7000-DP opponent when its inherited host is deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT15-016"] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "atBoundary", dp: 7000 },
            { card: "BT1-009", as: "above", dp: 8000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const boundaryCardId = s.perm("atBoundary").topCard.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === boundaryCardId));

    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(boundaryCardId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("above").permanentId,
    ]);
  });
});
