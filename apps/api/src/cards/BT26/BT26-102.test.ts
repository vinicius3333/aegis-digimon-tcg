import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-102.js";
import "../index.js";

describe("BT26-102 compiled fidelity", () => {
  it("keeps the Seven Code waiver and mixed placement seam without an unprinted Security clause", () => {
    const card = compiled;
    expect(getCardDefinition("BT26-102")).toMatchObject({
      nameEn: "Seven Code PAD",
      colors: ["White"],
      kinds: ["Option"],
      playCost: 7,
      types: ["Appmon", "Seven Code"],
    });
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects?.find((effect) => effect.trigger === "Security")).toBeUndefined();
    expect(card?.effects?.[0]?.actions).toMatchObject([
      {
        kind: "WaiveColorRequirement",
        condition: { kind: "youHave", filter: { kind: ["Digimon", "Tamer"] } },
      },
    ]);
    expect(card?.effects?.[1]?.actions).toMatchObject([
      {
        kind: "PlaceUnder",
        mixedSources: { battleAreaPermanents: true, linkedCards: true, trash: true },
        destination: { filter: { kind: ["Digimon"] } },
        order: "any",
        trackCount: "sevenCodeMaterials",
        optional: true,
        abortOnDecline: true,
      },
      {
        kind: "Digivolve",
        ignoreRequirements: true,
        payCost: false,
        condition: { kind: "namedCountAtLeast", countSource: "sevenCodeMaterials", count: 6 },
      },
    ]);
  });

  it("waives the white use requirement only while its controller has a Seven Code Digimon or Tamer", async () => {
    const withoutSevenCode = setupEngine({ 0: { hand: [{ card: "BT26-102", as: "option" }] } });
    withoutSevenCode.state.memory = 7;
    await withoutSevenCode.ready();
    expect(
      withoutSevenCode.engine.applyIntent(0, {
        type: "playCard",
        instanceId: withoutSevenCode.inst("option").instanceId,
      }),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });

    const withSevenCode = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-010", as: "sevenCode" }],
          hand: [{ card: "BT26-102", as: "option" }],
        },
      },
      { autoDeclineOptional: true },
    );
    withSevenCode.state.memory = 7;
    await withSevenCode.ready();
    expect(
      withSevenCode.engine.applyIntent(0, { type: "playCard", instanceId: withSevenCode.inst("option").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => withSevenCode.state.players[0]!.trash.some(({ cardId }) => cardId === "BT26-102"));
    expect(withSevenCode.state.memory).toBe(0);
  });

  it("does not treat a Seven Code Option as a Use Req qualifying card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-102", as: "sevenCodeOption" }],
        hand: [{ card: "BT26-102", as: "option" }],
      },
    });
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });

  it("Q7183-Q7186: places exactly six mixed-source materials, then may evolve the chosen host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT26-010",
              as: "host",
              linked: [
                { card: "BT26-019", as: "linked1" },
                { card: "BT26-028", as: "linked2" },
              ],
            },
            {
              card: "BT26-037",
              as: "battleMaterial",
              under: [{ card: "BT1-001", as: "shedStack" }],
            },
          ],
          hand: [
            { card: "BT26-102", as: "option" },
            { card: "BT26-086", as: "dantemon" },
          ],
          trash: [
            { card: "BT26-051", as: "trash1" },
            { card: "BT26-063", as: "trash2" },
            { card: "BT26-084", as: "trash3" },
            { card: "BT1-009", as: "nonSevenCode" },
          ],
        },
        1: { security: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.cardId === "BT26-086" && s.perm("host").linked.length === 7);

    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.perm("host").linked.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT26-019", "BT26-028", "BT26-037", "BT26-051", "BT26-063", "BT26-084"]),
    );
    expect(s.perm("host").linked).toHaveLength(7);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-037")).toBe(false);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-009");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-001");
  });

  it("Q7186 may place all six materials and then decline Dantemon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-010", as: "host" }],
          hand: [
            { card: "BT26-102", as: "option" },
            { card: "BT26-086", as: "dantemon" },
          ],
          trash: [
            { card: "BT26-019", as: "material1" },
            { card: "BT26-028", as: "material2" },
            { card: "BT26-037", as: "material3" },
            { card: "BT26-051", as: "material4" },
            { card: "BT26-063", as: "material5" },
            { card: "BT26-084", as: "material6" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 7;
    const optionId = s.inst("option").instanceId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const placementDecisionId = s.state.pendingDecision!.decisionId;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: placementDecisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.pendingDecision?.kind === "optional" && s.state.pendingDecision.decisionId !== placementDecisionId,
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === optionId));

    expect(s.perm("host").topCard.cardId).toBe("BT26-010");
    expect(s.perm("host").stack).toHaveLength(6);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT26-086")).toBe(true);
  });

  it("Q7184: with only five materials, places none and does not evolve", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-010", as: "host" }],
          hand: [
            { card: "BT26-102", as: "option" },
            { card: "BT26-086", as: "dantemon" },
          ],
          trash: ["BT26-019", "BT26-028", "BT26-037", "BT26-051", "BT26-063"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT26-102"));

    expect(s.perm("host").topCard.cardId).toBe("BT26-010");
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.filter(({ cardId }) => cardId !== "BT26-102")).toHaveLength(5);
  });
});
