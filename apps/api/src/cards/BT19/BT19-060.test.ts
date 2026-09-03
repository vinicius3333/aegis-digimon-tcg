import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT19-060.js";

describe("BT19-060", () => {
  it("preserves the one-or-fewer-Tamers Ryo Akiyama play and inherited DP", () => {
    const card = runtimeCompiledCard("BT19-060");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "PlayWithoutCost",
            target: { filter: { nameOrTrait: [{ tokens: ["Ryo Akiyama"] }] } },
            from: ["hand"],
            payCost: false,
            condition: { kind: "permanentCount", seat: "mine", op: "lte", value: 1, filter: { kind: ["Tamer"] } },
            optional: true,
          },
        ],
      },
      { trigger: "AllTurns", isInherited: true, actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }] },
    ]);
  });

  it("resolves the Ryo Akiyama play from a public evolution intent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-055", as: "base" }],
          hand: [
            { card: "BT19-060", as: "strike" },
            { card: "BT19-086", as: "ryo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("strike").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-086"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-086")).toBe(true);
  });
});
