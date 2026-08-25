import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import compiled from "./EX10-034.js";
import "../index.js";

const CARD_ID = "EX10-034";

describe("EX10-034 Blastmon compiled contract", () => {
  it("records the exact catalog and evolution routes", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Black", "Purple"],
      level: 6,
      playCost: 13,
      dp: 13000,
      evoCosts: [
        { color: "Black", level: 5, memoryCost: 5 },
        { color: "Purple", level: 5, memoryCost: 5 },
      ],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Mineral", "Bagra Army"],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, colors: ["Black"], cost: 5 },
      { level: 5, colors: ["Purple"], cost: 5 },
    ]);
  });

  it("preserves keywords, gained attack, exact two-card cost, and DigiXros", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          keywords: expect.arrayContaining([
            expect.objectContaining({ keyword: "Collision" }),
            expect.objectContaining({ keyword: "Fragment", amount: 3 }),
            expect.objectContaining({ keyword: "Blocker" }),
          ]),
        }),
        expect.objectContaining({
          trigger: "OnPlay",
          actions: [expect.objectContaining({ kind: "GainTriggeredEffect", gainedTrigger: "StartOfYourMainPhase" })],
        }),
        expect.objectContaining({
          trigger: "WhenDigivolving",
          actions: [expect.objectContaining({ kind: "GainTriggeredEffect", gainedTrigger: "StartOfYourMainPhase" })],
        }),
        expect.objectContaining({
          trigger: "AllTurns",
          frequency: "OncePerTurn",
          actions: [
            expect.objectContaining({
              kind: "SubTrigger",
              event: "whenAttacking",
              actions: expect.arrayContaining([
                expect.objectContaining({
                  kind: "GainKeyword",
                  keyword: expect.objectContaining({ keyword: "SecurityAttack", amount: 1 }),
                  cost: expect.objectContaining({
                    kind: "trash",
                    target: { filter: { isSelfRef: true, zone: "digivolutionCards" }, count: 2 },
                  }),
                }),
              ]),
            }),
          ],
        }),
      ]),
    );
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ traits: ["Bagra Army"] }], count: 2, costReduction: 2 },
    ]);
  });

  it("Q5101 grants the selected opposing Digimon a start-main forced-attack subscription", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "blast" }], security: ["BT1-009"] },
        1: { battleArea: [{ card: "BT5-082", as: "target" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("blast"));
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("target").permanentId)).toHaveLength(1);
  });

  it("Q5102/Q5103 pays exactly 2 of Blastmon's sources on either player's attack and buffs itself once", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "blast",
              under: [
                { card: "EX10-025", as: "first" },
                { card: "EX10-028", as: "second" },
                { card: "EX10-003", as: "third" },
              ],
            },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const baseDp = s.perm("blast").currentDP;
    const attackerId = s.perm("attacker").permanentId;
    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: attackerId });
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.perm("blast").currentDP).toBe(baseDp + 3000);
    expect(observe(s.engine).keywordAmount(s.perm("blast"), "SecurityAttack")).toBe(1);
    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: attackerId });
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("DigiXroses with exactly 2 Bagra Army cards for 4 less", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "blast" },
            { card: "EX10-026", as: "first" },
            { card: "EX10-027", as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 13;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("blast").instanceId,
        digiXros: { materialInstanceIds: [s.inst("first").instanceId, s.inst("second").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));
    expect(s.state.memory).toBe(4);
  });
});
