import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-001.js";

describe("EX8-001", () => {
  it("inherits a once-per-turn attack deletion against an opposing Digimon with 3000 DP or less when it has Tyrannomon or Dinosaur", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Delete",
          target: { count: 1, filter: { dp: { op: "lte", value: 3000 } } },
          condition: { kind: "anyOf" },
        },
      ],
    }));

  it("deletes an opposing 3000 DP Digimon when the inherited host has the Dinosaur trait", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", as: "host", under: ["EX8-001"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    const target = s.perm("target");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.includes(target));
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("deletes an opposing Digimon when the inherited host has Tyrannomon in its name", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-016", as: "host", under: ["EX8-001"] }] },
      1: { battleArea: [{ card: "BT1-011", as: "target" }] },
    });
    const target = s.perm("target");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.includes(target));
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-011")).toBe(true);
  });

  it("does not delete a 5000 DP Digimon at the inherited threshold", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", as: "host", under: ["EX8-001"] }] },
      1: { battleArea: [{ card: "AD1-001", as: "target" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
