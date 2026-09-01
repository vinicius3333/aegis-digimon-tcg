import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-080.js";
import "../index.js";

describe("BT15-080", () => {
  it("has the printed Blocker keyword", () =>
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Blocker" }] }));
  it("deletes one opposing level 5 or lower Digimon on play and when digivolving", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Delete", target: { filter: { levelComparison: { op: "lte", value: 5 } } } }],
    });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Delete" }] });
  });
  it("repeats the deletion on its own deletion", () =>
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "Delete", target: { filter: { levelComparison: { op: "lte", value: 5 } } } }],
    }));

  it("naturally deletes exactly one opposing level-5-or-lower Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT15-080", as: "venomMyotismon" }] },
        1: {
          battleArea: [
            { card: "BT15-072", as: "level4a" },
            { card: "BT15-076", as: "level5" },
            { card: "BT15-072", as: "level4b" },
            { card: "BT15-079", as: "level6" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("venomMyotismon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.length === 1 && s.state.players[1]!.battleArea.length === 3);

    expect(s.state.players[1]!.battleArea).toHaveLength(3);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("level6").permanentId)).toBe(
      true,
    );
    expect(s.state.players[1]!.trash.filter(({ cardId }) => ["BT15-072", "BT15-076"].includes(cardId))).toHaveLength(1);
  });

  it("naturally repeats the level ceiling when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-076", as: "myotismon" }],
          hand: [{ card: "BT15-080", as: "venomMyotismon" }],
        },
        1: {
          battleArea: [
            { card: "BT15-072", as: "level4" },
            { card: "BT15-079", as: "level6" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("myotismon").permanentId,
        instanceId: s.inst("venomMyotismon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("myotismon").topCard?.cardId === "BT15-080");

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("level6").permanentId);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("level4").instanceId);
  });

  it("naturally deletes one opposing level-5-or-lower Digimon when it is deleted in battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-080", as: "venomMyotismon", suspended: true }] },
        1: {
          battleArea: [
            { card: "BT15-102", as: "attacker", dp: 15000 },
            { card: "BT15-076", as: "deletionTarget" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const deletionTargetPermanentId = s.perm("deletionTarget").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("venomMyotismon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("attacker").permanentId,
    );
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(
      deletionTargetPermanentId,
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("venomMyotismon").instanceId,
    );
  });
});
