import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-013.js";
import "./EX2-014.js";
import "../BT1/BT1-003.js";
import "../BT1/BT1-036.js";
import "../BT1/BT1-032.js";
import { compiled } from "./EX2-013.js";

const INERT_SECURITY = ["BT1-009", "BT1-013", "BT1-014"];
const FILLER_DECK = ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"];

describe("EX2-013 Labramon", () => {
  it("matches the catalog and compiles the inherited Jamming watcher", () => {
    expect(getCardDefinition("EX2-013")).toMatchObject({
      cardId: "EX2-013",
      nameEn: "Labramon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Beast"],
      inheritedEffectText: "[When Attacking][Once Per Turn] If this Digimon has ＜Jamming＞, gain 1 memory.",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "WhenAttacking",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
              condition: { kind: "selfHasKeyword", keyword: "Jamming" },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("gains 1 memory when its Jamming host attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-032", as: "host", under: [{ card: "EX2-013", as: "source" }] }] },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 4);
    expect(s.state.memory).toBe(4);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });

  it("does not gain memory when its host lacks Jamming", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-014", as: "host", under: ["EX2-013"] }] },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.memory).toBe(3);
  });

  it("evolves legally from a blue level-2 egg and rejects a red egg source", async () => {
    const legal = setupEngine(
      {
        0: {
          breeding: { card: "BT1-003", as: "blueEgg" },
          hand: [{ card: "EX2-013", as: "labramon" }],
        },
      },
      { autoSelectCards: true },
    );
    legal.state.memory = 5;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("blueEgg").permanentId,
        instanceId: legal.inst("labramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("blueEgg").topCard?.cardId === "EX2-013");
    expect(legal.perm("blueEgg").topCard?.cardId).toBe("EX2-013");
    expect(legal.perm("blueEgg").stack.map((card) => card.cardId)).toEqual(["BT1-003"]);
    expect(legal.state.memory).toBe(5);

    const illegal = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "redEgg" },
        hand: [{ card: "EX2-013", as: "labramon" }],
      },
    });
    illegal.state.memory = 5;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("redEgg").permanentId,
        instanceId: illegal.inst("labramon").instanceId,
      }),
    ).toMatchObject({ ok: false });
  });

  it("resets the inherited Once Per Turn watcher across the public turn loop", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-032", as: "host", under: [{ card: "EX2-013", as: "source" }] }],
          hand: [{ card: "BT1-036", as: "unsuspender" }],
          deck: FILLER_DECK,
          security: ["BT1-009"],
        },
        1: { deck: FILLER_DECK, security: INERT_SECURITY },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    // Memory 10 is the hard positive-side gauge cap. Start at 9 so the inherited +1 is
    // observable; a start at 10 would correctly refuse the gain rather than expose a timing
    // seam (see EX2-013-TURN-LOOP-MECHANISM.md).
    s.state.memory = 9;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
      const memoryBeforeFirstAttack = s.state.memory;
      expect(memoryBeforeFirstAttack).toBe(9);

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.memory === memoryBeforeFirstAttack + 1);
      await settle(() => !observe(s.engine).isAttacking() && s.perm("host").isSuspended);
      expect(s.state.memory).toBe(memoryBeforeFirstAttack + 1);

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspender").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => !s.perm("host").isSuspended);
      expect(s.state.memory).toBe(4);
      const secondBeforeAttack = s.state.memory;

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking() && s.perm("host").isSuspended);
      // The attack's later security/turn-loop cleanup may move the gauge independently of
      // this card. Compare against the exact pre-attack baseline instead of assuming the
      // settled gauge remains positive; a second inherited activation would still be visible
      // as +1 from this baseline.
      expect(s.state.memory).not.toBe(secondBeforeAttack + 1);

      advance(s.engine).endMainPhaseIfOpen(0);
      await advance(s.engine).waitForMainPhase(1);
      advance(s.engine).endMainPhaseIfOpen(1);
      await advance(s.engine).waitForMainPhase(0);
      expect(s.perm("host").isSuspended).toBe(false);
      const beforeResetAttack = s.state.memory;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.memory === beforeResetAttack + 1);
      await settle(() => !observe(s.engine).isAttacking() && s.perm("host").isSuspended);
      expect(s.state.memory).toBe(beforeResetAttack + 1);
    } finally {
      if (!s.state.gameOver) s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
