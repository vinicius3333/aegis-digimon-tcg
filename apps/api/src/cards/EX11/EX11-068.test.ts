import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-068.js";
import "../BT20/BT20-072.js";
import "./EX11-051.js";

describe("EX11-068 Violet Inboots", () => {
  it("preserves the printed Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-068")).toMatchObject({
      nameEn: "Violet Inboots",
      colors: ["Purple"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("sets memory to 3 at the start of your turn from 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-068", as: "violet" }] } });
    s.state.memory = 2;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("violet"));
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });

  it("suspends itself, draws, trashes, and evolves the Execute attacker with cost reduced by 2 (Q5938)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-068", as: "violet" },
            { card: "BT20-072", as: "executor" },
          ],
          hand: [
            { card: "BT1-090", as: "discard" },
            { card: "EX11-051", as: "evolution" },
          ],
          deck: ["AD1-001"],
        },
        1: { security: ["BT1-091"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;

    await s.ready();
    await advance(s.engine).fireSubTrigger("whenAttacking", {
      attackerPermanentId: s.perm("executor").permanentId,
      attackMechanic: "Execute",
    });

    expect(s.perm("violet").isSuspended).toBe(true);
    expect(s.perm("executor").topCard?.cardId).toBe("EX11-051");
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("may decline the suspend payment and receives none of the attack rewards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-068", as: "violet" },
            { card: "BT20-072", as: "executor" },
          ],
          hand: ["BT1-090"],
          deck: ["AD1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenAttacking", {
      attackerPermanentId: s.perm("executor").permanentId,
      attackMechanic: "Execute",
    });
    expect(s.perm("violet").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("publishes full exclusive IR scoped to the triggering attacker", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions).toMatchObject([
      {
        kind: "SubTrigger",
        sourceFilter: { nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] },
        actions: [
          { kind: "Draw", cost: { kind: "suspend" }, optional: true, abortOnDecline: true },
          { kind: "Trash", target: { filter: { zone: "hand" } } },
          {
            kind: "Digivolve",
            target: { sourceRef: "triggerSubject" },
            from: ["hand"],
            payCost: true,
            reduceCost: 2,
            optional: true,
            condition: { kind: "triggerAttackBy", keyword: "Execute" },
          },
        ],
      },
    ]);
  });
});
