import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-035.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-035", () => {
  it("reveals three, adds one DM and places one Ver.4 under a DM", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "placeUnder" },
      ],
    }));
  it("inherits once-per-turn suspension of an opposing Digimon when attacking", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Suspend", target: { filter: { controller: "opponent" } } }],
    }));

  it("adds a DM and places the Ver.4 reveal face-down under a DM Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-035", as: "source" },
            { card: "EX9-034", as: "host" },
          ],
          deck: ["EX9-034", "EX9-035", "EX9-035", "BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.stack.some((card) => card.faceUp === false)),
    );
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX9-034")).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.stack.some((card) => card.faceUp === false)),
    ).toBe(true);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009", "EX9-035"]);
  });

  it("suspends an opponent only on the first attack even when that target is unsuspended again", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-071", as: "host", under: ["EX9-035"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], security: ["BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId, s.perm("opponent").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("opponent").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
