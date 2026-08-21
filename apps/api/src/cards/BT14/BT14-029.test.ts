import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-029.js";

describe("BT14-029", () => {
  it("trashes three opposing sources on digivolution", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: 1, target: { count: 3 } }));
  it("once per turn unsuspends when no opponent Digimon has more sources", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Unsuspend", condition: { kind: "opponentHasNone" } }] }));

  it("trashes one source each from three opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-028", as: "base" }], hand: [{ card: "BT14-029", as: "plesio" }] },
      1: { battleArea: [{ card: "BT1-015", as: "a", under: ["BT1-001"] }, { card: "BT1-015", as: "b", under: ["BT1-002"] }, { card: "BT1-015", as: "c", under: ["BT1-003"] }] },
    }, { autoSelectCards: true });
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("plesio").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.length >= 3);
    expect(s.state.players[1]!.trash.filter((card) => ["BT1-001", "BT1-002", "BT1-003"].includes(card.cardId))).toHaveLength(3);
  });
});
