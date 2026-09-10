import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX2-051.js";

const INERT_DECK = ["BT1-009", "BT1-013", "BT1-014"];
const INERT_SECURITY = ["BT1-009", "BT1-013", "BT1-014"];

describe("EX2-051 ADR-07 Palates Head", () => {
  it("matches the catalog and compiles its conditional Main deletion", () => {
    expect(getCardDefinition("EX2-051")).toMatchObject({
      cardId: "EX2-051",
      nameEn: "ADR-07 Palates Head",
      colors: ["White"],
      kinds: ["Digimon"],
      playCost: 6,
      dp: 3000,
      evoCosts: [],
      forms: ["D-Reaper"],
      types: ["Reconnaissance Agent"],
      effectText:
        "[Main] If you have a [Mother D-Reaper] in play, you may suspend this Digimon to delete 1 of your opponent's Digimon with DP less than or equal to this Digimon's DP.",
    });
    const card = runtimeCompiledCard("EX2-051");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled).toEqual(card);
    expect(card?.effects).toMatchObject([
      {
        trigger: "Main",
        actions: [
          {
            kind: "Delete",
            target: {
              filter: {
                controller: "opponent",
                kind: ["Digimon"],
                dp: { op: "lte", relativeToSource: true },
              },
              count: 1,
            },
            condition: {
              kind: "youHave",
              filter: {
                zone: "battleArea",
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["Mother D-Reaper"], match: "nameExact" }],
              },
            },
            cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
            optional: true,
            abortOnDecline: true,
          },
        ],
      },
    ]);
  });

  it("suspends itself and deletes an opposing Digimon at equal DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-051", as: "palates" },
            { card: "EX2-007", as: "mother" },
          ],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: {
          battleArea: [{ card: "EX2-019", dp: 3000, as: "target" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const effects = observe(s.engine).activatableEffects(s.perm("palates")) as Array<{ effectKey: string }>;
    expect(effects).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("palates").topCard.instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "EX2-019"));
    expect(s.perm("palates").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("EX2-019");
  });

  it("does not activate when every opposing Digimon exceeds its DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-051", as: "palates" },
            { card: "EX2-007", as: "mother" },
          ],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { battleArea: [{ card: "EX2-022", as: "tooLarge" }], deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(observe(s.engine).activatableEffects(s.perm("palates"))).toHaveLength(0);
    expect(s.perm("palates").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not activate without its own Mother D-Reaper", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-051", as: "palates" }], deck: INERT_DECK, security: INERT_SECURITY },
        1: { battleArea: [{ card: "EX2-019", as: "target" }], deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).activatableEffects(s.perm("palates"))).toHaveLength(0);
    expect(s.perm("palates").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not treat an opponent's Mother D-Reaper as its own prerequisite", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-051", as: "palates" }], deck: INERT_DECK, security: INERT_SECURITY },
        1: {
          battleArea: [
            { card: "EX2-007", as: "opponentMother" },
            { card: "EX2-019", as: "target" },
          ],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(observe(s.engine).activatableEffects(s.perm("palates"))).toHaveLength(0);
    expect(s.perm("palates").isSuspended).toBe(false);
  });

  it("leaves itself and the target unchanged when the optional activation is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-051", as: "palates" },
            { card: "EX2-007", as: "mother" },
          ],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { battleArea: [{ card: "EX2-019", as: "target" }], deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const effects = observe(s.engine).activatableEffects(s.perm("palates")) as Array<{ effectKey: string }>;
    expect(effects).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("palates").topCard.instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    const optionalDecision = s.decisions.find(({ req }) => req.kind === "optional");
    expect(optionalDecision).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optionalDecision!.req.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("palates").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("is inactive during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-051", as: "palates" },
            { card: "EX2-007", as: "mother" },
          ],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { battleArea: [{ card: "EX2-019", as: "target" }], deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).activatableEffects(s.perm("palates"))).toHaveLength(0);
    expect(s.perm("palates").isSuspended).toBe(false);
  });
});
