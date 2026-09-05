import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./AD1-021.js";

// AD1-021 Marcus Damon & Agumon
// [End of Your Turn] [Once Per Turn] If you have a yellow Digimon with [Agumon] or
// [Greymon] in its name, for the turn, 1 of your [Marcus Damon]s is also treated as
// a 6000 DP Digimon, gains <Rush> and can't digivolve. Then, 1 of your Digimon may attack.
//
// KB sources: Q6101-Q6111 (2026-03-13/2026-05-08)

describe("AD1-021 Marcus Damon & Agumon", () => {
  const compiled = registeredCompiledCards.get("AD1-021");

  it("plays from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "AD1-021", as: "securityMarcus", faceUp: true }] } });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityMarcus"));

    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("securityMarcus").instanceId,
      ),
    ).toBe(true);
  });

  it("is registered as fully covered compiled IR", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("draws and may digivolve for 3 less only when this Tamer suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-021", as: "tamer" },
            { card: "BT12-042", as: "rize" },
          ],
          hand: [{ card: "AD1-016", as: "shine" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;

    await advance(s.engine).verb.suspend([s.perm("tamer").permanentId]);
    await settle(() => s.perm("rize").topCard.cardId === "AD1-016");

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("turns only the chosen Marcus into a restricted 6000 DP Rush Digimon, then attacks once", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-021", as: "marcus" },
            { card: "BT12-034", as: "agumon" },
          ],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("marcus").topCard!.instanceId);

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("marcus"));
    await settle();

    const view = observe(s.engine);
    expect(s.perm("marcus").currentDP).toBe(6000);
    expect(view.hasKeyword(s.perm("marcus"), "Rush")).toBe(true);
    expect(view.isRestricted(s.perm("marcus"), "digivolve")).toBe(true);
    expect(view.hasKeyword(s.perm("agumon"), "Rush")).toBe(false);
    expect(view.isRestricted(s.perm("agumon"), "digivolve")).toBe(false);
    expect(view.hasAttackedThisTurn(s.perm("marcus"))).toBe(true);
    expect(s.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(1);
  });

  it("does not offer the trailing attack without the yellow Agumon/Greymon gate", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "AD1-021", as: "marcus" }] }, 1: { security: ["BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("marcus"));
    await settle();

    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("binds every Marcus grant to one selection and declares exactly one optional attack", () => {
    const endTurn = compiled?.effects.find((effect) => effect.trigger === "EndOfYourTurn");
    expect(endTurn).toBeDefined();
    expect(endTurn?.frequency).toBe("OncePerTurn");
    expect(endTurn?.actions).toHaveLength(6);
    expect(endTurn?.actions[0]).toMatchObject({
      kind: "SelectBind",
      target: {
        bindAs: "chosenMarcus",
        count: 1,
        filter: { controller: "mine", nameOrTrait: [{ tokens: ["Marcus Damon"], match: "name" }] },
      },
    });
    for (const action of endTurn?.actions.slice(1, 5) ?? []) {
      expect(action).toMatchObject({ target: { fromSelectionRef: "chosenMarcus", count: 1 } });
    }
    expect(endTurn?.actions.filter((action) => action.kind === "Attack")).toEqual([
      expect.objectContaining({ kind: "Attack", optional: true }),
    ]);
  });

  it("still draws on suspension but rejects a hand Digimon without Greymon in its name", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-021", as: "tamer" },
            { card: "BT12-042", as: "base" },
          ],
          hand: [{ card: "BT1-010", as: "notGreymon" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.suspend([s.perm("tamer").permanentId]);
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("notGreymon").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.perm("base").topCard.cardId).toBe("BT12-042");
  });
});
