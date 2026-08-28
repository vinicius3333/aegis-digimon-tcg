import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-070.js";
import "../index.js";

const CARD_ID = "EX10-070";

describe("EX10-070 God Grade Unleashed", () => {
  it("records the exact catalog and trigger-recipient intrinsic Delay contract", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "God Grade Unleashed",
      colors: ["Black"],
      kinds: ["Option"],
      playCost: 2,
      types: ["Appmon", "Leviathan"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find(({ trigger }) => trigger === "Static")).toMatchObject({
      actions: [
        {
          kind: "WaiveColorRequirement",
          condition: {
            kind: "youHave",
            filter: { kind: ["Digimon", "Tamer"], nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] },
          },
        },
      ],
    });
    expect(compiled.effects.find(({ trigger }) => trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinkTrashed",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          delayArmedIntrinsic: true,
          actions: [
            {
              kind: "Link",
              from: ["trash"],
              payCost: false,
              optional: true,
              target: { filter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] } },
              recipient: { sourceRef: "triggerSubject" },
            },
          ],
        },
      ],
    });
  });

  it("Main draws 1 and places itself in the battle area", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "godGrade" }],
        deck: ["BT1-001"],
        battleArea: [{ card: "EX10-029", as: "appmon" }],
      },
    });
    s.state.memory = 2;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("godGrade").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID)).toBe(true);
  });

  it("trashes intrinsic Delay after a genuine linked-card trash and freely links an Appmon to that host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "godGrade" },
            { card: "EX10-029", as: "host", linked: [{ card: "EX10-024", as: "oldLink" }] },
          ],
          trash: [{ card: "EX10-024", as: "newLink" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("godGrade").placedByEffect = true;
    await s.ready();
    await advance(s.engine).verb.trash([s.inst("oldLink").instanceId]);
    await settle(() => s.perm("host").linked.some(({ instanceId }) => instanceId === s.inst("newLink").instanceId));
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain(CARD_ID);
    expect(s.perm("host").linked).toHaveLength(1);
    expect(s.perm("host").linked[0]?.cardId).toBe("EX10-024");
    expect(s.state.memory).toBe(0);
  });

  it("does not consume Delay when no Appmon Link card exists in trash", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "godGrade" },
          { card: "EX10-029", as: "host", linked: [{ card: "BT24-097", as: "oldLink" }] },
        ],
      },
    });
    s.perm("godGrade").placedByEffect = true;
    await s.ready();
    await advance(s.engine).verb.trash([s.inst("oldLink").instanceId]);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID)).toBe(true);
  });

  it("Q5184 does not trigger when link-limit replacement trashes the existing linked card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "godGrade" },
          { card: "EX10-029", as: "host", linked: [{ card: "EX10-024", as: "oldLink" }] },
        ],
        hand: [{ card: "EX10-024", as: "newLink" }],
      },
    });
    s.perm("godGrade").placedByEffect = true;
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("newLink").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.length === 1);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID)).toBe(true);
  });

  it("Security places itself in the battle area", async () => {
    const s = setupEngine({ 0: { security: [{ card: CARD_ID, as: "godGrade" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("godGrade"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID)).toBe(true);
  });
});
