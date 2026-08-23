import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-003.js";
import "../index.js";

describe("BT16-003", () => {
  it("has inherited Blocker during the opponent's turn when it has two colors", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      keywords: [{ keyword: "Blocker" }],
      condition: { kind: "selfColorCount", value: 2 },
    }));

  it("grants Blocker to a multicolor host during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-007", as: "host", under: ["BT16-003"] }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    const continuous = (s.engine as unknown as { continuous: { hasKeyword: (id: string, keyword: string) => boolean } })
      .continuous;
    expect(continuous.hasKeyword(s.perm("host").permanentId, "Blocker")).toBe(true);
  });

  it("does not grant Blocker to a one-color host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-006", as: "host", under: ["BT16-003"] }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    const continuous = (s.engine as unknown as { continuous: { hasKeyword: (id: string, keyword: string) => boolean } })
      .continuous;
    expect(continuous.hasKeyword(s.perm("host").permanentId, "Blocker")).toBe(false);
  });
});
