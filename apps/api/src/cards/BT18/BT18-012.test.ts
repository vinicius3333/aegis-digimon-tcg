import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-012.js";
import "./BT18-014.js";

describe("BT18-012 Grumblemon", () => {
  it("deletes an opposing Digimon at 3000 DP or less on play", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } } },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenDigivolving" });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
    });
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-012", as: "grumblemon" }] },
        1: {
          battleArea: [
            { card: "BT1-030", dp: 3000, as: "small" },
            { card: "BT1-030", dp: 4000, as: "large" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const smallId = s.perm("small").permanentId;
    const largeId = s.perm("large").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("grumblemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === smallId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === smallId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === largeId)).toBe(true);
  });

  it("digivolves from Gigasmon for 0 and resolves the When Digivolving deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-014", as: "gigasmon" }],
          hand: [{ card: "BT18-012", as: "grumblemon" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-030", dp: 3000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    const targetId = s.perm("target").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gigasmon").permanentId,
        instanceId: s.inst("grumblemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));
    expect(s.state.memory).toBe(2);
    expect(s.perm("gigasmon").stack.at(-1)?.cardId).toBe("BT18-014");
  });

  it("deletes once per turn through the inherited When Attacking effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-030", as: "host", under: ["BT18-012"] }] },
        1: {
          battleArea: [
            { card: "BT1-030", dp: 3000, as: "first" },
            { card: "BT1-030", dp: 3000, as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const firstId = s.perm("first").permanentId;
    const secondId = s.perm("second").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === firstId));
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(secondId);
  });
});
