import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import compiled from "./EX10-015.js";
import "../index.js";

const CARD_ID = "EX10-015";

describe("EX10-015 Psychemon", () => {
  it("records the exact catalog, optional Save-text cost, Save, Piercing, and DigiXros recipe", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Green", "Purple"],
      level: 3,
      playCost: 4,
      dp: 1000,
      evoCosts: [
        { color: "Green", level: 2, memoryCost: 1 },
        { color: "Purple", level: 2, memoryCost: 1 },
      ],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Reptile"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({
      actions: [
        {
          kind: "PlaceUnder",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          underFilter: { controller: "mine", kind: ["Tamer"], excludeToken: true },
          optional: true,
        },
      ],
      keywords: [{ keyword: "Save" }],
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [
        {
          kind: "Draw",
          amount: 1,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "trash",
            target: { filter: { controller: "mine", zone: "hand", textContains: "Save" }, count: 1 },
          },
        },
        { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Piercing" }],
    });
    expect(compiled.digiXrosRequirement).toEqual([{ materials: [{ texts: ["Save"] }], count: 2 }]);
    // No printed [Digivolve] header: the only legal routes are the cards.json EvoCost rows.
    // A restated EvoCost row here would register a second, unprinted alternate path.
    expect(compiled.digivolutionRequirement).toBeUndefined();
  });

  it("Q5044 trashes a card whose inherited text contains Save, draws 1, and suspends exactly 1 target", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "psychemon" }],
          hand: [
            { card: "BT12-006", as: "saveText" },
            { card: "BT1-009", as: "noSave" },
          ],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "chosen" },
            { card: "BT1-010", as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("saveText").instanceId, s.perm("chosen").permanentId);

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("psychemon"));

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("saveText").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("noSave").instanceId, s.inst("drawn").instanceId]),
    );
    expect(s.perm("chosen").isSuspended).toBe(true);
    expect(s.perm("other").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("Q5045 does not draw or suspend when no hand card contains Save", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "psychemon" }],
          hand: [{ card: "BT1-009", as: "noSave" }],
          deck: [{ card: "BT1-001", as: "top" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("psychemon"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("noSave").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("top").instanceId);
    expect(s.perm("target").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("may refuse the processing condition without trashing, drawing, or suspending", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "psychemon" }],
          hand: [{ card: "BT10-029", as: "saveText" }],
          deck: [{ card: "BT1-001", as: "top" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoDeclineOptional: true },
    );

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("psychemon"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("saveText").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("top").instanceId);
    expect(s.perm("target").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("may Save itself under a chosen Tamer after deletion or decline and remain in trash", async () => {
    const accepted = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "psychemon" },
            { card: "BT1-085", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const acceptedId = accepted.inst("psychemon").instanceId;
    expect(
      await advance(accepted.engine).verb.deletePermanent([accepted.perm("psychemon").permanentId], "byEffect"),
    ).toBe(1);
    await settle(() => accepted.perm("tamer").stack.some(({ instanceId }) => instanceId === acceptedId));
    expect(accepted.perm("tamer").stack.map(({ instanceId }) => instanceId)).toContain(acceptedId);
    expect(accepted.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(acceptedId);

    const declined = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "psychemon" },
            { card: "BT1-085", as: "tamer" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    const declinedId = declined.inst("psychemon").instanceId;
    expect(
      await advance(declined.engine).verb.deletePermanent([declined.perm("psychemon").permanentId], "byEffect"),
    ).toBe(1);
    expect(declined.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(declinedId);
    expect(declined.perm("tamer").stack.map(({ instanceId }) => instanceId)).not.toContain(declinedId);
    assertNoLoudGap(accepted);
    assertNoLoudGap(declined);
  });

  it("digivolves for 1 from both printed level-2 colors, rejects red, and grants inherited Piercing", async () => {
    for (const baseCard of ["BT1-007", "BT10-006"]) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCard, as: "base" }],
          hand: [{ card: CARD_ID, as: "psychemon" }],
          deck: ["BT1-001"],
        },
      });
      s.state.memory = 1;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("psychemon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === CARD_ID);
      expect(s.state.memory).toBe(0);
      expect(s.perm("base").stack.map(({ cardId }) => cardId)).toContain(baseCard);
    }

    const inherited = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [CARD_ID] }] },
    });
    inherited.state.turnSeat = 1;
    await inherited.ready();
    expect([...inherited.perm("host").keywords]).toContain("Piercing");

    const invalid = setupEngine({
      0: {
        battleArea: [{ card: "BT1-001", as: "redEgg" }],
        hand: [{ card: CARD_ID, as: "psychemon" }],
      },
    });
    invalid.state.memory = 1;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("redEgg").permanentId,
        instanceId: invalid.inst("psychemon").instanceId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("DigiXroses with exactly 1 Save-text Digimon for -2 and rejects a near non-match", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: CARD_ID, as: "psychemon" },
          { card: "BT10-029", as: "saveMaterial" },
          { card: "BT1-009", as: "noSave" },
          { card: "BT12-087", as: "saveTamer" },
        ],
      },
    });
    s.state.memory = 4;
    await s.ready();

    const invalidResult = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("psychemon").instanceId,
      digiXros: { materialInstanceIds: [s.inst("noSave").instanceId] },
    });
    expect(invalidResult).toEqual(expect.objectContaining({ ok: false }));
    // The printed slot is "1 DIGIMON card with ＜Save＞ in text": a Tamer whose text carries
    // ＜Save＞ satisfies the text half and must still be rejected by the Digimon-only guard.
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("psychemon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("saveTamer").instanceId] },
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    const validResult = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("psychemon").instanceId,
      digiXros: { materialInstanceIds: [s.inst("saveMaterial").instanceId] },
    });
    expect(validResult).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));

    const psychemon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === CARD_ID)!;
    expect(s.state.memory).toBe(2);
    expect(psychemon.stack.map(({ instanceId }) => instanceId)).toContain(s.inst("saveMaterial").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("noSave").instanceId);
    assertNoLoudGap(s);
  });
});
