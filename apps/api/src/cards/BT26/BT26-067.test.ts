import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-067.js";
import "../index.js";

async function runEndOfTurn(s: ReturnType<typeof setupEngine>, memory?: number): Promise<void> {
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);
  if (memory !== undefined) s.state.memory = memory;
  advance(s.engine).endMainPhaseIfOpen(0);
  await advance(s.engine).waitForMainPhase(1);
  expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("BT26-067 Wizardmon", () => {
  it("matches the catalog and mandates draw then hand trash on play and digivolving", () => {
    expect(getCardDefinition("BT26-067")).toMatchObject({
      nameEn: "Wizardmon",
      colors: ["Purple", "Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      types: ["Wizard", "Witchelny", "Iliad", "TS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(digivolutionRequirementsFor("BT26-067")).toContainEqual({
      level: 3,
      traits: ["TS"],
      cost: 2,
      isAlternate: true,
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions).toEqual([
        { kind: "Draw", controller: "mine", amount: 1 },
        { kind: "Trash", target: { filter: { controllerDefault: "mine", zone: "hand" }, count: 1 } },
      ]);
    }
  });

  it("returns itself before the optional reduced-cost red/blue Iliad trash play", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: true,
          reduceCostBy: 4,
          optional: true,
          allowCostWithoutTarget: true,
          cost: { kind: "return", to: "deckBottom", target: { filter: { isSelfRef: true } } },
        },
      ],
    });
  });

  it("keeps Retaliation as an inherited keyword", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Retaliation" }],
    });
  });

  it("publicly draws one and trashes one card on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT26-067", as: "wizardmon" },
            { card: "BT1-010", as: "discarded" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wizardmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-010");
  });

  it("returns itself to the deck before playing a red Iliad from trash with cost reduced by 4 [engine seam: PlayWithoutCost trash OR-target resolution]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-067", as: "wizardmon" },
            { card: "BT1-045", as: "yellowDigimon" },
          ],
          trash: [{ card: "BT25-008", as: "iliad" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    const wizardId = s.perm("wizardmon").topCard.instanceId;
    await runEndOfTurn(s, 20);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(wizardId);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT25-008");
    expect(s.state.memory).toBe(3);
  });

  it("allows BT26-073 to Assemble when Wizardmon plays it from the trash", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-067", as: "wizardmon" },
            { card: "BT1-045", as: "yellowDigimon" },
          ],
          trash: [
            { card: "BT26-073", as: "dark" },
            { card: "BT26-069", as: "assemblyMaterial" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      {
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.inst("dark").instanceId, s.inst("assemblyMaterial").instanceId);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 2;
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "optional" &&
        s.state.players[0]!.battleArea.some(
          ({ topCard, stack }) => topCard.cardId === "BT26-073" && stack.length === 1,
        ),
    );

    const dark = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT26-073");
    expect(dark?.stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("assemblyMaterial").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("wizardmon").instanceId);
    expect(s.state.memory).toBe(-5);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("asks for optional BT26-073 Assembly materials in a dedicated trash selection", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-067", as: "wizardmon" },
          { card: "BT1-045", as: "yellowDigimon" },
        ],
        trash: [
          { card: "BT26-073", as: "dark" },
          { card: "BT26-069", as: "assemblyMaterial" },
        ],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { deck: ["BT1-011", "BT1-012"] },
    });

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 2;
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision !== undefined);
    expect(s.state.pendingDecision).toMatchObject({
      kind: "selectCards",
    });
    expect(JSON.parse(s.state.pendingDecision!.payloadJson)).toMatchObject({
      candidateInstanceIds: [s.inst("assemblyMaterial").instanceId],
      min: 0,
      max: 1,
      assemblyCardId: "BT26-073",
    });
    expect(
      s.events.find((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT26-067"),
    ).toMatchObject({ timing: "OnEndTurn", printedTiming: "EndOfYourTurn" });

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("may play BT26-073 without Assembly when the material selection is declined", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-067", as: "wizardmon" },
          { card: "BT1-045", as: "yellowDigimon" },
        ],
        trash: [
          { card: "BT26-073", as: "dark" },
          { card: "BT26-069", as: "assemblyMaterial" },
        ],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { deck: ["BT1-011", "BT1-012"] },
    });

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 2;
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "selectCards" &&
        JSON.parse(s.state.pendingDecision.payloadJson).assemblyCardId === "BT26-073",
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "optional" &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-073"),
    );

    const dark = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT26-073");
    expect(dark?.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("assemblyMaterial").instanceId,
    );
    expect(s.state.memory).toBe(-7);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("may decline the legal reduced-cost play without returning itself or moving the target [engine seam: missing PlayWithoutCost optional decision]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-067", as: "wizardmon" },
            { card: "BT1-045", as: "yellowDigimon" },
          ],
          trash: [{ card: "BT25-008", as: "iliad" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 20;
    const wizardId = s.perm("wizardmon").permanentId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 20;
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(wizardId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("iliad").instanceId);
    expect(s.state.memory).toBe(3);
  });

  it("may pay the return cost when there is no legal Iliad card to play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-067", as: "wizardmon" },
            { card: "BT1-045", as: "yellowDigimon" },
          ],
          trash: [{ card: "BT1-009", as: "illegalTarget" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const wizardId = s.perm("wizardmon").permanentId;
    await runEndOfTurn(s, 0);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(wizardId);
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("BT26-067");
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(true);
  });

  it("may pay the return cost when the reduced play cost cannot be paid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-067", as: "wizardmon" },
            { card: "BT26-054", as: "yellowDigimon" },
          ],
          trash: [{ card: "BT26-060", as: "iliad" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const wizardId = s.perm("wizardmon").permanentId;
    await runEndOfTurn(s);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(wizardId);
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("BT26-067");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT26-060");
  });

  it("requires a blue or yellow Digimon before offering the end-turn payment", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-067", as: "wizardmon" }],
          trash: [{ card: "BT26-060", as: "iliad" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const wizardId = s.perm("wizardmon").permanentId;
    await runEndOfTurn(s);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(wizardId);
  });

  it("digivolves for 2 from a differently colored level 3 TS card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-008", as: "base" }],
        hand: [{ card: "BT26-067", as: "wizardmon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wizardmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT26-067");

    expect(s.state.memory).toBe(0);
  });

  it("grants executable inherited Retaliation in battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-075", as: "host", under: ["BT26-067"] }] },
        1: { battleArea: [{ card: "BT26-060", as: "defender", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const defenderId = s.perm("defender").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(defenderId);
  });
});
