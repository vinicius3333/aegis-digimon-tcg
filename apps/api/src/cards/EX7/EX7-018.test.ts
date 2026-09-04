import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-018.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX7-018 Gekomon", () => {
  it("draws one on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Draw",
      amount: 1,
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "Draw",
      amount: 1,
    });
  });
  it("inherits Jamming", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Jamming"));

  it("draws one card on play", async () => {
    const s = setupEngine({ 0: { deck: ["BT1-009"], battleArea: [{ card: "EX7-018", as: "geko" }] } });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("geko"));
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand[0]!.cardId).toBe("BT1-009");
  });

  it("draws one card on a real digivolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-015", as: "base" }],
        hand: [{ card: "EX7-018", as: "geko" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("geko").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
  });

  it("grants inherited Jamming to its host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX7-018"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });
});
