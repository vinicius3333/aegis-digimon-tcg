import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-012.js";
import { compiled } from "./BT11-015.js";

describe("BT11-015 OmniShoutmon", () => {
  it("matches the catalog and carries every complete printed contract", () => {
    expect(getCardDefinition("BT11-015")).toMatchObject({
      cardId: "BT11-015",
      nameEn: "OmniShoutmon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 8000,
      evoCosts: [
        { color: "Red", level: 4, memoryCost: 3 },
        { color: "Blue", level: 4, memoryCost: 3 },
      ],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Dragonkin", "Xros Heart"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Shoutmon"], cost: 4, isAlternate: true }]);
    expect(compiled).toMatchObject({
      effects: [
        { trigger: "Static", actions: [{ kind: "GrantStatic", tokens: ["Shoutmon"], digiXrosOnly: true }] },
        { trigger: "WhenDigivolving", actions: [{ kind: "Delete", condition: { kind: "not" } }, { kind: "Delete" }] },
        { trigger: "OnDeletion", keywords: [{ keyword: "Save" }] },
        { trigger: "YourTurn", isInherited: true, actions: [{ kind: "Aura" }] },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("deletes two 4000-DP Digimon when Shoutmon is in its sources", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-015", as: "omni", under: ["BT10-008"] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "one", dp: 4000 },
            { card: "BT1-010", as: "two", dp: 4000 },
            { card: "BT1-011", as: "three", dp: 4000 },
          ],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("omni"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.trash).toHaveLength(2);
  });

  it("deletes only one 4000-DP Digimon without Shoutmon in its sources", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-015", as: "omni", under: ["BT1-009"] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "one", dp: 4000 },
            { card: "BT1-010", as: "two", dp: 4000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("omni"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("uses its DigiXros-only Shoutmon alias from hand without leaking into ordinary names", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT11-012", as: "x3" },
            { card: "BT11-015", as: "omni" },
            { card: "BT10-049", as: "ballistamon" },
            { card: "BT10-034", as: "dorulumon" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("x3").instanceId,
        digiXros: {
          materialInstanceIds: [
            s.inst("omni").instanceId,
            s.inst("ballistamon").instanceId,
            s.inst("dorulumon").instanceId,
          ],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea[0]!.stack.map(({ cardId }) => cardId)).toContain("BT11-015");
    expect(getCardDefinition("BT11-015")!.nameEn).toBe("OmniShoutmon");
  });

  it("supports both normal colors and the named alternate evolution", async () => {
    for (const [base, expectedCost] of [
      ["BT11-010", 3],
      ["BT1-032", 3],
      ["BT10-008", 4],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: base, as: "base" }], hand: [{ card: "BT11-015", as: "omni" }] },
      });
      s.state.memory = 6;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("omni").instanceId,
          ...(base === "BT10-008" ? { useAlternateCost: true } : {}),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT11-015");
      expect(s.state.memory).toBe(6 - expectedCost);
    }
  });

  it("grants Security Attack +1 to a Shoutmon-named host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-008", as: "host", under: ["BT11-015"] }] },
    });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("does not grant inherited Security Attack off-turn or to a non-Shoutmon host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-008", as: "offTurn", under: ["BT11-015"] },
          { card: "BT1-009", as: "wrongName", under: ["BT11-015"] },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("offTurn"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("wrongName"), "SecurityAttack")).toBe(0);
  });

  it("Saves itself under a Tamer on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-015", as: "omni" },
            { card: "BT10-087", as: "taiki" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const omniCardId = s.perm("omni").topCard.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("omni").permanentId]);
    await settle(() => s.perm("taiki").stack.some(({ instanceId }) => instanceId === omniCardId));

    expect(s.perm("taiki").stack.some(({ instanceId }) => instanceId === omniCardId)).toBe(true);
  });
});
