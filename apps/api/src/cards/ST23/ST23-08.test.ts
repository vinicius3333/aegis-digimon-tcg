import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST23-08.js";

describe("ST23-08 Murasamemon", () => {
  it("gains 3000 DP when digivolving until the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST23-07", as: "base" }],
          hand: [{ card: "ST23-08", as: "murasamemon" }],
          deck: ["BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("murasamemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "ST23-08" && s.perm("base").currentDP === 10000);
    expect(s.perm("base").topCard?.cardId).toBe("ST23-08");
    expect(s.perm("base").currentDP).toBe(10000);
  });

  it("plays a Glowing Dawn Digimon with its cost reduced by 3 after paying the under-Tamer cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST23-13", as: "tamer", under: [{ card: "BT1-001", as: "cost", faceUp: false }] }],
          hand: [
            { card: "ST23-08", as: "monarchlizamon" },
            { card: "ST23-02", as: "played" },
          ],
          deck: ["BT1-002"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("monarchlizamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId) &&
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard?.instanceId === s.inst("played").instanceId,
        ),
    );

    expect(s.state.memory).toBe(3);
  });

  it("binds inherited unsuspend to the Digimon carrying this card", () => {
    const card = runtimeCompiledCard("ST23-08");
    expect(card?.effects.find((effect) => effect.isInherited)?.actions[0]).toMatchObject({
      kind: "Unsuspend",
      target: { filter: { isSelfRef: true }, isSelf: true },
      cost: { kind: "trashBottomFaceDownUnderTamer" },
    });
  });
});
