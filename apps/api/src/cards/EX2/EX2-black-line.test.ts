import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import "./EX2-032.js";
import "./EX2-035.js";

describe("EX2 mixed black Tamer and Cyborg line", () => {
  it("stacks Strikedramon memory and Cyberdramon de-digivolve with two black Tamers", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-036", under: ["EX2-032", "EX2-035"], as: "attacker" },
          { card: "EX2-062", as: "ryo" },
          { card: "EX2-063", as: "kazu" },
        ],
      },
      1: {
        battleArea: [{ card: "EX2-034", under: ["EX2-031"], as: "opponent" }],
        security: ["BT1-001"],
      },
    }, { autoDeclineOptional: true, autoOrderTriggers: true, autoSelectCards: true });
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.memory === 4 && s.perm("opponent").stack.length === 0);

    expect(s.state.memory).toBe(4);
    expect(s.perm("opponent").topCard.cardId).toBe("EX2-031");
    expect(s.perm("opponent").stack).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("does not count non-black Tamers toward the two-Tamer gate", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-036", under: ["EX2-032", "EX2-035"], as: "attacker" },
          { card: "EX2-060", as: "rika" },
          { card: "EX2-061", as: "henry" },
        ],
      },
      1: {
        battleArea: [{ card: "EX2-034", under: ["EX2-031"], as: "opponent" }],
        security: ["BT1-001"],
      },
    }, { autoDeclineOptional: true, autoOrderTriggers: true, autoSelectCards: true });
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.memory).toBe(3);
    expect(s.perm("opponent").topCard.cardId).toBe("EX2-034");
    expect(s.perm("opponent").stack).toHaveLength(1);
    assertNoLoudGap(s);
  });
});
