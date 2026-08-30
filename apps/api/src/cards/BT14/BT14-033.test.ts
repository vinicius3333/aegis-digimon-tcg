import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-033.js";

describe("BT14-033", () => {
  it("preserves Patamon's catalog identity and full ordered IR", () => {
    expect(getCardDefinition("BT14-033")).toMatchObject({
      nameEn: "Patamon",
      colors: ["Yellow"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Yellow", level: 2, memoryCost: 0 }],
      attributes: ["Data"],
      types: ["Mammal"],
    });
    const actions = compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions ?? [];
    expect(actions).toMatchObject([
      { kind: "Search", filter: { zone: "security" }, count: "all", to: "revealed" },
      {
        kind: "Digivolve",
        optional: true,
        from: ["security"],
        faceDownSecurityOk: true,
        amongPreviousSearch: true,
        payCost: false,
        into: { filter: { colors: ["Yellow"], nameOrTrait: [{ tokens: ["Vaccine"], match: "trait" }] } },
      },
      { kind: "SecurityManipulation", op: "shuffle", controller: "mine" },
      {
        kind: "SecurityManipulation",
        op: "placeAsSecurity",
        optional: true,
        toTop: false,
        condition: { kind: "ifThisEffectDigivolved" },
      },
    ]);
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenAddSecurity", actions: [{ kind: "GainMemory", amount: 1 }] }],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("Q2407 may decline the security digivolution and still shuffles every searched card back", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-033", as: "patamon" }],
          security: [
            { card: "BT14-035", as: "vaccine" },
            { card: "BT1-001", as: "other" },
          ],
          hand: [{ card: "BT14-037", as: "handVaccine" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("patamon").topCard.cardId === "BT14-033");
    expect(s.perm("patamon").topCard.cardId).toBe("BT14-033");
    expect(s.state.players[0]!.security.map((card) => card.cardId).sort()).toEqual(["BT1-001", "BT14-035"]);
    expect(s.state.players[0]!.security.every((card) => card.faceUp === false)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT14-037");
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    assertNoLoudGap(s);
  });

  it("Q2408-Q2410 free-digivolves, draws, finishes the parent effect, then gains inherited memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-033", as: "patamon" }],
          security: [
            { card: "BT14-035", as: "vaccine" },
            { card: "BT1-001", as: "other" },
          ],
          hand: [{ card: "BT14-037", as: "handVaccine" }],
          deck: [{ card: "BT1-002", as: "bonusDraw" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("patamon").topCard.cardId === "BT14-035");
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "BT14-037"));
    expect(s.perm("patamon").stack.map((card) => card.cardId)).toEqual(["BT14-033"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-002");
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.security.at(-1)?.cardId).toBe("BT14-037");
    expect(s.state.memory, JSON.stringify(s.events.filter((event) => event.kind === "memoryChanged"))).toBe(1);
    const parentIndex = s.events.findIndex(
      (event) =>
        event.kind === "effectResolved" && event.sourceCardId === "BT14-033" && event.timing === "OnStartMainPhase",
    );
    const childIndex = s.events.findIndex(
      (event) =>
        event.kind === "effectResolved" && event.sourceCardId === "BT14-035" && event.timing === "WhenDigivolving",
    );
    expect(parentIndex).toBeGreaterThanOrEqual(0);
    if (childIndex >= 0) expect(childIndex).toBeGreaterThan(parentIndex);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    assertNoLoudGap(s);
  });
});
