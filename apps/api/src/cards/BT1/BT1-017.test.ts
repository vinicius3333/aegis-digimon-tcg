import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-017.js";

describe("BT1-017 Birdramon", () => {
  it("matches the catalog and exports the targeted turn-limited keyword effect", () => {
    expect(getCardDefinition("BT1-017")).toMatchObject({
      cardId: "BT1-017",
      set: "BT1",
      nameEn: "Birdramon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Red", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Giant Bird"],
      effectText:
        "[On Play] 1 of your Digimon gains ＜Security Attack +1＞ (This Digimon checks 1 additional security card) for the turn.",
      rarity: "U",
      maxCountInDeck: 4,
      imageId: "BT1-017",
      nameJp: "バードラモン",
    });
    expect(getCardDefinition("BT1-017")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("BT1-017")?.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "GainKeyword",
              target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              keyword: { keyword: "SecurityAttack", amount: 1 },
              duration: "forTheTurn",
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("grants Security Attack +1 to one of your Digimon for the turn", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT1-017", as: "birdramon" }], battleArea: [{ card: "BT1-010", as: "target", dp: 2000 }] },
      },
      { autoSelectCards: true },
    );
    const target = s.perm("target");
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("birdramon").instanceId })).toEqual({
      ok: true,
    });
    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    await settle(() => continuous.hasKeyword(target.permanentId, "SecurityAttack"));

    expect(continuous.hasKeyword(target.permanentId, "SecurityAttack")).toBe(true);
  });

  it("removes the granted keyword at the end of the turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-017", as: "birdramon" }],
          battleArea: [{ card: "BT1-010", as: "target" }],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("birdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("target"), "SecurityAttack"));
    await advance(s.engine).runTurn(0);

    expect(observe(s.engine).hasKeyword(s.perm("target"), "SecurityAttack")).toBe(false);
  });

  it("can grant Security Attack +1 to Birdramon itself", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-017", as: "birdramon" }] } }, { autoSelectCards: true });
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("birdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => {
      const birdramon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT1-017");
      return birdramon !== undefined && observe(s.engine).keywordAmount(birdramon, "SecurityAttack") === 1;
    });

    const birdramon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT1-017")!;
    expect(observe(s.engine).keywordAmount(birdramon, "SecurityAttack")).toBe(1);
  });

  it("keeps the granted Security Attack after Birdramon leaves and the target digivolves", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT1-017", as: "birdramon" },
            { card: "BT1-021", as: "evolving" },
          ],
          battleArea: [{ card: "BT1-016", as: "target" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("birdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === 1);
    await advance(s.engine).verb.deletePermanent([
      s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT1-017")!.permanentId,
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("target").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "BT1-021");
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(1);
  });
});
