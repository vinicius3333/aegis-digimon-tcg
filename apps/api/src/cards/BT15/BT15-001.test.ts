import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-001.js";

describe("BT15-001", () => {
  it("returns one non-Sea Animal Avian/Bird/Beast/Animal/Sovereign Digimon from trash", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnDeletion", isInherited: true });
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      target: {
        count: 1,
        filter: { zone: "trash", kind: ["Digimon"], excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }] },
      },
    });
  });

  it("returns a qualifying Digimon from trash when the inherited host is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["BT15-001"] }],
          trash: [
            { card: "BT1-012", as: "bird" },
            { card: "BT1-033", as: "seaAnimal" },
            { card: "BT1-009", as: "nonMatch" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => p0.hand.some((card) => card.instanceId === s.inst("bird").instanceId));

    expect(p0.hand.some((card) => card.instanceId === s.inst("bird").instanceId)).toBe(true);
    expect(p0.trash.some((card) => card.instanceId === s.inst("bird").instanceId)).toBe(false);
    expect(p0.trash.some((card) => card.instanceId === s.inst("seaAnimal").instanceId)).toBe(true);
    expect(p0.trash.some((card) => card.instanceId === s.inst("nonMatch").instanceId)).toBe(true);
  });

  it("returns a qualifying Digimon when a public attack deletes the inherited host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", dp: 1000, suspended: true, under: ["BT15-001"] }],
        trash: [{ card: "BT1-012", as: "bird" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 5000 }] },
    });
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("bird").instanceId));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("bird").instanceId)).toBe(true);
  });
});
