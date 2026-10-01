import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-048.js";
import { settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT14-048", () => {
  it("may digivolve into a level-six Leomon from hand for six when attacking a higher-DP Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions[0]).toMatchObject({
      kind: "Digivolve",
      payCost: true,
      from: ["hand"],
      costOverride: 6,
      ignoreRequirements: true,
      condition: { kind: "lastTargetDpGreaterThanSelf" },
      into: { levels: [6], nameOrTrait: [{ tokens: ["Leomon"], match: "name" }] },
    }));
  it("inherits +2000 DP for Leomon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [{ kind: "Aura", effect: { amount: 2000 }, while: { kind: "selfHasNameContaining" } }],
    }));
  it("digivolves after attacking a higher-DP Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-048", as: "attacker" }], hand: [{ card: "BT14-054", as: "evo" }] },
        1: { battleArea: [{ card: "BT14-044", as: "target", dp: 10000, suspended: true }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-054"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-054")).toBe(true);
    expect(s.perm("attacker").currentDP).toBe(14000);
  });
});

describe("BT14-048 Leomon — KB Q&A rulings", () => {
  async function attackWithLeomon(options: { target: "player" | "suspendedDigimon"; block: boolean }) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-048", as: "leomon" }],
          hand: [{ card: "BT14-054", as: "saberLeomon" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "ST18-07", as: "blocker", dp: 10000 },
            { card: "BT14-044", as: "suspendedTarget", dp: 10000, suspended: true },
          ],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const target =
      options.target === "player"
        ? ({ kind: "player" } as const)
        : ({ kind: "permanent", permanentId: s.perm("suspendedTarget").permanentId } as const);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("leomon").permanentId, target }),
    ).toEqual({ ok: true });
    if (options.block) {
      await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
      const blockResult = s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker").permanentId,
      });
      if (!blockResult.ok) throw new Error(`block was rejected: ${JSON.stringify(blockResult)}`);
    }
    await settle();
    return s;
  }

  const digivolvedIntoSaberLeomon = (s: EngineSetup) =>
    s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-054");

  it("cannot digivolve after a higher-DP Digimon blocks an attack on the player (Q2417)", async () => {
    const blocked = await attackWithLeomon({ target: "player", block: true });
    expect(blocked.state.players[1]!.security).toHaveLength(1);
    expect(digivolvedIntoSaberLeomon(blocked)).toBe(false);
    expect(blocked.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT14-054");
    expect(blocked.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "BT14-048")).toBe(false);

    const declaredOnDigimon = await attackWithLeomon({ target: "suspendedDigimon", block: false });
    expect(digivolvedIntoSaberLeomon(declaredOnDigimon)).toBe(true);
    expect(
      declaredOnDigimon.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "BT14-048"),
    ).toBe(true);
  });

  it("cannot digivolve when <Raid> switches an attack on the player to a higher-DP Digimon (Q2418)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-048", as: "leomon", under: ["P-097"] },
            { card: "BT2-055", as: "blackDigimon" },
          ],
          hand: [{ card: "BT14-054", as: "saberLeomon" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT14-044", as: "raidTarget", dp: 10000 }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: ["Raid", "P-097"] },
    );
    s.state.memory = 10;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("leomon"), "Raid")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("leomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    const raidTargetId = s.perm("raidTarget").permanentId;
    expect(
      s.events.some(
        (event) =>
          event.kind === "attackDeclared" &&
          event.target.kind === "permanent" &&
          event.target.permanentId === raidTargetId,
      ),
    ).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(digivolvedIntoSaberLeomon(s)).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT14-054");
  });
});
