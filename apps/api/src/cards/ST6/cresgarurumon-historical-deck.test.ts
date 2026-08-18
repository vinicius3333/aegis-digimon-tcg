import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST6-03.js";
import "./ST6-11.js";
import "./ST6-13.js";

describe("ST6 CresGarurumon historical deck gauntlet", () => {
  it("Digi-Bursts its own level 3 source, immediately plays that card, then checks two security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{
            card: "ST6-13",
            as: "cresgarurumon",
            under: [
              { card: "ST6-11", as: "levelFiveSource" },
              { card: "ST6-03", as: "levelThreeSource" },
            ],
          }],
        },
        1: { security: ["BT1-001", "BT1-002", "BT1-003"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const cresgarurumon = s.perm("cresgarurumon");
    const effects = JSON.parse(cresgarurumon.activatableEffectsJson) as Array<{
      instanceId: string;
      effectKey: string;
    }>;

    expect(observe(s.engine).keywordAmount(cresgarurumon, "SecurityAttack")).toBe(1);
    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: effects[0]!.instanceId,
      effectKey: effects[0]!.effectKey,
    })).toEqual({ ok: true });
    await settle(() =>
      cresgarurumon.stack.length === 0 &&
      s.state.players[0]!.battleArea.some((permanent) =>
        permanent.topCard?.instanceId === s.inst("levelThreeSource").instanceId
      ) &&
      !s.state.players[0]!.trash.some((card) =>
        card.instanceId === s.inst("levelThreeSource").instanceId
      )
    );

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(
      s.inst("levelFiveSource").instanceId,
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(
      s.inst("levelThreeSource").instanceId,
    );

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: cresgarurumon.permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
