import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX3-008.js";
import "./EX3-010.js";
import "./EX3-058.js";
import "./EX3-061.js";
import "./EX3-063.js";

describe("EX3-058 Shadramon", () => {
  it("matches the official errata identity, dual evolution paths, and inherited effect", () => {
    expect(getCardDefinition("EX3-058")).toMatchObject({
      cardId: "EX3-058",
      nameEn: "Shadramon",
      colors: ["Purple"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [
        { color: "Purple", level: 3, memoryCost: 2 },
        { color: "Red", level: 3, memoryCost: 2 },
      ],
      forms: ["ArmorForm"],
      attributes: ["Free"],
      types: ["Insectoid"],
      rarity: "C",
      imageId: "EX3-058-Errata",
      inheritedEffectText:
        "[End of Your Turn] This Digimon and one of your other Digimon may DNA digivolve into a Digimon card in your hand for the cost.",
    });
    expect(getCardDefinition("EX3-058")!.effectText).toContain(
      "a level 4 red Digimon card with the [Free] trait from your trash",
    );
  });

  it("publishes both friendly When Digivolving branches with Shadramon as their source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "base" },
          { card: "EX3-008", as: "partner" },
          { card: "EX3-055", as: "trashBranchBase" },
        ],
        hand: [
          { card: "EX3-058", as: "shadramon" },
          { card: "EX3-061", as: "dinobeemon" },
        ],
        trash: [{ card: "EX3-008", as: "trashFlamedramon" }],
      },
    });
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shadramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseOption");

    expect(s.decisions.at(-1)!.req).toMatchObject({
      kind: "chooseOption",
      sourceCardId: "EX3-058",
      options: {
        choices: ["Digivolve", "DNA digivolve"],
        timing: "WhenDigivolving",
        effectText: expect.stringContaining("Activate 1 of the effects below"),
      },
    });
  });

  it("Q3425: evolves a non-red partner into a red level 4 Free card from trash for its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "base" },
            { card: "EX3-055", as: "partner" },
          ],
          hand: [{ card: "EX3-058", as: "shadramon" }],
          trash: [{ card: "EX3-008", as: "flamedramon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shadramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("partner").topCard.cardId === "EX3-008");
    expect(s.perm("partner").stack.map(({ cardId }) => cardId)).toContain("EX3-055");
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX3-008")).toBe(false);
    expect(s.state.memory).toBe(2);
  });

  it("may decline the trash evolution without moving or charging another card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "base" },
            { card: "EX3-055", as: "partner" },
          ],
          hand: [{ card: "EX3-058", as: "shadramon" }],
          trash: [{ card: "EX3-008", as: "flamedramon" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shadramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-058");
    expect(s.perm("partner").topCard.cardId).toBe("EX3-055");
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX3-008")).toBe(true);
    expect(s.state.memory).toBe(4);
  });

  it("uses itself and exactly one other Digimon for a compatible hand DNA evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "base" },
            { card: "EX3-008", as: "partner" },
          ],
          hand: [
            { card: "EX3-058", as: "shadramon" },
            { card: "EX3-061", as: "dinobeemon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 6;
    await s.ready();
    const baseId = s.perm("base").permanentId;
    const partnerId = s.perm("partner").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: baseId, instanceId: s.inst("shadramon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-061"));
    const result = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX3-061")!;
    expect(result.stack.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["EX3-058", "BT1-009", "EX3-008"]));
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(partnerId);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(baseId);
    expect(s.state.memory).toBe(4);
  });

  it("leaves both stacks intact when the hand has no compatible DNA result", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "base" },
            { card: "EX3-008", as: "partner" },
          ],
          hand: [
            { card: "EX3-058", as: "shadramon" },
            { card: "BT1-009", as: "incompatible" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shadramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-058");
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.perm("partner").topCard.cardId).toBe("EX3-008");
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT1-009")).toBe(true);
    expect(s.state.memory).toBe(4);
  });

  it("Q3426: uses inherited end-of-turn DNA after the digivolving DNA passes memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "base" },
            { card: "EX3-008", as: "firstPartner" },
            { card: "EX3-010", as: "secondPartner" },
          ],
          hand: [
            { card: "EX3-058", as: "shadramon" },
            { card: "EX3-061", as: "dinobeemon" },
            { card: "EX3-063", as: "dragonMode" },
          ],
          deck: ["BT1-009"],
        },
        1: { deck: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 1;
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shadramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await turn;
    const result = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX3-063")!;
    expect(result).toBeDefined();
    expect(result.stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX3-058", "EX3-061", "EX3-008", "EX3-010"]),
    );
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "EX3-063")).toBe(false);
  });
});
