import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST23-01.js";

describe("ST23-01 Kekkomon", () => {
  it("attacking spends the bottom face-down under-Tamer card and digivolves into Glowing Dawn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-003", as: "kekkomon", under: [{ card: "ST23-01", faceUp: true }] },
            { card: "ST23-13", as: "tamer", under: [{ card: "BT1-001", faceUp: false }] },
          ],
          hand: [{ card: "ST23-02", as: "liollmon" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.state.memory = 10;
    const bottomUnderTamer = s.perm("tamer").stack[0]!.instanceId;
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("kekkomon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST23-02"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST23-02")).toBe(true);
    expect(s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "ST23-13")?.stack.some((card) => card.instanceId === bottomUnderTamer)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === bottomUnderTamer)).toBe(true);
  });

  it("proves the inherited once-per-turn attack digivolution contract", () => {
    const inherited = runtimeCompiledCard("ST23-01")?.effects.find((effect) => effect.isInherited);
    expect(inherited).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          reduceCost: 2,
          optional: true,
          into: { nameOrTrait: [{ match: "trait", tokens: ["Glowing Dawn"] }] },
          cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine" },
        },
      ],
    });
  });
});
