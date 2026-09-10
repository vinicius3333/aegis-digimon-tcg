import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX3-022.js";
import { compiled } from "./EX3-015.js";

describe("EX3-015 Crabmon", () => {
  it("matches the catalog identity and the complete typed IR", () => {
    expect(getCardDefinition("EX3-015")).toMatchObject({
      cardId: "EX3-015",
      nameEn: "Crabmon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Crustacean"],
      imageId: "EX3-015",
    });
    expect(getCardDefinition("EX3-015")!.effectText).toContain("1 of your blue Digimon gains ＜Jamming＞ for the turn");
    expect(getCardDefinition("EX3-015")!.effectText).toContain(
      "place 1 blue level 5 or lower Digimon card from your hand under that Digimon as its bottom digivolution card",
    );
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "SelectBind",
              target: {
                filter: { controller: "mine", kind: ["Digimon"], colors: ["Blue"] },
                count: 1,
                bindAs: "jammingTarget",
              },
            },
            {
              kind: "GainKeyword",
              target: { fromSelectionRef: "jammingTarget", filter: {}, count: 1 },
              keyword: { keyword: "Jamming", raw: "＜Jamming＞" },
              duration: "forTheTurn",
            },
            {
              kind: "PlaceUnder",
              target: {
                filter: {
                  zone: "hand",
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  colors: ["Blue"],
                  levelComparison: { op: "lte", value: 5 },
                },
                count: 1,
              },
              underSelectionRef: "jammingTarget",
              position: "bottom",
              optional: true,
              condition: { kind: "playedFromZone", zone: "digivolutionCards" },
            },
          ],
        },
      ],
    });
  });

  it("publishes a sourced action containing only the controller's blue Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-018", as: "blue" },
          { card: "BT1-009", as: "red" },
        ],
        hand: [{ card: "EX3-015", as: "crabmon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crabmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const decision = s.state.pendingDecision!;
    const payload = JSON.parse(decision.payloadJson) as { candidateInstanceIds: string[]; min: number; max: number };
    expect(s.decisions.at(-1)!.req.sourceCardId).toBe("EX3-015");
    expect(payload).toMatchObject({ min: 1, max: 1 });
    expect(payload.candidateInstanceIds).toContain(s.perm("blue").permanentId);
    expect(payload.candidateInstanceIds).not.toContain(s.perm("red").permanentId);
  });

  it("grants Jamming for the turn but does not place a hand card when played from hand", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-018", as: "recipient" }],
          hand: [
            { card: "EX3-015", as: "crabmon" },
            { card: "BT1-038", as: "blueLevel5" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("recipient").permanentId);
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("crabmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("recipient"), "Jamming"));

    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Jamming")).toBe(true);
    expect(s.perm("recipient").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("blueLevel5").instanceId)).toBe(
      true,
    );
  });

  it("digivolves from the printed blue level-2 route and rejects a red level-2 source", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-003", as: "blueEgg" },
        hand: [{ card: "EX3-015", as: "crabmon" }],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueEgg").permanentId,
        instanceId: s.inst("crabmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX3-015");
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.breeding?.stack.map(({ cardId }) => cardId)).toEqual(["BT1-003"]);

    const invalid = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "redEgg" },
        hand: [{ card: "EX3-015", as: "crabmon" }],
      },
    });
    invalid.state.memory = 1;
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("redEgg").permanentId,
        instanceId: invalid.inst("crabmon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(invalid.state.players[0]!.breeding?.topCard?.cardId).toBe("BT1-001");
    expect(invalid.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("EX3-015");
    expect(invalid.state.memory).toBe(1);
  });

  it("Q3378/Aqua trait: when played from digivolution cards, places the hand card under the Digimon that received Jamming", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-022", under: [{ card: "EX3-015", as: "crabmonSource" }], as: "attacker" },
            { card: "EX3-018", as: "recipient" },
          ],
          hand: [{ card: "BT1-038", as: "blueLevel5" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("recipient").permanentId, s.inst("blueLevel5").instanceId);
    await s.ready();
    const materialId = s.inst("blueLevel5").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("recipient").stack.some(({ instanceId }) => instanceId === materialId));

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-015")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Jamming")).toBe(true);
    expect(s.perm("recipient").stack.map(({ instanceId }) => instanceId)).toContain(materialId);
    expect(s.perm("recipient").stack.at(-1)?.instanceId).toBe(materialId);
    expect(s.perm("attacker").stack.map(({ instanceId }) => instanceId)).not.toContain(materialId);
  });

  it("allows the optional placement to be declined without moving the eligible hand card", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-022", under: ["EX3-015"], as: "attacker" },
            { card: "EX3-018", as: "recipient" },
          ],
          hand: [{ card: "BT1-038", as: "blueLevel5" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("recipient").permanentId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    // EX3-022's own "may play EX3-015 from digivolution cards" prompt comes first.
    await settle(
      () => s.state.pendingDecision?.kind === "optional" && s.decisions.at(-1)?.req.sourceCardId === "EX3-022",
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.pendingDecision?.kind === "optional" && s.decisions.at(-1)?.req.sourceCardId === "EX3-015",
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    expect(s.perm("recipient").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-038");
  });

  it("does not place a non-blue or level 6 Digimon under the selected target", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-022", under: ["EX3-015"], as: "attacker" },
            { card: "EX3-018", as: "recipient" },
          ],
          hand: [
            { card: "BT1-024", as: "redLevel5" },
            { card: "BT1-044", as: "blueLevel6" },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("recipient").permanentId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-015") &&
        s.state.players[1]!.security.length === 0,
    );

    expect(s.perm("recipient").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-024", "BT1-044"]),
    );
  });
});
