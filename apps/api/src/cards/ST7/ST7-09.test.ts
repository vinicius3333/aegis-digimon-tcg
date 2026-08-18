import { describe, expect, it } from "vitest";
import { EffectDuration } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST7-09.js";

describe("ST7-09 Gallantmon", () => {
  it("has Security Attack +1 and deletes an opposing 4000 DP Digimon when attacking", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST7-09", as: "gallant" }] }, 1: { battleArea: ["ST7-04"], security: ["ST7-01"] } },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("gallant"), "SecurityAttack")).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gallant").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("gallant").currentDP).toBe(11000);
  });

  it("gets +3000 DP when its attack effect deletes nothing", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST7-09", as: "gallant" }] }, 1: { security: ["ST7-01"] } },
      { autoOrderTriggers: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gallant").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gallant").currentDP === 14000);
    expect(s.perm("gallant").currentDP).toBe(14000);
  });

  it("does not get +3000 after choosing a target protected from effect deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST7-09", as: "gallant" }] },
        1: { battleArea: [{ card: "ST7-04", as: "protected" }], security: ["ST7-01"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("protected").permanentId,
      "beDeleted",
      EffectDuration.Permanent,
      { byOpponentEffectsOnly: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gallant").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("gallant").currentDP).toBe(11000);
  });
});
