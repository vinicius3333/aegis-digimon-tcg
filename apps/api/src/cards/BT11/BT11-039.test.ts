import { compiledEffects, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-039.js";

describe("BT11-039 Centarumon", () => {
  it("matches the exact catalog and complete direct/shared security contract", () => {
    expect(getCardDefinition("BT11-039")).toEqual({
      cardId: "BT11-039",
      set: "BT11",
      nameEn: "Centarumon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Yellow", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Beastkin"],
      effectText:
        "[When Digivolving] You may place 1 of your other yellow Digimon on top of your security stack face down.",
      rarity: "C",
      maxCountInDeck: 4,
      imageId: "BT11-039",
      nameJp: "ケンタルモン",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            {
              kind: "SecurityManipulation",
              op: "placeAsSecurity",
              controller: "mine",
              source: {
                filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"], colors: ["Yellow"] },
                count: 1,
              },
              toTop: true,
              optional: true,
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
    expect(compiledEffects["BT11-039"]).toEqual(compiled);
  });

  it("evolves for 2 and places another yellow Digimon face down above existing security", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-037", as: "base" },
            { card: "BT11-038", as: "securityTarget" },
            { card: "BT11-080", as: "purple" },
          ],
          hand: [{ card: "BT11-039", as: "centarumon" }],
          deck: ["BT1-001"],
          security: [{ card: "BT1-002", as: "oldSecurity" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 4;
    const targetInstanceId = s.perm("securityTarget").topCard.instanceId;
    const oldSecurityInstanceId = s.inst("oldSecurity").instanceId;
    preferInstanceIds.push(s.inst("purple").instanceId, s.inst("centarumon").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("centarumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some(({ instanceId }) => instanceId === targetInstanceId));

    expect(s.state.players[0]!.security[0]).toMatchObject({ instanceId: targetInstanceId, faceUp: false });
    expect(s.state.players[0]!.security[1]).toMatchObject({ instanceId: oldSecurityInstanceId, faceUp: false });
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === targetInstanceId)).toBe(false);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("purple").instanceId),
    ).toBe(true);
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").currentDP).toBe(5000);
  });

  it("allows the eligible yellow Digimon placement to be declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-037", as: "base" },
            { card: "BT11-038", as: "target" },
          ],
          hand: [{ card: "BT11-039", as: "centarumon" }],
          deck: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("centarumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("target").instanceId),
    ).toBe(true);
  });

  it("plays for 5 with 5000 DP without triggering the evolution effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-038", as: "target" }],
        hand: [{ card: "BT11-039", as: "centarumon" }],
      },
    });
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("centarumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.memory).toBe(2);
    expect(s.perm("centarumon").currentDP).toBe(5000);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("target").instanceId),
    ).toBe(true);
  });
});
