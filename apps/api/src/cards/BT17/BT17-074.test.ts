import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT17-074.js";

describe("BT17-074 Eosmon", () => {
  it("plays a white Tamer from hand for the printed cost of 2 when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-044", as: "morphomon", dp: 3000 }],
          hand: [
            { card: "BT17-074", as: "eosmon" },
            { card: "BT17-092", as: "menoa" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("morphomon").permanentId,
        instanceId: s.inst("eosmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT17-092"), 800);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT17-092")).toBe(true);
  });

  it("records complete compiled coverage for the paid Tamer branch", () => {
    const compiled = runtimeCompiledCard("BT17-074")!;
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
