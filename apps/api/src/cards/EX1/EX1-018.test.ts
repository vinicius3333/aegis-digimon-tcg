import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-018.js";

describe("EX1-018 Zudomon", () => {
  it("trashes the bottom digivolution card when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-014", as: "base" }], hand: [{ card: "EX1-018", as: "evo" }] },
        1: { battleArea: [{ card: "BT1-032", as: "target", under: [{ card: "BT1-029", as: "bottom" }, "BT1-030"] }] },
      },
      { autoSelectCards: true },
    );
    const bottomId = s.inst("bottom").instanceId;
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === bottomId));
    expect(s.perm("target").stack).toHaveLength(1);
  });

  it("can attack an unsuspended Digimon only when it has no digivolution cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-018", as: "zudomon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "eligible" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("zudomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("eligible").permanentId },
      }),
    ).toEqual({ ok: true });
  });
});
