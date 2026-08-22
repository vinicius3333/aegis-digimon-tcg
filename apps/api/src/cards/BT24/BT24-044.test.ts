import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-044.js";
import "../index.js";

describe("BT24-044 Muchomon", () => {
  it("suspends either side, searches two distinct printed categories only after suspending your Digimon", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        expect.objectContaining({
          kind: "Suspend",
          optional: true,
          target: { filter: { controllerDefault: "any", levelComparison: { op: "lte", value: 6 } } },
        }),
        expect.objectContaining({
          kind: "RevealAdd",
          revealCount: 3,
          condition: { kind: "lastSuspendedIsMine" },
          add: [{ to: "hand" }, { to: "hand" }],
          rest: "deckBottom",
        }),
      ],
    });
    expect(compiled.effects[1]).toMatchObject({ trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn" });
  });

  it("reveals Shoto and an Avian after suspending its own Digimon", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT24-044", as: "source" }], deck: ["P-133", "ST1-02", "BT1-009"] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "P-133"));

    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["P-133", "ST1-02"]));
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});
