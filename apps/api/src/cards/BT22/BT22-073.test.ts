import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT22-073.js";

type DeletePrimitives = {
  primitives: { deletePermanent(ids: string[], cause: "byBattle" | "byEffect"): Promise<unknown> };
};

describe("BT22-073 Crescemon", () => {
  it("has intrinsic Jamming while in the battle area", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT22-073", as: "crescemon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("crescemon"), "Jamming")).toBe(true);
  });

  it("prevents a battle deletion by trashing exactly 2 same-level digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT22-072",
              as: "host",
              under: ["BT22-073", "BT22-074"],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await (s.engine as unknown as DeletePrimitives).primitives.deletePermanent(
      [s.perm("host").permanentId],
      "byBattle",
    );
    await settle();

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("host").permanentId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT22-073", "BT22-074"]),
    );
  });

  it("does not prevent a second deletion in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT22-072",
              as: "host",
              under: ["BT22-073", "BT22-074", "BT1-038", "BT1-039"],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;

    await (s.engine as unknown as DeletePrimitives).primitives.deletePermanent([hostId], "byBattle");
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(true);

    await (s.engine as unknown as DeletePrimitives).primitives.deletePermanent([hostId], "byBattle");
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(false);
  });

  it("draws, trashes, and restricts one opposing Digimon when the evolved stack has a same-level pair", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-072", as: "host", under: ["BT22-010"] }],
          hand: [{ card: "BT22-073", as: "evolution" }],
          deck: ["BT22-071"],
        },
        1: { battleArea: [{ card: "BT22-071", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const targetId = s.perm("target").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(targetId, "suspend"));

    expect(s.state.players[0]!.trash.length).toBeGreaterThanOrEqual(1);
    expect(observe(s.engine).isRestricted(targetId, "suspend")).toBe(true);
  });

  it("prevents a public battle deletion by trashing two same-level sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-072", as: "host", dp: 1000, suspended: true, under: ["BT22-073", "BT22-074"] }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId));

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT22-073", "BT22-074"]),
    );
  });
});
