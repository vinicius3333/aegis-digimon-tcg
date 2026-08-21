import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const KAZUCHIMON = "BT17-040";
// BT1-057 is Sirenmon (Lv.5 Yellow Digimon) — valid base for Kazuchimon (Lv.6 Yellow/Green evo, cost 4).
const BASE_DIGIMON = "BT1-057";
// AD1-001 is Greymon (Lv.4 Red Digimon) — valid opponent Digimon to be suspended.
const OPP_DIGIMON = "AD1-001";

describe("BT17-040 Kazuchimon — [When Digivolving] suspend opponent Digimon", () => {
  it("[When Digivolving] suspends 1 opponent Digimon unconditionally", async () => {
    // Owner has a base Digimon with [Pulsemon] in text — but any Lv.5 base works for
    // the alternate digivolve; we just need a Lv.5 Pulsemon. However, for simplicity we
    // test the mechanic using a normal digivolve onto a Lv.5 base. Use existing Lv.5 card.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BASE_DIGIMON, dp: 5000, as: "base" }],
          hand: [{ card: KAZUCHIMON, as: "kazuchimon" }],
        },
        1: { battleArea: [{ card: OPP_DIGIMON, dp: 3000, as: "oppDigimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const oppPermId = s.perm("oppDigimon").permanentId;
    const kazuchimonId = s.inst("kazuchimon").instanceId;
    const basePermId = s.perm("base").permanentId;
    s.state.memory = 6;

    const res = s.engine.applyIntent(0, {
      type: "digivolve",
      instanceId: kazuchimonId,
      permanentId: basePermId,
    });
    expect(res.ok).toBe(true);

    await settle(() => !p0.hand.some((c) => c.instanceId === kazuchimonId), 600);

    // Wait for the WhenDigivolving effect to fire (async after digivolve).
    await settle(() => {
      const oppPerm = p1.battleArea.find((p) => p.permanentId === oppPermId);
      return oppPerm === undefined || oppPerm.isSuspended;
    }, 800);

    // The opponent's Digimon should have been suspended.
    const oppPerm = p1.battleArea.find((p) => p.permanentId === oppPermId);
    if (oppPerm !== undefined) {
      expect(oppPerm.isSuspended).toBe(true);
    }
  });

  it("registers complete compiled coverage for the end-turn attack clause", async () => {
    const { runtimeCompiledCard } = await import("../../engine/effects/interpreter.js");
    const compiled = runtimeCompiledCard(KAZUCHIMON)!;
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
