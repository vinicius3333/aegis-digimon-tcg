import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-090.js";
describe("BT3-090 Mastemon", () => {
  it("trashes both top security cards and plays a low-level card from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-012", as: "base" }],
          hand: [{ card: "BT3-090", as: "evolving" }],
          security: ["BT1-010"],
          trash: [{ card: "BT2-072", as: "played" }],
        },
        1: { security: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p = s.state.players[0] as PlayerState;
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "BT3-090"));
    expect(p.security).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(p.battleArea.some((x) => x.topCard.cardId === "BT2-072")).toBe(true);
  });
});
