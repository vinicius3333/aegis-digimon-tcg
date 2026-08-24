import { describe, expect, it } from "vitest";
import {
  compiledEffects,
  dnaDigivolutionRequirementsFor,
  digivolutionRequirementsFor,
  EffectTiming,
  getCardDefinition,
} from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX12-058.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-058 HiAndromon", () => {
  it("maps both evolution routes, the shared reveal timing, and permanent ME keywords", () => {
    const card = getCardDefinition("EX12-058");
    expect(card?.effectText).toContain("[Machine], [Cyborg] or [ME]");
    expect(digivolutionRequirementsFor("EX12-058")).toEqual([{ level: 5, traits: ["ME"], cost: 3, isAlternate: true }]);
    expect(dnaDigivolutionRequirementsFor("EX12-058")).toEqual([
      {
        cost: 0,
        materials: [
          { color: "Black", level: 5 },
          { color: "Red", level: 5 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Black", level: 5 },
          { color: "Yellow", level: 5 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Purple", level: 5 },
          { color: "Red", level: 5 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Purple", level: 5 },
          { color: "Yellow", level: 5 },
        ],
      },
    ]);

    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 3,
            rest: "trash",
            add: [{ count: 1, to: "play", optional: true, filter: { playCostLte: 7 } }],
          },
        ],
      });
    }

    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [
        { kind: "GainKeyword", keyword: { keyword: "Alliance" }, duration: "permanent", target: { count: "all" } },
        { kind: "GainKeyword", keyword: { keyword: "Reboot" }, duration: "permanent", target: { count: "all" } },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(registeredCompiledCards.get("EX12-058")).toEqual(compiled);
    expect(compiledEffects["EX12-058"]).toEqual(compiled);
  });

  it("plays exactly one matching revealed card without cost and trashes the other reveals", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-058", as: "hiandromon" }],
          deck: ["BT3-066", "BT14-062", "BT14-015"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hiandromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT3-066"));
    await settle(() => false, 80);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(
      expect.arrayContaining(["EX12-058", "BT3-066"]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT14-062", "BT14-015"]),
    );
    expect(s.state.memory).toBe(-1);
  });

  it("grants Alliance and Reboot to every own ME Digimon, but not to a non-ME Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX12-058", as: "hiandromon" },
          { card: "EX12-055", as: "me" },
          { card: "BT1-009", as: "other" },
        ],
      },
    });
    await s.ready();

    for (const keyword of ["Alliance", "Reboot"] as const) {
      expect(observe(s.engine).hasKeyword(s.perm("hiandromon"), keyword)).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("me"), keyword)).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("other"), keyword)).toBe(false);
    }
  });

  it("trashes all revealed cards when no Machine, Cyborg, or ME card matches", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-058", as: "hiandromon" }],
          deck: ["BT1-009", "BT1-014", "BT1-016"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hiandromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 0 && s.state.players[0]!.trash.length === 3);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["EX12-058"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-014", "BT1-016"]),
    );
  });

  it("Q7193 lets the attacker suspend the ME Digimon it just played as its Alliance ally", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-058", as: "attacker" }],
          deck: [
            { card: "EX12-055", as: "newAlly" },
            { card: "BT1-009", as: "restOne" },
            { card: "BT1-014", as: "restTwo" },
          ],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX12-055"));
    const newAlly = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "EX12-055")!;
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
    await settle(() => combat.hasOpenAllianceDecision);
    expect(observe(s.engine).hasKeyword(newAlly, "Alliance")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: newAlly.permanentId } as never)).toEqual(
      {
        ok: true,
      },
    );
    await settle(() => newAlly.isSuspended && s.state.players[1]!.security.length === 1);

    expect(newAlly.isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("restOne").instanceId, s.inst("restTwo").instanceId]),
    );
  });

  it("shares one reveal budget across all three printed timings", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-058", as: "source" }],
          deck: ["BT3-066", "BT1-009", "BT1-010", "BT3-066", "BT1-014", "BT1-016"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.players[0]!.deck.length === 3);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));

    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT3-066")).toHaveLength(1);
  });

  it("accepts every DNA color pair and rejects two first-group materials", async () => {
    for (const [first, second] of [
      ["EX12-055", "BT10-013"],
      ["EX12-055", "EX12-045"],
      ["BT10-079", "BT10-013"],
      ["BT10-079", "EX12-045"],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [
            { card: first, as: "first" },
            { card: second, as: "second" },
          ],
          hand: [{ card: "EX12-058", as: "target" }],
        },
      });
      expect(
        s.engine.applyIntent(0, {
          type: "dnaDigivolve",
          materialPermanentIds: [s.perm("first").permanentId, s.perm("second").permanentId],
          instanceId: s.inst("target").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX12-058"));
    }

    const invalid = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-064", as: "black" },
          { card: "BT10-079", as: "purple" },
        ],
        hand: [{ card: "EX12-058", as: "target" }],
      },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [invalid.perm("black").permanentId, invalid.perm("purple").permanentId],
        instanceId: invalid.inst("target").instanceId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("uses both normal colors and the ME alternate, rejects a nonmatch, and matches catalog identity", async () => {
    expect(getCardDefinition("EX12-058")).toMatchObject({
      nameEn: "HiAndromon",
      colors: ["Black", "Yellow"],
      kinds: ["Digimon"],
      playCost: 11,
      dp: 11000,
      level: 6,
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Cyborg", "ME"],
      evoCosts: [
        { color: "Black", level: 5, memoryCost: 3 },
        { color: "Yellow", level: 5, memoryCost: 3 },
      ],
    });
    for (const [baseCardId, useAlternateCost] of [
      ["EX12-055", false],
      ["EX12-045", false],
      ["EX12-055", true],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: "EX12-058", as: "target" }] },
      });
      s.state.memory = 3;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("target").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX12-058");
      expect(s.state.memory).toBe(0);
    }
    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-040", as: "base" }], hand: [{ card: "EX12-058", as: "target" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("target").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
