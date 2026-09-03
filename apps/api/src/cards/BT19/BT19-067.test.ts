import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT19-067.js";

describe("BT19-067", () => {
  it("preserves the one-or-fewer-Tamers purple Tamer trash play and inherited Retaliation", () => {
    const card = runtimeCompiledCard("BT19-067");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "PlayWithoutCost",
            target: { filter: { kind: ["Tamer"], colors: ["Purple"], playCostLte: 4 } },
            from: ["trash"],
            payCost: false,
            condition: { kind: "permanentCount", seat: "mine", op: "lte", value: 1, filter: { kind: ["Tamer"] } },
            optional: true,
          },
        ],
      },
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "Retaliation" }] },
    ]);
  });

  it("resolves the trash Tamer play from a public play intent", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT19-067", as: "imp" }], trash: ["BT18-093"] } },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
      },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("imp").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT18-093"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT18-093")).toBe(true);
  });
});
