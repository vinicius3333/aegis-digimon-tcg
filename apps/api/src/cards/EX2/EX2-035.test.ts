import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import "./EX2-035.js";
import "./EX2-034.js";
import "./EX2-036.js";
import "./EX2-037.js";
import "./EX2-031.js";
import "./EX2-032.js";

describe("EX2-035 Cyberdramon", () => {
  it("plays Ryo Akiyama from hand for free when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-031", as: "base" }],
          hand: [
            { card: "EX2-035", as: "evolution" },
            { card: "EX2-062", as: "ryo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("ryo").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("ryo").instanceId),
    ).toBe(true);
  });

  it("cannot attack the opponent directly while its controller has no Tamers", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-035", as: "cyberdramon" }] },
      1: { security: ["BT1-001"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("cyberdramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("does not de-digivolve with fewer than two black Tamers", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-036", as: "host", under: ["EX2-035"] }, "EX2-062"] },
      1: { battleArea: [{ card: "EX2-034", as: "target", under: ["EX2-031"] }], security: ["BT1-001"] },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("target").stack).toHaveLength(1);
  });

  it("de-digivolves once with two black Tamers and does not repeat in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-036", under: ["EX2-032", "EX2-035"], as: "host" },
            { card: "EX2-062", as: "ryo" },
            { card: "EX2-063", as: "kazu" },
          ],
        },
        1: {
          battleArea: [{ card: "EX2-034", under: ["EX2-031", "EX2-032"], as: "target" }],
          security: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("target").stack).toHaveLength(1);
    const remainingSourceId = s.perm("target").topCard.instanceId;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.perm("target").topCard.instanceId).toBe(remainingSourceId);
  });
});
