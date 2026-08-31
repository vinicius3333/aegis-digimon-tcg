import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
describe("ST21-05", () => {
  it("matches the Adventure Tamer play clause", () => {
    expect(getCardDefinition("ST21-05")?.effectText).toContain("1 or fewer Tamers");
    const a = runtimeCompiledCard("ST21-05")?.effects.find((x) => x.trigger === "WhenDigivolving")?.actions[0];
    expect(a).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      condition: { kind: "permanentCount" },
    });
  });
  it("gives exactly one opposing Digimon minus 2000 DP once per turn", () => {
    const e = runtimeCompiledCard("ST21-05")?.effects.find((x) => x.trigger === "WhenAttacking");
    expect(e).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn", target: { count: 1 } }],
    });
  });

  it("free-plays an ADVENTURE Tamer when digivolving with one or fewer Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST21-02", as: "base" }],
          hand: [
            { card: "ST21-05", as: "angemon" },
            { card: "ST21-12", as: "adventureTamer" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const tamerId = s.inst("adventureTamer").instanceId;
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("angemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === tamerId));

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === tamerId)).toBe(true);
    expect(s.state.memory).toBe(0);
  });
});
