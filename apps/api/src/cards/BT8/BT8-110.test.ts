import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-012.js";
import "./BT8-110.js";

describe("BT8-110 Armor Texture!", () => {
  it("waives its color requirement, sheds an Armor Form, and unsuspends only the Digimon it evolved", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-012", as: "armor", under: ["BT1-064"] },
            { card: "BT1-009", as: "evolutionTarget", suspended: true },
          ],
          hand: [
            { card: "BT8-110", as: "option" },
            { card: "BT8-012", as: "nextArmor" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("evolutionTarget").topCard.cardId === "BT8-012" &&
        s.perm("evolutionTarget").isSuspended === false &&
        s.state.players[0]!.trash.some((card) => card.cardId === "BT8-110"),
    );

    expect(s.perm("armor").topCard.cardId).toBe("BT1-064");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT8-012")).toBe(true);
    expect(s.perm("evolutionTarget").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT8-110")).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("does not unsuspend any Digimon when the optional evolution is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-012", as: "armor", under: ["BT1-064"] },
            { card: "BT1-009", as: "evolutionTarget", suspended: true },
          ],
          hand: [
            { card: "BT8-110", as: "option" },
            { card: "BT8-012", as: "nextArmor" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT8-110"));

    expect(s.perm("armor").topCard.cardId).toBe("BT1-064");
    expect(s.perm("evolutionTarget").topCard.cardId).toBe("BT1-009");
    expect(s.perm("evolutionTarget").isSuspended).toBe(true);
  });
});
