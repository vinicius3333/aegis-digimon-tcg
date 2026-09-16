import { getCardDefinition } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT17-100.js";
import "./index.js";

const CLOCK = "BT17-100";
const DIABOROMON = "BT17-059";
const COLOR_SOURCE = "BT10-022";
const INERT_LV3 = "BT1-009";
const SPARE = "BT1-010";
const OPPONENT_DELETE = "BT17-017";
const X_ANTIBODY = "BT24-065";
const TOKEN_ID = "TOKEN-Diaboromon";

describe("BT17-100 Doomsday Clock — [Security] Add this card to the hand", () => {
  it("moves the checked card to hand, leaving trash and battle area untouched", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: CLOCK, as: "clockCard" }, INERT_LV3],
        hand: [SPARE],
      },
      1: { battleArea: [{ card: INERT_LV3, dp: 12_000, as: "attacker" }] },
    });
    const p0 = s.state.players[0]!;
    s.state.turnSeat = 1;
    const clockId = s.inst("clockCard").instanceId;
    const handBefore = p0.hand.length;

    const res = s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    });
    expect(res).toEqual({ ok: true });

    await settle(() => p0.hand.some((c) => c.instanceId === clockId), 800);

    expect(p0.hand.map((c) => c.instanceId)).toContain(clockId);
    expect(p0.hand).toHaveLength(handBefore + 1);
    expect(p0.trash.some((c) => c.instanceId === clockId)).toBe(false);
    expect(p0.battleArea.some((p) => p.topCard?.instanceId === clockId)).toBe(false);
    expect(p0.security.map((c) => c.cardId)).toEqual([INERT_LV3]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

describe("BT17-100 Doomsday Clock — [Main] token + bottom placement", () => {
  it("plays a 3000 DP Diaboromon Token and places itself under a clock-free Diaboromon", async () => {
    const preferredHostIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: COLOR_SOURCE, as: "colorSource" },
            { card: DIABOROMON, as: "cleanHost" },
            { card: DIABOROMON, as: "taintedHost", under: [CLOCK] },
          ],
          hand: [{ card: CLOCK, as: "clockCard" }, SPARE],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferredHostIds },
    );
    preferredHostIds.push(s.perm("cleanHost").permanentId);
    const p0 = s.state.players[0]!;
    s.state.memory = 10;
    const clockId = s.inst("clockCard").instanceId;
    const handBefore = p0.hand.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: clockId })).toEqual({ ok: true });

    await settle(
      () =>
        p0.battleArea.some((p) => p.topCard?.cardId === TOKEN_ID) &&
        s.perm("cleanHost").stack.some((card) => card.instanceId === clockId),
      800,
    );

    const tokens = p0.battleArea.filter((p) => p.topCard?.cardId === TOKEN_ID);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]!.currentDP).toBe(3000);
    expect(getCardDefinition(TOKEN_ID)).toMatchObject({
      nameEn: "Diaboromon",
      level: 6,
      dp: 3000,
      playCost: 14,
      colors: ["White"],
      forms: ["Mega"],
      attributes: ["Unknown"],
      types: ["Unidentified"],
      isToken: true,
    });

    expect(s.perm("cleanHost").stack.at(0)?.instanceId).toBe(clockId);
    expect(s.perm("cleanHost").topCard?.cardId).toBe(DIABOROMON);
    expect(s.perm("taintedHost").stack).toHaveLength(1);
    expect(s.perm("taintedHost").stack.some((card) => card.instanceId === clockId)).toBe(false);

    expect(p0.hand.some((c) => c.instanceId === clockId)).toBe(false);
    expect(p0.hand).toHaveLength(handBefore - 1);
    expect(p0.trash.some((c) => c.instanceId === clockId)).toBe(false);
    expect(s.state.memory).toBe(7);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("picks the real clock-free [Diaboromon] over the token and over a Diaboromon (X Antibody) peer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: COLOR_SOURCE, as: "colorSource" },
            { card: X_ANTIBODY, as: "nearMiss" },
            { card: DIABOROMON, as: "cleanHost" },
          ],
          hand: [{ card: CLOCK, as: "clockCard" }, SPARE],
        },
      },
      { autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    s.state.memory = 10;
    const clockId = s.inst("clockCard").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: clockId })).toEqual({ ok: true });
    await settle(() => s.perm("cleanHost").stack.some((card) => card.instanceId === clockId), 800);

    expect(s.perm("cleanHost").stack.at(0)?.instanceId).toBe(clockId);
    expect(s.perm("nearMiss").stack).toHaveLength(0);
    const tokens = p0.battleArea.filter((p) => p.topCard?.cardId === TOKEN_ID);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]!.stack).toHaveLength(0);
    expect(p0.trash.some((c) => c.instanceId === clockId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q2896: never places itself under the Diaboromon Token it just played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: COLOR_SOURCE, as: "colorSource" }],
          hand: [{ card: CLOCK, as: "clockCard" }, SPARE],
        },
      },
      { autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    s.state.memory = 10;
    const clockId = s.inst("clockCard").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: clockId })).toEqual({ ok: true });

    await settle(() => p0.trash.some((c) => c.instanceId === clockId), 800);

    const tokens = p0.battleArea.filter((p) => p.topCard?.cardId === TOKEN_ID);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]!.stack).toHaveLength(0);
    expect(p0.trash.map((c) => c.instanceId)).toContain(clockId);
    expect(p0.battleArea.some((p) => p.stack.some((card) => card.instanceId === clockId))).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

