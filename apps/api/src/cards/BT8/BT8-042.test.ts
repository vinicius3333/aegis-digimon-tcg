import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-042.js";

describe("BT8-042 Shakkoumon", () => {
  it("recovers at 5 security while keeping the second branch DNA-only", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "base" }],
          hand: [{ card: "BT8-042", as: "evolving" }],
          deck: ["BT1-048", "BT1-049"],
          security: ["BT1-050", "BT1-051", "BT1-052", "BT1-053", "BT1-054"],
        },
        1: { battleArea: [{ card: "BT1-015", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT8-042"));
    expect(s.state.players[0]!.security).toHaveLength(6);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("DNA digivolves from yellow and blue level 4s for 0, then returns a Digimon within the recovered security count", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-039", as: "yellowMaterial" },
            { card: "BT8-026", as: "blueMaterial" },
          ],
          hand: [{ card: "BT8-042", as: "shakkoumon" }],
          deck: ["BT8-034", "BT8-037"],
          security: ["BT8-035", "BT8-036"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "levelThree" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    const levelThreeInstanceId = s.perm("levelThree").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("yellowMaterial").permanentId, s.perm("blueMaterial").permanentId],
        instanceId: s.inst("shakkoumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === levelThreeInstanceId));

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.security).toHaveLength(3);
  });

  it("gives an inherited -3000 DP when its host attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-032", as: "host", under: ["BT8-042"] }] },
        1: { battleArea: [{ card: "BT2-047", as: "target" }], security: ["BT8-034"] },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);

    expect(s.perm("target").currentDP).toBe(3000);
  });
});
