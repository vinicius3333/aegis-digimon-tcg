import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-006.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-006 Yaamon", () => {
  it("inherits once-per-turn free Dark Dragon/Evil Dragon evolution from trash when your hand has four or fewer cards", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          from: ["trash"],
          payCost: false,
          optional: true,
          condition: { kind: "zoneCount", zone: "hand", op: "lte", value: 4 },
        },
      ],
    }));

  it("may free-digivolve a legal purple host into a matching card from trash when it attacks", async () => {
    const s = setupEngine(
      {
        0: {
          hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          trash: ["BT11-079"],
          battleArea: [{ card: "BT11-075", dp: 5000, as: "host", under: ["EX7-006"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.perm("host").topCard?.cardId === "BT11-079");
    expect(s.perm("host").topCard?.cardId).toBe("BT11-079");
  });

  it("does not activate when the hand exceeds four cards", async () => {
    const s = setupEngine({
      0: {
        hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        trash: ["BT11-079"],
        battleArea: [{ card: "BT11-075", dp: 5000, as: "host", under: ["EX7-006"] }],
      },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => false, 20);

    expect(s.perm("host").topCard?.cardId).toBe("BT11-075");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT11-079")).toBe(true);
  });
});