describe("BT17-100 Doomsday Clock — [Start of Your Turn] win the game", () => {
  it("Q2897: the controller of the four placed clocks wins at the start of their own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CLOCK, placedByEffect: true },
          { card: CLOCK, placedByEffect: true },
          { card: CLOCK, placedByEffect: true },
          { card: CLOCK, placedByEffect: true },
        ],
        deck: [INERT_LV3, INERT_LV3, INERT_LV3],
        hand: [SPARE],
      },
      1: { deck: [INERT_LV3, INERT_LV3, INERT_LV3], hand: [SPARE] },
    });
    await s.ready();
    expect(s.state.gameOver).toBe(false);

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    void s.engine.runOneTurn().catch(() => undefined);
    await settle(() => s.state.gameOver, 1500);

    expect(s.state.gameOver).toBe(true);
    expect(s.state.winnerSeat).toBe(0);
  });

  it("does not win with only three clocks in the battle area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CLOCK, placedByEffect: true },
          { card: CLOCK, placedByEffect: true },
          { card: CLOCK, placedByEffect: true },
        ],
        deck: [INERT_LV3, INERT_LV3, INERT_LV3],
        hand: [SPARE],
      },
      1: { deck: [INERT_LV3, INERT_LV3, INERT_LV3], hand: [SPARE] },
    });
    await s.ready();

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    await s.engine.runOneTurn();

    expect(s.state.gameOver).toBe(false);
    expect(s.state.winnerSeat).toBe(-1);
  });
});

describe("BT17-100 Doomsday Clock — inherited [All Turns] leave prevention", () => {
  it("Q2898: deletes another Diaboromon to prevent an opponent-effect deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: INERT_LV3, as: "protectedHost", under: [{ card: CLOCK, as: "stackedClock" }] },
            { card: DIABOROMON, as: "costBody" },
          ],
        },
        1: {
          battleArea: [{ card: COLOR_SOURCE, as: "opponentColorSource" }],
          hand: [{ card: OPPONENT_DELETE, as: "deleteEffect" }, SPARE],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 20;
    const p0 = s.state.players[0]!;
    const protectedId = s.perm("protectedHost").permanentId;
    const costId = s.perm("costBody").permanentId;
    const clockId = s.inst("stackedClock").instanceId;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("deleteEffect").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !p0.battleArea.some((permanent) => permanent.permanentId === costId), 800);

    expect(p0.battleArea.some((p) => p.permanentId === protectedId)).toBe(true);
    expect(s.perm("protectedHost").stack.map((c) => c.instanceId)).toEqual([clockId]);
    expect(p0.battleArea.some((p) => p.permanentId === costId)).toBe(false);
    expect(p0.trash.some((c) => c.cardId === DIABOROMON)).toBe(true);
    expect(p0.trash.some((c) => c.instanceId === clockId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("cannot prevent the leave when no other Diaboromon can pay the cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: INERT_LV3, as: "protectedHost", under: [{ card: CLOCK, as: "stackedClock" }] }],
        },
        1: {
          battleArea: [{ card: COLOR_SOURCE, as: "opponentColorSource" }],
          hand: [{ card: OPPONENT_DELETE, as: "deleteEffect" }, SPARE],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 20;
    const p0 = s.state.players[0]!;
    const protectedId = s.perm("protectedHost").permanentId;
    const clockId = s.inst("stackedClock").instanceId;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("deleteEffect").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !p0.battleArea.some((permanent) => permanent.permanentId === protectedId), 800);

    expect(p0.battleArea.some((p) => p.permanentId === protectedId)).toBe(false);
    expect(p0.trash.some((c) => c.instanceId === clockId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});

describe("BT17-100 Doomsday Clock — inherited [End of Opponent's Turn] placement", () => {
  it("Q2899: places this very card from the host's digivolution cards into the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: DIABOROMON, as: "host", under: [{ card: CLOCK, as: "stackedClock" }] }],
          deck: [INERT_LV3, INERT_LV3],
          hand: [SPARE],
        },
        1: { deck: [INERT_LV3, INERT_LV3], hand: [SPARE] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    const p0 = s.state.players[0]!;
    const clockId = s.inst("stackedClock").instanceId;
    expect(s.perm("host").stack.map((c) => c.instanceId)).toEqual([clockId]);

    await advance(s.engine).runTurn(1);
    await settle(() => p0.battleArea.some((p) => p.topCard?.instanceId === clockId), 800);

    const placed = p0.battleArea.find((p) => p.topCard?.instanceId === clockId);
    expect(placed).toBeDefined();
    expect(placed?.placedByEffect).toBe(true);
    expect(s.perm("host").stack).toHaveLength(0);
    expect(p0.trash.some((c) => c.instanceId === clockId)).toBe(false);
  });
});
