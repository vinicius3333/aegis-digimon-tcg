import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
describe("ST21-06", () => {
  it("matches the 6000 DP security placement clause", () => {
    expect(getCardDefinition("ST21-06")?.effectText).toContain("6000 DP or lower");
    const a = runtimeCompiledCard("ST21-06")
      ?.effects.find((x) => x.trigger === "OnPlay")
      ?.actions.find((action) => action.kind === "SecurityManipulation");
    expect(a).toMatchObject({
      kind: "SecurityManipulation",
      toTop: true,
      sourceDpCeilingScaling: { per: 2, unit: "colors", amount: 2000 },
    });
  });
  it("retains both play and digivolve Adventure triggers", () => {
    const e = runtimeCompiledCard("ST21-06")?.effects ?? [];
    expect(e.some((x) => x.trigger === "OnPlay")).toBe(true);
    expect(e.some((x) => x.trigger === "WhenDigivolving")).toBe(true);
  });

  it("raises the security-placement DP limit by 2000 for two Tamer colors", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST21-05", as: "base" },
            { card: "ST21-12", as: "twoColorTamer" },
          ],
          hand: [{ card: "ST21-06", as: "magna" }],
        },
        1: { battleArea: [{ card: "ST21-09", as: "sevenKTarget" }], security: ["BT1-001"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("magna").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.some((card) => card.cardId === "ST21-09"));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "ST21-09")).toBe(false);
    expect(s.state.players[1]!.security[0]?.cardId).toBe("ST21-09");
  });

  it("keeps a Digimon above the unscaled 6000 DP boundary in play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST21-06", as: "magna" }] },
        1: { battleArea: [{ card: "ST21-09", as: "above", dp: 6001 }], security: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("magna").instanceId })).toEqual({
      ok: true,
    });
    await (s.engine as unknown as { mainVerbChain: Promise<unknown> }).mainVerbChain;
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("magna").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("above").permanentId)).toBe(
      true,
    );
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
