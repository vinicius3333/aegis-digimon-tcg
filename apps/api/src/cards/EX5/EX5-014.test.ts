import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-014.js";
import "../BT3/BT3-036.js";
import "../index.js";

describe("EX5-014 Apollomon", () => {
  it("matches the catalog and has complete IR coverage", () => {
    expect(getCardDefinition("EX5-014")).toMatchObject({
      cardId: "EX5-014",
      nameEn: "Apollomon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Red", level: 5, memoryCost: 4 },
        { color: "Blue", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Shaman", "Olympos XII", "Light Fang"],
      effectText: expect.stringContaining("delete 1 of your opponent’s Digimon"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("has Blitz and gains Security Attack plus one per three digivolution cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.keywords).toMatchObject([
      { keyword: "Blitz" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0]).toMatchObject({
      target: { filter: { isSelfRef: true } },
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: 1 },
      duration: "permanent",
      scaling: { per: 3, unit: "digivolutionCards" },
    });
  });
  it("deletes an opposing Digimon at or below the source's DP when security is removed", () => {
    expect(compiled.effects?.filter((entry) => entry.trigger === "YourTurn")[1]).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          actions: [
            {
              kind: "Delete",
              target: { filter: { controller: "opponent", dp: { op: "lte", relativeToSource: true } } },
            },
          ],
        },
      ],
    });
  });

  it("gains inherited Security Attack plus one for every three digivolution cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX5-014", as: "six", under: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"] },
          { card: "EX5-014", as: "three", under: ["BT1-009", "BT1-010", "BT1-011"] },
          { card: "EX5-014", as: "two", under: ["BT1-009", "BT1-010"] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("six"), "SecurityAttack")).toBe(2);
    expect(observe(s.engine).keywordAmount(s.perm("three"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("two"), "SecurityAttack")).toBe(0);
  });

  it("uses Blitz after a legal red evolution while opponent memory is positive", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX5-012", as: "base" }],
        hand: [{ card: "EX5-014", as: "apollo" }],
      },
      1: { security: ["BT1-009"] },
    });
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("apollo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX5-014", 500);
    expect(s.state.memory).toBe(6);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX5-012"]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 0, 5000);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("takes the legal blue route and rejects an illegal level source", async () => {
    const blue = setupEngine({
      0: {
        battleArea: [{ card: "EX5-020", as: "base" }],
        hand: [{ card: "EX5-014", as: "apollo" }],
      },
    });
    await blue.ready();
    blue.state.memory = 4;
    expect(
      blue.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: blue.perm("base").permanentId,
        instanceId: blue.inst("apollo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => blue.perm("base").topCard?.cardId === "EX5-014", 500);
    expect(blue.state.memory).toBe(0);
    expect(blue.perm("base").stack.map((card) => card.cardId)).toEqual(["EX5-020"]);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-014", as: "base" }], hand: [{ card: "EX5-014", as: "apollo" }] },
    });
    await illegal.ready();
    illegal.state.memory = 4;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("apollo").instanceId,
      }).ok,
    ).toBe(false);
    expect(illegal.state.memory).toBe(4);
    expect(illegal.perm("base").topCard?.cardId).toBe("BT1-014");
    expect(illegal.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: illegal.inst("apollo").instanceId }),
    );
  });

  it("deletes one opposing Digimon at the DP boundary after a public security check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-014", as: "apollo", under: ["BT1-009", "BT1-010", "BT1-011"] }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 12_000, as: "boundary" },
            { card: "BT1-010", dp: 12_001, as: "tooLarge" },
          ],
          security: ["BT1-012"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const boundaryId = s.perm("boundary").permanentId;
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("apollo").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === boundaryId), 5000);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === boundaryId)).toBe(false);
    expect(
      s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("tooLarge").permanentId),
    ).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("answers Q3551 with real checks: a first no-target trigger blocks the second check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-014", as: "apollo", under: ["BT1-009", "BT1-010", "BT1-011"] }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: { security: ["BT3-036", "BT1-009"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;
    const ankylomonId = s.state.players[1]!.security[0]!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("apollo").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[1]!.security.length === 0 &&
        s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === ankylomonId),
      5000,
    );
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === ankylomonId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("shares the security-removal Once Per Turn use across checks and resets next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-014", as: "apollo", under: ["BT1-009", "BT1-010", "BT1-011"] }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstTarget", dp: 12_000 },
            { card: "BT1-010", as: "secondTarget", dp: 8_000 },
          ],
          security: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoSelectCards: true },
    );
    const firstTargetId = s.perm("firstTarget").permanentId;
    const secondTargetId = s.perm("secondTarget").permanentId;
    void s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 0, 5000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("apollo").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        !s.state.players[1]!.battleArea.some((perm) => perm.permanentId === firstTargetId),
      5000,
    );
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === secondTargetId)).toBe(true);
    expect(s.state.phase).toBe("Main");
    expect(s.state.turnSeat).toBe(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 0, 5000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("apollo").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        !s.state.players[1]!.battleArea.some((perm) => perm.permanentId === secondTargetId),
      5000,
    );
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === secondTargetId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.phase).toBe("Main");
  });
});
