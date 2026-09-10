import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT1-025.js";
import "./BT1-112.js";

describe("BT1-025 WarGreymon", () => {
  it("matches the catalog and compiles both printed clauses", () => {
    expect(getCardDefinition("BT1-025")).toMatchObject({
      cardId: "BT1-025",
      nameEn: "WarGreymon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 11000,
      evoCosts: [{ color: "Red", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Dragonkin"],
      effectText:
        "[When Digivolving] This Digimon gains ＜Security Attack +1＞ (This Digimon checks 1 additional security card) for the turn. [Your Turn] This Digimon doesn't activate [Security] skills on Option cards it checks.",
    });
    expect(getCardDefinition("BT1-025")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("BT1-025")?.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            {
              kind: "GainKeyword",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
              duration: "forTheTurn",
            },
          ],
        },
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "DisableSecurityEffect",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              sourceKind: "option",
              duration: "forTheTurn",
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("gains Security Attack +1 for the turn when digivolving", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-020", as: "base" }],
        hand: [{ card: "BT1-025", as: "evolving" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
      1: { security: ["BT1-010", "BT1-011", "BT1-012"] },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "SecurityAttack"));
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-020"]);
    expect(s.perm("base").topCard?.cardId).toBe("BT1-025");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not activate Security effects on checked Option cards during its turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-025", as: "attacker", dp: 20000 }] },
      1: { security: [{ card: "BT1-112", as: "option" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("suppresses Option Security effects only during its owner's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-025", as: "attacker" }] } });
    await s.ready();

    expect(observe(s.engine).suppressesSecurityEffect(s.perm("attacker"), "BT1-112")).toBe(true);
    expect(observe(s.engine).suppressesSecurityEffect(s.perm("attacker"), "BT1-085")).toBe(false);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).suppressesSecurityEffect(s.perm("attacker"), "BT1-112")).toBe(false);
  });
});
