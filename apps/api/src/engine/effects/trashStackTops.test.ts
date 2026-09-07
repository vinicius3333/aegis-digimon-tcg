import { EffectDuration } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../testkit/harness.js";
import "../../cards/index.js";
import { internalsOf } from "../testkit/internals.js";

describe("trashStackTops primitive", () => {
  it("preserves a promoted Digi-Egg's printed DP when it has DP", async () => {
    // Mechanism boundary for a promoted Digi-Egg with printed DP; unlike an
    // ordinary Digi-Egg, Mother D-Reaper is not an invalid no-DP remnant.
    const s = setupEngine({ 0: { battleArea: [{ card: "BT21-021", as: "host", under: ["EX2-007"] }] } });
    await s.ready();
    await internalsOf(s.engine).primitives.trashStackTops(s.perm("host").permanentId, 1, { byEffectSeat: 1 });
    expect(s.perm("host").topCard.cardId).toBe("EX2-007");
    expect(s.perm("host").baseDP).toBe(15000);
    expect(s.perm("host").currentDP).toBe(15000);
    expect(s.perm("host").invalidNoDpStackTop).toBe(false);
  });
  it("trashes from the current top and promotes at most the requested number", async () => {
    const s = setupEngine({
      1: {
        battleArea: [
          {
            card: "BT21-026",
            as: "host",
            under: ["BT21-010", "BT21-019", "BT21-022"],
          },
        ],
      },
    });
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const topId = s.perm("host").topCard.instanceId;
    const nextId = s.perm("host").stack.at(-1)!.instanceId;
    const moved = await internalsOf(s.engine).primitives.trashStackTops(hostId, 2, { byEffectSeat: 0 });

    expect(moved.map((card) => card.instanceId)).toEqual([topId, nextId]);
    expect(s.perm("host").topCard.cardId).toBe("BT21-019");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT21-010"]);
  });

  it("crosses the level-3 floor and promotes a bottom Digi-Egg unlike De-Digivolve", async () => {
    const s = setupEngine({
      1: {
        battleArea: [
          {
            card: "BT21-019",
            as: "host",
            under: ["BT21-001", "BT21-010"],
          },
        ],
      },
    });
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const moved = await internalsOf(s.engine).primitives.trashStackTops(hostId, 10, { byEffectSeat: 0 });

    expect(moved).toHaveLength(2);
    expect(s.perm("host").topCard.cardId).toBe("BT21-001");
    expect(s.perm("host").stack).toHaveLength(0);
  });

  it("respects an opponent stack-trash lock while ignoring cantBeDeDigivolved", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-019", as: "host", under: ["BT21-010"] }],
      },
    });
    await s.ready();
    const internals = internalsOf(s.engine);
    const hostId = s.perm("host").permanentId;
    internals.continuous.addRestriction(hostId, "cantBeDeDigivolved", EffectDuration.Permanent);
    internals.continuous.addStackTrashLock(hostId, EffectDuration.Permanent);
    const moved = await internals.primitives.trashStackTops(hostId, 1, { byEffectSeat: 1 });

    expect(moved).toHaveLength(0);
    expect(s.perm("host").topCard.cardId).toBe("BT21-019");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT21-010"]);
    const ownMoved = await internals.primitives.trashStackTops(hostId, 1, { byEffectSeat: 0 });
    expect(ownMoved).toHaveLength(1);
    expect(s.perm("host").topCard.cardId).toBe("BT21-010");
  });

  it("does not emit OnDeletion when a Digimon top is peeled", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-021", as: "host", under: ["BT21-011"] },
            { card: "BT1-085", as: "tai" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const peeledId = s.perm("host").topCard.instanceId;
    const moved = await internalsOf(s.engine).primitives.trashStackTops(hostId, 1, { byEffectSeat: 0 });

    expect(moved.map((card) => card.instanceId)).toEqual([peeledId]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === peeledId)).toBe(true);
    expect(s.perm("tai").stack).toHaveLength(0);
    expect(s.perm("host").topCard.cardId).toBe("BT21-011");
  });

  it("applies Overflow when an ACE is peeled", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-060", as: "ace", under: ["BT21-026"] }] },
    });
    s.state.memory = 0;
    await s.ready();
    await internalsOf(s.engine).primitives.trashStackTops(s.perm("ace").permanentId, 1, { byEffectSeat: 0 });

    expect(s.state.memory).toBe(-5);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT20-060")).toBe(true);
  });

  it("marks an invalid promoted Option for rule trash rather than deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-021", as: "host", under: ["BT9-109"] }] },
    });
    await s.ready();
    await internalsOf(s.engine).primitives.trashStackTops(s.perm("host").permanentId, 1, { byEffectSeat: 0 });

    expect(s.perm("host").topCard.cardId).toBe("BT9-109");
    expect(s.perm("host").invalidNoDpStackTop).toBe(true);
  });
});
