import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-027.js";

describe("EX11-027 Maquinamon", () => {
  it("reveals Maquinamon cards, bottoms the rest, and links this Digimon to another Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-012", as: "ally", dp: 3000 }],
          hand: [{ card: "EX11-027", as: "maquinamon" }],
          deck: ["EX11-073", "BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("maquinamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ally").linked.length === 1, 600);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX11-073")).toBe(true);
    expect(s.perm("ally").linked).toHaveLength(1);
  });

  it("recognizes a card with [Maquinamon] in its effect text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-012", as: "ally", dp: 3000 }],
          hand: [{ card: "EX11-027", as: "maquinamon" }],
          deck: ["EX11-033", "BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("maquinamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX11-033"), 600);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX11-033")).toBe(true);
  });

  it("has no residual metadata after the link behavior is implemented", () => {
    const compiled = runtimeCompiledCard("EX11-027")!;
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" }],
    });
  });
});
