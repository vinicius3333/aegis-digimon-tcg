import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-058.js";

describe("EX5-058 Octomon", () => {
  it("registers Fujitsumon's no-unsuspend and mandatory deletion hand-trash clauses", () => {
    expect(registeredCompiledCards.get("TOKEN-Fujitsumon-Token")).toMatchObject({
      effects: [
        { trigger: "Static", actions: [{ kind: "Restrict", restriction: "unsuspend", duration: "permanent" }] },
        {
          trigger: "OnDeletion",
          actions: [{ kind: "Trash", target: { filter: { controller: "mine", zone: "hand" } } }],
        },
      ],
    });
  });
  it("creates or gives an opponent a suspended Fujitsumon token based on the four-Digimon threshold", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "ConditionalBranch",
        ifTrue: [
          {
            kind: "PlayToken",
            payCost: false,
            suspended: true,
            tokens: [{ name: "Fujitsumon Token", color: "Purple", dp: 3000 }],
          },
        ],
        ifFalse: [
          {
            kind: "PlayToken",
            suspended: true,
            placedAs: "opponentDigimon",
            tokens: [{ name: "Fujitsumon Token", color: "Purple", dp: 3000 }],
          },
        ],
        condition: { kind: "totalDigimonCount", op: ">=", value: 4 },
      });
    }
  });
  it("inherits once-per-turn memory when an opponent plays a Digimon by effect", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", sourceFilter: { byEffect: true }, actions: [{ kind: "GainMemory", amount: 1 }] }],
    });
  });

  it("plays a suspended own Fujitsumon token at the four-Digimon boundary", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-058", as: "source" }],
          battleArea: [{ card: "BT1-009" }, { card: "BT1-010" }, { card: "BT1-011" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "TOKEN-Fujitsumon-Token"));
    const token = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "TOKEN-Fujitsumon-Token");
    if (token === undefined) throw new Error("EX5-058 own Fujitsumon token was not created");
    expect(token.isSuspended).toBe(true);
  });

  it("plays a suspended Fujitsumon token to the opponent when there are three or fewer Digimon", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX5-058", as: "source" }] } },
      { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "TOKEN-Fujitsumon-Token"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "TOKEN-Fujitsumon-Token")).toBe(false);
    const token = s.state.players[1]!.battleArea.find((p) => p.topCard.cardId === "TOKEN-Fujitsumon-Token");
    if (token === undefined) throw new Error("EX5-058 opponent Fujitsumon token was not created");
    expect(token.isSuspended).toBe(true);
  });

  it("keeps Fujitsumon suspended when an unsuspend attempt is made", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-058", as: "source" }],
          battleArea: [{ card: "BT1-009" }, { card: "BT1-010" }, { card: "BT1-011" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    await s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "TOKEN-Fujitsumon-Token"));
    const token = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "TOKEN-Fujitsumon-Token")!;
    await advance(s.engine).verb.unsuspend([token.permanentId]);
    expect(token.isSuspended).toBe(true);
  });
});
