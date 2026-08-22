import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-033.js";
import "../index.js";

const HARPYMON = "BT16-033";
const NEUTRAL = "BT1-009";

describe("BT16-033 Harpymon", () => {
  it("carries Armor Purge and the exact Hawkmon evolution route", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Armor Purge" }],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Hawkmon"], cost: 2, isAlternate: true }]);
  });

  it("gains 1 memory when this Digimon checks with 3 security cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: HARPYMON, as: "harpymon" }],
        security: [NEUTRAL, NEUTRAL, NEUTRAL],
      },
      1: { security: [NEUTRAL] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("harpymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]?.security).toHaveLength(3);
  });

  it("recovers 1 instead when this Digimon checks with 2 security cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: HARPYMON, as: "harpymon" }],
        deck: [NEUTRAL],
        security: [NEUTRAL, NEUTRAL],
      },
      1: { security: [NEUTRAL] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("harpymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]?.security).toHaveLength(3);
    expect(s.state.players[0]?.deck).toHaveLength(0);
  });
});
