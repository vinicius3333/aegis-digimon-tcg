import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-070.js";

describe("BT7-070 Wendigomon", () => {
  it("records optional reveal-five processing that trashes only revealed Tamers", () => {
    expect(runtimeCompiledCard("BT7-070")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 5,
              add: [],
              trashFilter: { kind: ["Tamer"] },
              rest: "deckBottom",
              optional: true,
            },
          ],
        },
        {
          trigger: "YourTurn",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [
            { kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] },
          ],
        },
      ],
    });
  });

  it("trashes every revealed Tamer and puts the other revealed cards on the deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-071", as: "base" }],
          hand: [{ card: "BT7-070", as: "evolving" }],
          deck: [
            "BT1-009",
            { card: "BT1-085", as: "tamerOne" },
            { card: "BT1-086", as: "tamerTwo" },
            { card: "BT1-010", as: "digimonTwo" },
            { card: "BT1-011", as: "digimonThree" },
            "BT1-012",
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const mine = s.state.players[0] as PlayerState;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });

    await settle(() => mine.trash.length === 2);
    expect(mine.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("tamerOne").instanceId, s.inst("tamerTwo").instanceId]),
    );
    expect(mine.deck).toHaveLength(3);
  });
});
