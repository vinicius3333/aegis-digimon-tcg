import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT23-091.js";

const CS_DIGIMON = "BT22-053";
const CS_TAMER = "BT23-082";
const LOWEST = "BT1-049";
const HIGHER = "BT1-034";
const NON_CS = "BT1-028";
const FILLER = "BT1-030";

function delayPrompts(s: { decisions: { req: { kind: string; sourceCardId?: string } }[] }): number {
  return s.decisions.filter((d) => d.req.kind === "optional" && d.req.sourceCardId === "BT23-091").length;
}

describe("BT23-091 Wolkenapalm", () => {
  it("matches every catalog field and compiles all four printed clauses", () => {
    expect(getCardDefinition("BT23-091")).toMatchObject({
      cardId: "BT23-091",
      nameEn: "Wolkenapalm",
      colors: ["Red"],
      kinds: ["Option"],
      playCost: 5,
      types: ["CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.map((effect) => effect.trigger)).toEqual(["Static", "Main", "YourTurn", "Security"]);
  });

  it("rejects the play when no [CS] card and no Red source is on the board", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT23-091", as: "option" }], battleArea: [NON_CS] } });
    await s.ready();
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(5);
  });

  it("waives the color requirement for a battle-area [CS] Digimon", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT23-091", as: "option" }], battleArea: [{ card: CS_DIGIMON, as: "cs" }] },
    });
    await s.ready();
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("waives the color requirement for a battle-area [CS] Tamer", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT23-091", as: "option" }], battleArea: [{ card: CS_TAMER, as: "tamer" }] },
    });
    await s.ready();
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    assertNoLoudGap(s);
  });

  it("waives the color requirement for a [CS] Digimon in the breeding area (Q5364)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-091", as: "option" }], breeding: { card: CS_DIGIMON, as: "cs" } },
        1: { security: [FILLER, FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const optionInstanceId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionInstanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    const placed = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === optionInstanceId);
    expect(placed?.placedByEffect).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not waive the color requirement for an opponent's [CS] Digimon", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT23-091", as: "option" }] },
      1: { battleArea: [{ card: CS_DIGIMON, as: "opponentCs" }] },
    });
    await s.ready();
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });

  it("reads the [CS] trait from the top card only, not from the digivolution cards beneath", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT23-091", as: "option" }],
        battleArea: [{ card: NON_CS, as: "stack", under: [CS_DIGIMON] }],
      },
    });
    await s.ready();
    s.state.memory = 5;

    expect(s.perm("stack").stack.map((card) => card.cardId)).toEqual([CS_DIGIMON]);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(5);
  });

  it("does not arm the Delay when the attacker only has [CS] cards under its top card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-091", as: "option" }, FILLER],
          battleArea: [
            { card: CS_DIGIMON, as: "cs" },
            { card: NON_CS, as: "attacker", dp: 12000, under: [CS_DIGIMON] },
          ],
          deck: Array(10).fill(FILLER),
        },
        1: {
          battleArea: [
            { card: LOWEST, as: "lowest" },
            { card: HIGHER, as: "survivor" },
          ],
          security: [FILLER, FILLER, FILLER],
          deck: Array(10).fill(FILLER),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const optionInstanceId = s.inst("option").instanceId;
    const survivorId = s.perm("survivor").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionInstanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 3);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(delayPrompts(s)).toBe(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionInstanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([survivorId]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("deletes only the lowest-DP opponent Digimon and then places itself in the battle area", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-091", as: "option" }], battleArea: [{ card: CS_DIGIMON, as: "cs" }] },
        1: {
          battleArea: [
            { card: LOWEST, as: "lowest" },
            { card: HIGHER, as: "higher" },
          ],
          security: [FILLER, FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const optionInstanceId = s.inst("option").instanceId;
    const lowestId = s.perm("lowest").permanentId;
    const higherId = s.perm("higher").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionInstanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([higherId]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual([LOWEST]);
    expect(lowestId).not.toBe(higherId);
    const placed = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === optionInstanceId);
    expect(placed?.placedByEffect).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionInstanceId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("still places itself when the opponent has no Digimon to delete", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-091", as: "option" }], battleArea: [{ card: CS_DIGIMON, as: "cs" }] },
        1: { security: [FILLER, FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const optionInstanceId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionInstanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    const placed = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === optionInstanceId);
    expect(placed?.placedByEffect).toBe(true);
    assertNoLoudGap(s);
  });

  it("holds the Delay on the placement turn, then spends it on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-091", as: "option" }, FILLER],
          battleArea: [{ card: CS_DIGIMON, as: "attacker", dp: 12000 }],
          deck: Array(10).fill(FILLER),
        },
        1: {
          battleArea: [
            { card: LOWEST, as: "lowest" },
            { card: HIGHER, as: "higher" },
          ],
          security: [FILLER, FILLER, FILLER],
          deck: Array(10).fill(FILLER),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const optionInstanceId = s.inst("option").instanceId;
    const higherId = s.perm("higher").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionInstanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    const onBoard = (): boolean =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionInstanceId);
    expect(onBoard()).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(delayPrompts(s)).toBe(0);
    expect(onBoard()).toBe(true);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([higherId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(onBoard()).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !onBoard());
    expect(delayPrompts(s)).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionInstanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.filter((card) => card.cardId === LOWEST)).toHaveLength(1);
    expect(s.state.players[1]!.trash.filter((card) => card.cardId === HIGHER)).toHaveLength(1);
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("leaves the Delay unspent when its optional prompt is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-091", as: "option" }, FILLER],
          battleArea: [{ card: CS_DIGIMON, as: "attacker", dp: 12000 }],
          deck: Array(10).fill(FILLER),
        },
        1: {
          battleArea: [
            { card: LOWEST, as: "lowest" },
            { card: HIGHER, as: "survivor" },
          ],
          security: [FILLER, FILLER, FILLER],
          deck: Array(10).fill(FILLER),
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const optionInstanceId = s.inst("option").instanceId;
    const survivorId = s.perm("survivor").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionInstanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(delayPrompts(s)).toBe(1);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionInstanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([survivorId]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not offer the Delay when a non-[CS] Digimon attacks", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-091", as: "option" }, FILLER],
          battleArea: [
            { card: CS_DIGIMON, as: "cs" },
            { card: NON_CS, as: "attacker", dp: 12000 },
          ],
          deck: Array(10).fill(FILLER),
        },
        1: {
          battleArea: [
            { card: LOWEST, as: "lowest" },
            { card: HIGHER, as: "survivor" },
          ],
          security: [FILLER, FILLER, FILLER],
          deck: Array(10).fill(FILLER),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const optionInstanceId = s.inst("option").instanceId;
    const survivorId = s.perm("survivor").permanentId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionInstanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 3);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionInstanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([survivorId]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not offer the Delay on the opponent's turn for the opponent's [CS] attacker", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-091", as: "option" }, FILLER],
          battleArea: [{ card: CS_DIGIMON, as: "cs" }],
          security: [FILLER, FILLER, FILLER],
          deck: Array(10).fill(FILLER),
        },
        1: {
          battleArea: [
            { card: CS_DIGIMON, as: "opponentAttacker", dp: 12000 },
            { card: LOWEST, as: "opponentFodder" },
          ],
          deck: Array(10).fill(FILLER),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const optionInstanceId = s.inst("option").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionInstanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponentAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(delayPrompts(s)).toBe(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionInstanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("cs").permanentId)).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("deletes the attacker side's lowest-DP Digimon from security and then places itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: HIGHER, as: "attacker" },
            { card: LOWEST, as: "attackerLowest" },
          ],
          deck: Array(10).fill(FILLER),
        },
        1: {
          security: [{ card: "BT23-091", as: "option" }],
          deck: Array(10).fill(FILLER),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const optionInstanceId = s.inst("option").instanceId;
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toEqual([attackerId]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([LOWEST]);
    const placed = s.state.players[1]!.battleArea.find((p) => p.topCard?.instanceId === optionInstanceId);
    expect(placed?.placedByEffect).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
