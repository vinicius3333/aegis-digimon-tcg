import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX3-056.js";
import "./EX3-072.js";

describe("EX3-072 Megiddo Flame", () => {
  it("matches the official identity and complete Main/Security text", () => {
    const definition = getCardDefinition("EX3-072")!;
    expect(definition).toMatchObject({
      cardId: "EX3-072",
      nameEn: "Megiddo Flame",
      colors: ["Purple"],
      kinds: ["Option"],
      playCost: 4,
      rarity: "C",
      imageId: "EX3-072",
    });
    expect(definition.effectText).toContain("level 4 or lower");
    expect(definition.effectText).toContain("By deleting 1 of your Digimon");
    expect(definition.effectText).toContain("level 6 or lower Digimon instead");
    expect(definition.securityEffectText).toBe(
      "[Security] You may play 1 [Guilmon] from your trash without paying the cost.",
    );
  });

  it("chooses the level-4 branch without deleting one of your Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-056", as: "purpleSource" },
            { card: "BT1-010", as: "ownSurvivor" },
          ],
          hand: [{ card: "EX3-072", as: "flame" }],
        },
        1: {
          battleArea: [
            { card: "EX3-057", as: "levelFour" },
            { card: "EX3-064", as: "levelSix" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred, preferOptionIndex: 0 },
    );
    preferred.push(s.perm("levelFour").permanentId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("flame").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("EX3-057");
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("EX3-064");
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("ownSurvivor").permanentId,
    );
    assertNoLoudGap(s);
  });

  it("chooses the instead branch, pays exactly one own deletion, and deletes a level 6", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-056", as: "purpleSource" },
            { card: "BT1-010", as: "cost" },
          ],
          hand: [{ card: "EX3-072", as: "flame" }],
        },
        1: {
          battleArea: [
            { card: "EX3-057", as: "levelFourSurvivor" },
            { card: "EX3-064", as: "levelSixTarget" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred, preferOptionIndex: 1 },
    );
    preferred.push(s.perm("cost").permanentId, s.perm("levelSixTarget").permanentId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("flame").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1 && s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-010");
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("EX3-064");
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("EX3-057");
    assertNoLoudGap(s);
  });

  it("does not pay the instead cost when no level-6-or-lower opposing target exists", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-056", as: "purpleSource" },
            { card: "BT1-010", as: "wouldBeCost" },
          ],
          hand: [{ card: "EX3-072", as: "flame" }],
        },
        1: { battleArea: [{ card: "EX3-074", as: "levelSeven" }] },
      },
      { autoSelectCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("flame").instanceId })).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("wouldBeCost").permanentId,
    );
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("levelSeven").permanentId,
    );
    expect(s.decisions.some(({ req }) => req.sourceCardId === "EX3-072" && req.kind === "chooseOption")).toBe(false);
    assertNoLoudGap(s);
  });

  it("offers only the level-4 branch when the instead cost cannot be paid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-090", as: "purpleTamer" }],
          hand: [{ card: "EX3-072", as: "flame" }],
        },
        1: { battleArea: [{ card: "EX3-057", as: "levelFour" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("flame").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.decisions.some(({ req }) => req.kind === "chooseOption" && req.sourceCardId === "EX3-072")).toBe(false);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("EX3-057");
    assertNoLoudGap(s);
  });

  it("offers only the instead branch when there is no level-4 target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-056", as: "cost" }],
          hand: [{ card: "EX3-072", as: "flame" }],
        },
        1: { battleArea: [{ card: "EX3-064", as: "levelSix" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("flame").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);

    expect(s.decisions.some(({ req }) => req.kind === "chooseOption" && req.sourceCardId === "EX3-072")).toBe(false);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX3-056");
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("EX3-064");
  });

  it("Security Guilmon family: offers only names containing Guilmon and plays one free", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          security: [{ card: "EX3-072", faceUp: true, as: "flame" }],
          trash: [
            { card: "EX3-056", as: "guilmon" },
            { card: "BT5-071", as: "secondGuilmon" },
            { card: "EX3-057", as: "growlmon" },
            { card: "BT1-010", as: "unrelated" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("guilmon").instanceId);
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("flame"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-056"));

    const selection = s.decisions.find(({ req }) => req.sourceCardId === "EX3-072" && req.kind === "selectCards")!.req;
    expect(selection.options?.candidateInstanceIds).toContain(s.inst("guilmon").instanceId);
    expect(selection.options?.candidateInstanceIds).toContain(s.inst("secondGuilmon").instanceId);
    expect(selection.options?.candidateInstanceIds).not.toContain(s.inst("growlmon").instanceId);
    expect(selection.options?.candidateInstanceIds).not.toContain(s.inst("unrelated").instanceId);
    expect(selection.options?.visibleInstanceIds).toEqual([
      s.inst("guilmon").instanceId,
      s.inst("secondGuilmon").instanceId,
      s.inst("growlmon").instanceId,
      s.inst("unrelated").instanceId,
    ]);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("Security may be declined and leaves Guilmon in trash", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "EX3-072", faceUp: true, as: "flame" }],
          trash: [{ card: "EX3-056", as: "guilmon" }],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("flame"));

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("guilmon").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("requires a purple Digimon or Tamer to use from hand", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX3-072", as: "flame" }] } });
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("flame").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });
});
