import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT19-042.js";
import { X_ANTIBODY_NAME_PROBES, xAntibodyNameGateVerdicts } from "../../engine/testkit/xAntibodyNameGate.js";

async function runTurnWith(s: EngineSetup, seat: 0 | 1, body: () => Promise<void>): Promise<void> {
  const driver = advance(s.engine);
  const turn = s.engine.runOneTurn();
  await driver.waitForMainPhase(seat);
  await body();
  driver.endMainPhaseIfOpen(seat);
  await turn;
}

const securityIds = (s: EngineSetup, seat: 0 | 1): string[] =>
  s.state.players[seat]!.security.map((card) => card.instanceId);

describe("BT19-042 Dynasmon (X Antibody)", () => {
  it("matches the catalog print and evolution costs", () => {
    expect(getCardDefinition("BT19-042")).toMatchObject({
      cardId: "BT19-042",
      nameEn: "Dynasmon (X Antibody)",
      colors: ["Yellow", "Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Holy Warrior", "X Antibody", "Royal Knight"],
      evoCosts: [
        { color: "Yellow", level: 5, memoryCost: 4 },
        { color: "Red", level: 5, memoryCost: 4 },
      ],
      maxCountInDeck: 4,
    });
    const printed = getCardDefinition("BT19-042")!.effectText!;
    expect(printed).toContain("[Digivolve][Dynasmon]: Cost 1");
    expect(printed).toContain("＜Raid＞");
    expect(printed).toContain("＜Blocker＞");
    expect(printed).toContain(
      "[When Digivolving] [When Attacking] [Once Per Turn] If [Dynasmon]/[X Antibody] is in this Digimon's digivolution cards, by trashing the top card of your security stack, trash the top card of your opponent's security stack, and this Digimon gets +6000 DP until the end of your opponent's turn.",
    );
    expect(printed).toContain("[End of Your Turn] If you have 2 or fewer security cards, ＜Recovery +1 (Deck)＞.");
  });

  it("compiles the bracketed name gates exactly and the own security card as the only cost", () => {
    expect(digivolutionRequirementsFor("BT19-042")).toEqual([{ namesExact: ["Dynasmon"], cost: 1, isAlternate: true }]);

    const digivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")!;
    const attacking = compiled.effects.find((effect) => effect.trigger === "WhenAttacking")!;
    for (const effect of [digivolving, attacking]) {
      expect(effect.frequency).toBe("OncePerTurn");
      expect(effect.sharedUseKey).toBe("ir-shared-0");
      expect(effect.actions[0]).toMatchObject({
        kind: "trashSecurityTop",
        controller: "opponent",
        cost: { kind: "trashSecurityTop" },
        condition: {
          kind: "selfHasInDigivolutionCards",
          nameOrTrait: [
            { tokens: ["Dynasmon"], match: "nameExact" },
            { tokens: ["X Antibody"], match: "nameExact" },
          ],
        },
      });
      expect(effect.actions[1]).toMatchObject({ kind: "ModifyDP", amount: 6000, duration: "untilOpponentTurnEnd" });
    }
  });

  it("digivolves for 1 memory from a printed [Dynasmon] and fires the clause on the real stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT19-041", as: "base", under: ["BT1-057"] }],
        hand: [{ card: "BT19-042", as: "dynasX" }, "BT1-009"],
        deck: ["BT1-009", "BT1-009"],
        security: [
          { card: "BT1-009", as: "mineTop" },
          { card: "BT1-013", as: "mineSecond" },
          { card: "BT1-014", as: "mineThird" },
        ],
      },
      1: {
        security: [
          { card: "BT1-009", as: "oppTop" },
          { card: "BT1-013", as: "oppSecond" },
        ],
      },
    });
    s.state.memory = 3;
    await s.ready();

    await runTurnWith(s, 0, async () => {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("dynasX").instanceId,
          useAlternateCost: true,
          alternateRequirementIndex: 0,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "BT19-042");
      await settle(() => s.perm("base").currentDP === 18000);

      expect(s.state.memory).toBe(2);
      const host = s.perm("base");
      expect(host.stack.map((card) => card.cardId)).toEqual(["BT1-057", "BT19-041"]);
      expect(host.currentDP).toBe(18000);
      expect(securityIds(s, 0)).toEqual([s.inst("mineSecond").instanceId, s.inst("mineThird").instanceId]);
      expect(securityIds(s, 1)).toEqual([s.inst("oppSecond").instanceId]);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("mineTop").instanceId);
      expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("oppTop").instanceId);
      expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
    });
  });

  it("refuses the cost-1 route from a near-miss [Dynasmon (X Antibody)] base and from an illegal level", async () => {
    for (const base of ["BT19-042", "BT1-014"]) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [{ card: "BT19-042", as: "dynasX" }, "BT1-009"],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009"],
        },
        1: { security: ["BT1-009"] },
      });
      s.state.memory = 6;
      await s.ready();

      await runTurnWith(s, 0, async () => {
        expect(
          s.engine.applyIntent(0, {
            type: "digivolve",
            permanentId: s.perm("base").permanentId,
            instanceId: s.inst("dynasX").instanceId,
            useAlternateCost: true,
            alternateRequirementIndex: 0,
          }).ok,
        ).toBe(false);
        expect(s.perm("base").topCard?.cardId).toBe(base);
        expect(s.state.players[0]!.security).toHaveLength(1);
        expect(s.state.players[1]!.security).toHaveLength(1);
      });
    }
  });

  it("digivolves at the printed cost 4 from a legal Lv.5 yellow base without the alternate route", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-057", as: "base" }],
        hand: [{ card: "BT19-042", as: "dynasX" }, "BT1-009"],
        deck: ["BT1-009", "BT1-009"],
        security: ["BT1-009"],
      },
      1: { security: ["BT1-009"] },
    });
    s.state.memory = 6;
    await s.ready();

    await runTurnWith(s, 0, async () => {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("dynasX").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "BT19-042");
      expect(s.state.memory).toBe(2);
      expect(s.perm("base").currentDP).toBe(12000);
      expect(s.state.players[0]!.security).toHaveLength(1);
      expect(s.state.players[1]!.security).toHaveLength(1);
    });
  });

  it("accepts an [X Antibody] digivolution card as the other arm of the gate", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT19-042", as: "dynasX", under: ["BT9-109"] }],
        hand: ["BT1-009"],
        deck: ["BT1-009", "BT1-009"],
        security: [{ card: "BT1-009", as: "mineTop" }, "BT1-013"],
      },
      1: {
        battleArea: [{ card: "BT1-020", as: "prey", suspended: true }],
        security: [{ card: "BT1-009", as: "oppTop" }, "BT1-013"],
      },
    });
    await s.ready();

    await runTurnWith(s, 0, async () => {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("dynasX").permanentId,
          target: { kind: "permanent", permanentId: s.perm("prey").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      expect(securityIds(s, 0)).toHaveLength(1);
      expect(securityIds(s, 1)).toHaveLength(1);
      expect(securityIds(s, 0)).not.toContain(s.inst("mineTop").instanceId);
      expect(securityIds(s, 1)).not.toContain(s.inst("oppTop").instanceId);
    });
  });

  it("still pays and boosts when the opponent's security stack is empty", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT19-042", as: "dynasX", under: ["BT19-041"] }],
        hand: ["BT1-009"],
        deck: ["BT1-009", "BT1-009"],
        security: [{ card: "BT1-009", as: "mineTop" }, "BT1-013"],
      },
      1: { battleArea: [{ card: "BT1-020", as: "prey", suspended: true }], security: [] },
    });
    await s.ready();

    await runTurnWith(s, 0, async () => {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("dynasX").permanentId,
          target: { kind: "permanent", permanentId: s.perm("prey").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("dynasX").currentDP === 18000);
      expect(securityIds(s, 0)).toHaveLength(1);
      expect(securityIds(s, 0)).not.toContain(s.inst("mineTop").instanceId);
      expect(s.state.players[1]!.security).toHaveLength(0);
    });
  });

  it("does nothing at all when its own security stack is empty", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT19-042", as: "dynasX", under: ["BT19-041"] }],
        hand: ["BT1-009"],
        deck: ["BT1-009", "BT1-009"],
        security: [],
      },
      1: {
        battleArea: [{ card: "BT1-020", as: "prey", suspended: true }],
        security: [{ card: "BT1-009", as: "oppTop" }],
      },
    });
    await s.ready();

    await runTurnWith(s, 0, async () => {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("dynasX").permanentId,
          target: { kind: "permanent", permanentId: s.perm("prey").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      expect(s.perm("dynasX").currentDP).toBe(12000);
      expect(securityIds(s, 1)).toEqual([s.inst("oppTop").instanceId]);
    });
  });

  it("shares one use between the digivolve and attack timings and resets next own turn", async () => {
    const inert = (n: number): string[] => Array.from({ length: n }, () => "BT1-009");
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-041", as: "base", under: ["BT1-057"] }],
          hand: [{ card: "BT19-042", as: "dynasX" }, "BT1-009"],
          deck: inert(10),
          security: inert(5),
        },
        1: {
          battleArea: [
            { card: "BT1-020", as: "prey", suspended: true },
            { card: "BT1-024", as: "raider", suspended: true },
          ],
          hand: ["BT1-009"],
          deck: inert(10),
          security: inert(4),
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    const drive = advance(s.engine);

    await drive.waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dynasX").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").currentDP === 18000);
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[1]!.security).toHaveLength(3);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "permanent", permanentId: s.perm("prey").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.perm("base").currentDP).toBe(18000);
    drive.endMainPhaseIfOpen(0);

    await drive.waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("raider").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    const mySecurityAfterTheirAttack = s.state.players[0]!.security.length;
    drive.endMainPhaseIfOpen(1);

    await drive.waitForMainPhase(0);
    expect(s.perm("base").currentDP).toBe(12000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "permanent", permanentId: s.perm("raider").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").currentDP === 18000);
    expect(s.state.players[0]!.security).toHaveLength(mySecurityAfterTheirAttack - 1);
    expect(s.state.players[1]!.security).toHaveLength(2);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each([
    [2, true],
    [3, false],
  ] as const)("recovers 1 from the deck at end of your turn with %s security: %s", async (count, recovers) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT19-042", as: "dynasX" }],
        hand: ["BT1-009"],
        security: Array.from({ length: count }, () => "BT1-009"),
        deck: [{ card: "BT1-014", as: "deckTop" }, "BT1-009", "BT1-013"],
      },
      1: { security: ["BT1-009"] },
    });
    await s.ready();
    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[0]!.security.length === 3);

    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.security[0]!.instanceId === s.inst("deckTop").instanceId).toBe(recovers);
    expect(s.state.players[0]!.deck).toHaveLength(recovers ? 2 : 3);
  });

  it("＜Raid＞ redirects a declared player attack onto the highest-DP unsuspended Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-042", as: "dynasX", under: ["BT1-057"] }],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-024", as: "biggest" },
            { card: "BT1-020", as: "smaller" },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("dynasX"), "Raid")).toBe(true);

    await runTurnWith(s, 0, async () => {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("dynasX").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      expect(s.state.players[1]!.security).toHaveLength(2);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-020"]);
    });
  });

  it("＜Blocker＞ lets it take an attack declared at its controller", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT19-042", as: "dynasX", under: ["BT1-057"] }],
        hand: ["BT1-009"],
        deck: Array.from({ length: 8 }, () => "BT1-009"),
        security: ["BT1-009", "BT1-013", "BT1-014"],
      },
      1: {
        battleArea: [{ card: "BT1-020", as: "attacker" }],
        hand: ["BT1-009"],
        deck: Array.from({ length: 8 }, () => "BT1-009"),
        security: ["BT1-009", "BT1-013"],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("dynasX"), "Blocker")).toBe(true);

    const loop = s.engine.startTurnLoop();
    const drive = advance(s.engine);
    await drive.waitForMainPhase(0);
    drive.endMainPhaseIfOpen(0);

    await drive.waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("dynasX").permanentId })).toEqual(
      {
        ok: true,
      },
    );
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("BT19-042 [X Antibody] reference", () => {
  it("matches the X Antibody card name and its Rule aliases, not X Antibody-trait Digimon", () => {
    expect(xAntibodyNameGateVerdicts("BT19-042")).toEqual(X_ANTIBODY_NAME_PROBES);
  });
});
