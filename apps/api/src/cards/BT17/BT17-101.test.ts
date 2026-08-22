import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { compiled } from "./BT17-101.js";
import "./index.js";

// A3 for BT17-101 (Fenriloogamon: Takemikazuchi, Purple Lv.7):
//   [When Digivolving] 1 of your opponent's Digimon gets -16000 DP for the turn. If DNA
//     digivolving, you may set the memory to 3 on your opponent's side. Then, if this
//     Digimon has a Tamer in its digivolution cards, gain 1 memory and <Recovery +1 (Deck)>.
//   [When Attacking] By trashing the top card of your security stack, trash the top card
//     of your opponent's security stack.
//
// Test: [When Attacking] trashes opponent's top security when owner spends a security card.

const FENRILOOGAMON = "BT17-101";

describe("BT17-101 Fenriloogamon: Takemikazuchi — [When Attacking] security trash", () => {
  it("models the Trash trigger for a played level 6 Pulsemon-text Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(effect).toMatchObject({ isFromTrash: true });
    expect(effect?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        levels: [6],
        nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }],
      },
      actions: [{ kind: "DnaDigivolve", materials: { count: 2 }, optional: true }],
    });
  });

  it("keeps the Tamer recovery branch independent from the DNA condition", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions[1]).toMatchObject({ kind: "SetMemory", condition: { kind: "isDnaDigivolving" } });
    expect(effect?.actions[2]).toMatchObject({
      kind: "GainMemory",
      condition: { kind: "selfDigivolutionStackMatchesFilter", filter: { kind: ["Tamer"] } },
    });
    expect(effect?.actions[3]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Recovery", amount: 1 } });
  });

  it("retains the handwritten opponent-memory assignment", () => {
    const runtime = runtimeCompiledCard(FENRILOOGAMON)!;
    const whenDigivolving = runtime.effects.find((effect) => effect.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions[1]).toMatchObject({ kind: "SetMemory", value: 3 });
  });

  it("[When Attacking] trashes own top security to trash opponent's top security", async () => {
    // Seat 0 is the turn player.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: FENRILOOGAMON, dp: 12000, as: "fenri" }],
          // p0 needs 1 security card (cost to trigger the [When Attacking] effect).
          security: ["AD1-001"],
        },
        // p1 has 1 security card (the one we expect to be trashed).
        1: { security: [{ card: "AD1-001", as: "oppSecurity" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const p0 = s.state.players[0];
    const p1 = s.state.players[1];
    s.state.turnSeat = 0;
    const fenriId = s.perm("fenri").permanentId;
    const oppSecId = s.inst("oppSecurity").instanceId;

    // p1 is the attack target (player attack, no battle Digimon needed).
    // Fenriloogamon attacks p1 directly.
    s.state.memory = 10;

    const res = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: fenriId,
      target: { kind: "player" },
    });
    expect(res.ok).toBe(true);

    // Wait until p1's security is empty (opponent's top security was trashed).
    await settle(() => p1?.security.length === 0, 800);

    // Opponent's security card should be trashed (the [When Attacking] effect fires).
    expect(p1?.security.some((c) => c.instanceId === oppSecId)).toBe(false);
    // It should be in p1's trash.
    expect(p1?.trash.some((c) => c.instanceId === oppSecId)).toBe(true);
    // p0's security was spent too.
    expect(p0?.security.length).toBe(0);
  });
});
