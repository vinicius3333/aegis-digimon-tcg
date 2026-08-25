import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-044.js";
import "./index.js";

describe("BT20-044 Breakdramon", () => {
  it("suspends two opposing Digimon or Tamers and offers an attack on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 2 } },
          { kind: "Attack", optional: true },
        ],
      });
    }
  });

  it("deletes a suspended opposing Digimon or Tamer after a qualifying own Digimon deletes in battle", () => {
    for (const effect of compiled.effects.filter((entry) => entry.trigger === "AllTurns")) {
      expect(effect).toMatchObject({
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenDeletesInBattle",
            sourceFilter: { controller: "mine", kind: ["Digimon"], textContains: ["[Dracomon]", "[Examon]"] },
            fireCondition: { kind: "triggerSourceNotDeletedAtSameTiming" },
            actions: [
              {
                kind: "Delete",
                target: {
                  filter: { controllerDefault: "opponent", suspended: true, kind: ["Digimon", "Tamer"] },
                  count: 1,
                },
              },
            ],
          },
        ],
      });
    }
    expect(compiled.effects.filter((entry) => entry.isInherited)).toHaveLength(1);
  });

  it("has Blocker and suspends exactly two opposing Digimon or Tamers on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT20-044", as: "breakdramon" }] },
        1: {
          battleArea: [
            { card: "BT20-010", as: "first" },
            { card: "BT20-011", as: "second" },
            { card: "BT20-085", as: "third" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("breakdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("first").isSuspended && s.perm("second").isSuspended);
    expect(s.perm("third").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("breakdramon"), "Blocker")).toBe(true);
  });

  it("deletes a second suspended opponent after a qualifying ally wins a battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-044", as: "breakdramon" },
            { card: "BT20-040", dp: 5000, as: "attacker" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT20-010", dp: 1000, suspended: true, as: "battleTarget" },
            { card: "BT20-085", suspended: true, as: "effectTarget" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("battleTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("attacker"));
  });

  it("provides the same deletion watcher from an inherited source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-045", as: "host", under: ["BT20-044"] },
            { card: "BT20-040", dp: 5000, as: "attacker" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT20-010", dp: 1000, suspended: true, as: "battleTarget" },
            { card: "BT20-085", suspended: true, as: "effectTarget" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("battleTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toContain(s.perm("host"));
  });
});
