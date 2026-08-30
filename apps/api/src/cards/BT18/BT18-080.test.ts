import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-080.js";

describe("BT18-080 Oboromon", () => {
  it("matches the catalog and full IR sequential deletion and alternate-route contract", () => {
    expect(getCardDefinition("BT18-080")).toMatchObject({
      cardId: "BT18-080",
      nameEn: "Oboromon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Undead"],
      inheritedEffectText: "＜Retaliation＞.",
    });
    expect(compiled).toMatchObject({
      effects: [
        ...(["OnPlay", "WhenDigivolving"] as const).map((trigger) => ({
          trigger,
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controllerDefault: "opponent",
                  kind: ["Digimon"],
                  colors: ["Red", "Green", "White", "Purple"],
                  levelComparison: { op: "lte", value: 4 },
                },
                count: 1,
              },
            },
            {
              kind: "Delete",
              target: {
                filter: {
                  controllerDefault: "opponent",
                  kind: ["Tamer"],
                  colors: ["Blue", "Yellow", "White", "Black"],
                  playCostLte: 3,
                },
                count: 1,
              },
            },
          ],
        })),
        { trigger: "Static", actions: [], isInherited: true, keywords: [{ keyword: "Retaliation" }] },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("naturally plays and resolves both deletion clauses at their exact color, level, and cost boundaries", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-080", as: "oboromon" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "eligibleDigimon" },
            { card: "BT1-032", as: "wrongColorDigimon" },
            { card: "BT3-095", as: "eligibleTamer" },
            { card: "BT1-086", as: "tooExpensiveTamer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    const eligibleDigimonId = s.perm("eligibleDigimon").permanentId;
    const wrongColorDigimonId = s.perm("wrongColorDigimon").permanentId;
    const eligibleTamerId = s.perm("eligibleTamer").permanentId;
    const tooExpensiveTamerId = s.perm("tooExpensiveTamer").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("oboromon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT3-095"));

    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === eligibleDigimonId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === eligibleTamerId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === wrongColorDigimonId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === tooExpensiveTamerId)).toBe(true);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("naturally evolves from a Purple level-4 peer and resolves the second deletion after the first", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-079", as: "base" }], hand: [{ card: "BT18-080", as: "oboromon" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "eligibleDigimon" },
            { card: "BT1-032", as: "wrongColorDigimon" },
            { card: "BT3-095", as: "eligibleTamer" },
            { card: "BT1-086", as: "tooExpensiveTamer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const eligibleDigimonId = s.perm("eligibleDigimon").permanentId;
    const eligibleTamerId = s.perm("eligibleTamer").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("oboromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT18-080" && s.state.players[1]!.trash.length === 2);

    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === eligibleDigimonId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === eligibleTamerId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-032")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-086")).toBe(true);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("naturally applies inherited Retaliation from a legal Oboromon-under-LordKnightmon stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-083", as: "host", dp: 5000, suspended: true, under: ["BT18-080"] }] },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 7000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const hostId = s.perm("host").permanentId;
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT18-080"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(false);
    assertNoLoudGap(s);
  });
});
