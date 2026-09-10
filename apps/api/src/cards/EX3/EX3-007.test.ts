import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX3-007.js";
import "./EX3-011.js";

describe("EX3-007 Lavorvomon", () => {
  it("matches its official card identity and inherited text", () => {
    expect(getCardDefinition("EX3-007")).toMatchObject({
      nameEn: "Lavorvomon",
      colors: ["Red"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [
        { color: "Red", level: 3, memoryCost: 2 },
        { color: "Black", level: 3, memoryCost: 2 },
      ],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Rock Dragon"],
      imageId: "EX3-007",
      inheritedEffectText:
        "[When Attacking] If this Digimon has an [On Play] effect, delete 1 of your opponent's Digimon with 3000 DP or less.",
    });
  });

  it("publishes full inherited metadata with the typed On Play gate", () => {
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "WhenAttacking",
          isInherited: true,
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } },
                count: 1,
              },
              condition: { kind: "selfHasOnPlayEffect" },
            },
          ],
        },
      ],
    });
  });

  it("offers only the 3000 DP boundary with the inherited source payload", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX3-011", under: ["EX3-007"], as: "attacker" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "atBoundary", dp: 3000 },
            { card: "BT1-009", as: "otherLegal", dp: 2000 },
            { card: "BT1-009", as: "aboveBoundary", dp: 4000 },
          ],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const atBoundaryId = s.perm("atBoundary").permanentId;
    const otherLegalId = s.perm("otherLegal").permanentId;
    const aboveBoundaryId = s.perm("aboveBoundary").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("atBoundary").instanceId),
    );

    const decision = s.decisions.find(({ req }) => req.kind === "chooseTargets" && req.sourceCardId === "EX3-007")!.req;
    const payload = decision.options!;
    expect(payload).toMatchObject({
      candidateInstanceIds: expect.arrayContaining([atBoundaryId, otherLegalId]),
      min: 1,
      max: 1,
    });
    expect(payload.candidateInstanceIds).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(aboveBoundaryId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not activate for a carrier without an On Play effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-020", under: ["EX3-007"], as: "attacker" }] },
      1: { battleArea: [{ card: "BT1-009", dp: 3000 }], security: ["BT1-009"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.decisions).toHaveLength(0);
  });

  it("ignores non-Digimon and opens no decision when there is no legal deletion target", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-011", under: ["EX3-007"], as: "attacker" }] },
      1: { battleArea: [{ card: "EX3-065", as: "hina" }], security: ["BT1-009"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.decisions).toHaveLength(0);
  });

  it("resolves two inherited copies independently", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX3-011", under: ["EX3-007", "EX3-007"], as: "attacker" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", dp: 3000 },
            { card: "BT1-009", as: "second", dp: 3000 },
          ],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const firstId = s.inst("first").instanceId;
    const secondId = s.inst("second").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([firstId, secondId]),
    );
  });

  it.each([
    ["red", "BT1-009"],
    ["black", "BT13-063"],
  ] as const)("digivolves from a %s level-3 source for the printed cost", async (_color, baseCardId) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCardId, as: "base" }],
        hand: [{ card: "EX3-007", as: "lavorvomon" }],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lavorvomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-007");
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual([baseCardId]);
    expect(s.state.memory).toBe(0);
  });

  it("rejects an off-color blue level-3 source and leaves the card in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-028", as: "base" }],
        hand: [{ card: "EX3-007", as: "lavorvomon" }],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lavorvomon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("base").topCard.cardId).toBe("BT1-028");
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("lavorvomon").instanceId);
  });

  it("retains the inherited source through public evolution and attack resolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "base" }],
          hand: [
            { card: "EX3-007", as: "lavorvomon" },
            { card: "EX3-011", as: "top" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }], security: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lavorvomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-007");
    expect(s.state.memory).toBe(3);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("top").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-011");
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009", "EX3-007"]);
    expect(s.state.memory).toBe(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("target").instanceId));
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
