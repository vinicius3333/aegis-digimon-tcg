import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX2-009.js";

describe("EX2-009 Growlmon", () => {
  it("matches the catalog and compiles both printed effects", () => {
    expect(getCardDefinition("EX2-009")).toMatchObject({
      cardId: "EX2-009",
      nameEn: "Growlmon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 5000,
      evoCosts: [{ color: "Red", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Dark Dragon"],
      effectText:
        "[When Attacking] Delete 1 of your opponent's Digimon with 2000 DP or less. If you have a red Tamer in play, delete 1 of your opponent's Digimon with 4000 DP or less instead.",
      inheritedEffectText:
        "[When Attacking][Once Per Turn] If this Digimon has [Growlmon] or [Gallantmon] in its name, delete 1 of your opponent's Digimon with 3000 DP or less.",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "WhenAttacking",
          actions: [
            {
              kind: "Delete",
              target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 2000 } } },
            },
            {
              kind: "Delete",
              target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } } },
            },
          ],
        },
        {
          trigger: "WhenAttacking",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "Delete",
              target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } } },
              condition: { kind: "selfHasNameContaining", names: ["Growlmon", "Gallantmon"] },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("uses only the 4000 DP replacement limit with a red Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-009", as: "attacker" }, "EX2-056"] },
        1: {
          battleArea: [
            { card: "ST1-04", as: "target4000" },
            { card: "ST4-09", as: "target7000" },
          ],
          security: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    const target7000Id = s.perm("target7000").permanentId;
    await s.ready();
    expect(s.perm("target4000").currentDP).toBe(4000);
    expect(s.perm("target7000").currentDP).toBe(7000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(target7000Id);
  });

  it("uses the 2000 DP base limit without a red Tamer, even with a blue Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-009", as: "attacker" }, "EX2-057"] },
        1: {
          battleArea: [
            { card: "ST1-04", as: "target4000" },
            { card: "ST7-02", as: "target2000" },
          ],
          security: ["BT1-010"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("target4000").permanentId);
  });

  it("deletes a 3000 DP target from a Growlmon-family host as an inherited effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-010", under: [{ card: "EX2-009", as: "source" }], as: "attacker" }] },
        1: { battleArea: [{ card: "EX2-031", dp: 3000, as: "target" }], security: ["BT1-011"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not apply the inherited effect when the host name is outside the Growlmon family", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST7-07", under: [{ card: "EX2-009", as: "source" }], as: "attacker" }] },
        1: { battleArea: [{ card: "EX2-031", dp: 3000, as: "target" }], security: ["BT1-012"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("reaches Growlmon through a legal red evolution, draws, and applies its base effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "source" }],
          hand: [{ card: "EX2-009", as: "growlmon" }],
          deck: [{ card: "BT1-010", as: "evolutionDraw" }],
        },
        1: {
          battleArea: [
            { card: "ST7-02", dp: 2000, as: "target2000" },
            { card: "ST1-04", dp: 4000, as: "target4000" },
          ],
          security: ["BT1-011"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.instanceId === s.inst("growlmon").instanceId);
    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolutionDraw").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("target4000").permanentId);
  });

  it("rejects evolving from a non-red level-3 source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-015", as: "blueSource" }], hand: [{ card: "EX2-009", as: "growlmon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueSource").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toMatchObject({ ok: false });
  });

  it("resets its inherited deletion after a real Active phase and next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          // Legal red stack: BT1-009 (Lv.3) -> EX2-009 (Lv.4) -> ST7-08 (Lv.5) -> P-186 (Lv.6).
          battleArea: [
            {
              card: "P-186",
              under: ["BT1-009", "EX2-009", "ST7-08"],
              as: "attacker",
            },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "EX2-031", dp: 3000, as: "target" },
            { card: "EX2-031", dp: 3000, as: "secondTarget" },
            { card: "EX2-031", dp: 4000, as: "aboveLimit" },
            "BT1-010",
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    const finishPublicAttack = async (): Promise<void> => {
      await settle(() => !observe(s.engine).isAttacking() || observe(s.engine).blockingSeat() === 1);
      const blockingSeat = observe(s.engine).blockingSeat();
      expect(blockingSeat === undefined || blockingSeat === 1).toBe(true);
      const blockResult =
        blockingSeat === 1 ? s.engine.applyIntent(1, { type: "declineBlock" }) : { ok: true as const };
      expect(blockResult).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
    };
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await finishPublicAttack();
    await settle(() => s.state.players[1]!.battleArea.length === 3);
    expect(s.perm("attacker").isSuspended).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("attacker").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("attacker").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await finishPublicAttack();
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
