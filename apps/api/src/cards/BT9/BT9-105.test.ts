import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-105.js";
import "./BT9-105.js";

describe("BT9-105 Soul Digitalization", () => {
  it("matches catalog values and reveal-budget, then-placement, and security IR", () => {
    expect(getCardDefinition("BT9-105")).toMatchObject({
      colors: ["Black"], kinds: ["Option"], playCost: 5,
      securityEffectText: "[Security] Activate this card's [Main] effect.",
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [
        { trigger: "Main", actions: [{ kind: "RevealChooseDeleteBudget", revealCount: 3, revealController: "mine", chooseFilter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }] }, deleteCount: 1, returnRevealed: "trash" }, { kind: "PlaceUnder", target: { filter: { zone: "trash", nameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }] } }, underFilter: { nameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }] } }] },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
      ],
    });
  });

  it("uses the chosen revealed play cost, trashes the reveal, then places that X Antibody card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT9-062", as: "host" }],
        hand: [{ card: "BT9-105", as: "option" }],
        deck: [
          { card: "BT9-064", as: "reference" },
          { card: "BT9-074", as: "miss" },
          { card: "BT1-001", as: "egg" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT9-045", as: "eligible" },
          { card: "BT9-029", as: "tooExpensive" },
        ],
      },
    });
    const eligibleCardId = s.perm("eligible").topCard.instanceId;
    s.state.memory = 7;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const referenceChoice = s.decisions.at(-1)!.req;
    expect(referenceChoice.sourceCardId).toBe("BT9-105");
    expect(referenceChoice.options).toMatchObject({ min: 1, max: 1 });
    expect(referenceChoice.options?.candidateInstanceIds).toEqual([s.inst("reference").instanceId]);
    expect(referenceChoice.options?.visibleCards).toEqual([
      { instanceId: s.inst("reference").instanceId, cardId: "BT9-064" },
      { instanceId: s.inst("miss").instanceId, cardId: "BT9-074" },
      { instanceId: s.inst("egg").instanceId, cardId: "BT1-001" },
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: referenceChoice.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("reference").instanceId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "selectTargets");
    const deletionChoice = s.decisions.at(-1)!.req;
    expect(deletionChoice.sourceCardId).toBe("BT9-105");
    expect(deletionChoice.options).toMatchObject({ min: 1, max: 1 });
    expect(deletionChoice.options?.candidateInstanceIds).toEqual([s.perm("eligible").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: deletionChoice.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("eligible").permanentId] },
      }),
    ).toEqual({ ok: true });

    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.perm("host").stack.some(({ instanceId }) => instanceId === s.inst("reference").instanceId),
    );

    expect(
      s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("tooExpensive").permanentId),
    ).toBe(true);
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === eligibleCardId)).toBe(true);
    expect(s.perm("host").stack.some(({ instanceId }) => instanceId === s.inst("reference").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("miss").instanceId, s.inst("egg").instanceId]),
    );
    expect(s.state.memory).toBe(2);
  });

  it("still resolves the Then placement when no X Antibody card was revealed", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-062", as: "host" }],
          hand: [{ card: "BT9-105", as: "option" }],
          trash: [{ card: "BT9-008", as: "existingX" }],
          deck: ["BT9-074", "BT1-001", "BT1-002"],
        },
        1: { battleArea: [{ card: "BT9-045", as: "opponent" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("existingX").instanceId, s.perm("host").permanentId);
    const optionId = s.inst("option").instanceId;
    s.state.memory = 7;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("host").stack.some(({ instanceId }) => instanceId === s.inst("existingX").instanceId) &&
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === optionId),
    );

    expect(
      s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("opponent").permanentId),
    ).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(4);
    expect(s.perm("host").stack.some(({ instanceId }) => instanceId === s.inst("existingX").instanceId)).toBe(true);
  });

  it("activates the same reveal, deletion, and placement from Security", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-062", as: "host" }],
          security: [{ card: "BT9-105", as: "option", faceUp: true }],
          deck: [{ card: "BT9-064", as: "reference" }, "BT9-074", "BT1-001"],
        },
        1: { battleArea: [{ card: "BT9-045", as: "target" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    const targetCardId = s.perm("target").topCard.instanceId;
    preferred.push(s.inst("reference").instanceId, s.perm("target").permanentId, s.perm("host").permanentId);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === targetCardId)).toBe(true);
    expect(s.perm("host").stack.some(({ instanceId }) => instanceId === s.inst("reference").instanceId)).toBe(true);
  });
});
