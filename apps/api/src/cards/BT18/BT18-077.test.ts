import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-077.js";

describe("BT18-077 KaiserLeomon", () => {
  it("matches the catalog and full IR deletion, Retaliation, and alternate-route contract", () => {
    expect(getCardDefinition("BT18-077")).toMatchObject({
      cardId: "BT18-077",
      nameEn: "KaiserLeomon",
      colors: ["Purple", "Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 7000,
      evoCosts: [
        { color: "Purple", level: 3, memoryCost: 4 },
        { color: "Yellow", level: 3, memoryCost: 4 },
      ],
      forms: ["Hybrid"],
      attributes: ["Variable"],
      types: ["Cyborg"],
      inheritedEffectText: "＜Retaliation＞.",
    });
    expect(compiled).toMatchObject({
      effects: [
        { trigger: "Static", actions: [], keywords: [{ keyword: "Retaliation", raw: "＜Retaliation＞" }] },
        ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
          trigger,
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
                count: 1,
              },
            },
          ],
        })),
        { trigger: "Static", isInherited: true, actions: [], keywords: [{ keyword: "Retaliation" }] },
      ],
      coverage: "full",
      residual: [],
      digivolutionRequirement: [
        { names: ["Koichi Kimura"], cost: 3, isAlternate: true },
        { names: ["Loweemon"], cost: 1, isAlternate: true },
      ],
    });
  });

  it("naturally plays for 6 and deletes exactly one opposing level-4-or-lower Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-077", as: "kaiser" }] },
        1: {
          battleArea: [
            { card: "BT1-032", as: "target" },
            { card: "BT1-060", as: "tooLarge" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kaiser").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-032"));

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-032")).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-032")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-060")).toBe(true);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("naturally resolves the same level boundary from When Digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-075", as: "base" }], hand: [{ card: "BT18-077", as: "kaiser" }] },
        1: { battleArea: [{ card: "BT1-032", as: "target" }, { card: "BT1-060", as: "tooLarge" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kaiser").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT18-077");

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-032")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-060")).toBe(true);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("naturally uses printed Retaliation when KaiserLeomon loses a battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-077", as: "kaiser", dp: 5000, suspended: true }] },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 7000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const kaiserId = s.perm("kaiser").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: kaiserId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT18-077"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === kaiserId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-010")).toBe(false);
    assertNoLoudGap(s);
  });
});
