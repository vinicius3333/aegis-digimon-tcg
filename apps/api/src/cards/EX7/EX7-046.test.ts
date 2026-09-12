import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-046.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "surrender" }).ok)
    throw new Error("failed to stop loop");
  await loop;
}

describe("EX7-046", () => {
  it("matches the catalog, complete IR, and exclusive registration", () => {
    expect(getCardDefinition("EX7-046")).toMatchObject({
      cardId: "EX7-046",
      nameEn: "Jazarichmon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Black", level: 4, memoryCost: 3 },
        { color: "Red", level: 4, memoryCost: 3 },
      ],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Machine Dragon"],
      effectText:
        "[On Play] ＜De-Digivolve1＞ 1 of your opponent's Digimon (Trash the top card. You can't trash past level 3 cards)\n[When Digivolving] If your opponent doesn't have a level 5 or higher Digimon, gain 1 memory.",
      inheritedEffectText:
        "[Opponent's Turn] [Once Per Turn] When an opponent's Digimon attacks, you may change the attack target to this Digimon.",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "DeDigivolve",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      amount: 1,
      stopAtLevel: 3,
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: {
        kind: "opponentHasNone",
        filter: { controllerDefault: "opponent", kind: ["Digimon"], levelComparison: { op: "gte", value: 5 } },
      },
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        { kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "RedirectAttack", optional: true }] },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(hasRegisteredCompiledCard("EX7-046")).toBe(true);
  });

  it("publicly de-digivolves on play and gains memory only when no opposing level 5 exists", async () => {
    const onPlay = setupEngine(
      {
        0: { hand: [{ card: "EX7-046", as: "jazar" }] },
        1: { battleArea: [{ card: "EX7-014", as: "target", under: ["EX7-011"] }] },
      },
      { autoSelectCards: true },
    );
    onPlay.state.memory = 10;
    await onPlay.ready();
    expect(onPlay.engine.applyIntent(0, { type: "playCard", instanceId: onPlay.inst("jazar").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => onPlay.perm("target").topCard.cardId === "EX7-011");
    expect(onPlay.state.memory).toBe(3);
    expect(onPlay.perm("target").stack).toHaveLength(0);

    const withNoLevelFive = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-010", as: "base" }],
          hand: [{ card: "EX7-046", as: "jazar" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "small" }] },
      },
      { autoSelectCards: true },
    );
    withNoLevelFive.state.memory = 5;
    await withNoLevelFive.ready();
    const sourceId = withNoLevelFive.inst("base").instanceId;
    expect(
      withNoLevelFive.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: withNoLevelFive.perm("base").permanentId,
        instanceId: withNoLevelFive.inst("jazar").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => withNoLevelFive.perm("base").topCard.cardId === "EX7-046");
    expect(withNoLevelFive.state.memory).toBe(3);
    expect(withNoLevelFive.perm("base").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(withNoLevelFive.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      withNoLevelFive.inst("drawn").instanceId,
    ]);

    const withLevelFive = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-041", as: "base" }], hand: [{ card: "EX7-046", as: "jazar" }] },
        1: { battleArea: [{ card: "EX7-011", as: "large" }] },
      },
      { autoSelectCards: true },
    );
    withLevelFive.state.memory = 5;
    await withLevelFive.ready();
    expect(
      withLevelFive.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: withLevelFive.perm("base").permanentId,
        instanceId: withLevelFive.inst("jazar").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => withLevelFive.perm("base").topCard.cardId === "EX7-046");
    expect(withLevelFive.state.memory).toBe(2);
  });

  it("publicly redirects once per opponent turn, refuses a second attack, and rearms next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-049", as: "host", under: ["EX7-046"] }],
          security: ["BT1-014", "BT1-015", "BT1-016"],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker", dp: 3000 },
            { card: "BT1-010", as: "secondAttacker", dp: 3000 },
            { card: "BT1-011", as: "thirdAttacker", dp: 3000 },
          ],
          deck: ["BT1-014", "BT1-015", "BT1-016"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009"));
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    const thirdId = s.perm("thirdAttacker").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: thirdId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === thirdId));
    expect(s.state.players[0]!.security).toHaveLength(2);
    await stopLoop(s, loop, 1);
  });
});
