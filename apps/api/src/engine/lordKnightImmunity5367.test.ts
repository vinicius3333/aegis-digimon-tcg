import { describe, expect, it } from "vitest";
import type { Seat } from "@aegis/shared";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { advance } from "./testkit/advance.js";
import { observe } from "./testkit/observe.js";

async function protectionBoard(seat: Seat) {
  const opponent: Seat = seat === 0 ? 1 : 0;
  const preferred: string[] = [];
  const s = setupEngine(
    {
      [seat]: {
        hand: [{ card: "AD1-018", as: "lord" }],
        battleArea: [{ card: "EX10-052", as: "lucemon", under: ["EX10-004", "EX10-013"] }],
        deck: Array(12).fill("BT1-009"),
      },
      [opponent]: {
        hand: [
          { card: "AD1-004", as: "war" },
          { card: "BT13-095", as: "marcus" },
        ],
        battleArea: [
          { card: "AD1-019", as: "matt" },
          { card: "ST20-12", as: "sacrifice" },
          { card: "EX9-012", as: "base" },
        ],
        deck: Array(12).fill("BT1-009"),
      },
    },
    {
      autoSelectCards: true,
      autoAcceptOptional: true,
      autoChooseOption: true,
      preferInstanceIds: preferred,
      declinePrompts: ["Attack with a Digimon", "PlayFromZone"],
    },
  );
  s.state.turnSeat = seat;
  await s.ready();
  preferred.push(s.perm("lucemon").topCard.instanceId);
  s.state.memory = 20;
  expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: s.inst("lord").instanceId })).toEqual({ ok: true });
  await settle(() => observe(s.engine).hasRestriction(s.perm("lucemon"), "beAffected", "Digimon"));
  await settle();
  return { s, preferred, opponent };
}

describe.each([0, 1] as const)("GitHub #5367 AD1-018 immunity, protected seat %s", (seat) => {
  it("blocks the opponent's WarGreymon deletion when the protected Lucemon is chosen", async () => {
    const { s, opponent } = await protectionBoard(seat);
    s.state.turnSeat = opponent;
    s.state.memory = 20;
    expect(s.engine.applyIntent(opponent, { type: "playCard", instanceId: s.inst("war").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[seat]!.battleArea.some((p) => p.permanentId === s.perm("lucemon").permanentId)).toBe(true);
    expect(s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "AD1-004")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("reconstructs dec-71: unprotected LordKnightmon dies, then Raid battles the protected Lucemon", async () => {
    const { s, preferred, opponent } = await protectionBoard(seat);
    const lord = s.state.players[seat]!.battleArea.find((p) => p.topCard.cardId === "AD1-018")!;
    const lucemonId = s.perm("lucemon").permanentId;
    preferred.splice(0, preferred.length, lord.topCard.instanceId);
    s.state.turnSeat = opponent;
    s.state.memory = 20;
    expect(
      s.engine.applyIntent(opponent, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("war").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[seat]!.battleArea.some((p) => p.permanentId === lord.permanentId)).toBe(false);
    expect(observe(s.engine).hasRestriction(s.perm("lucemon"), "beAffected", "Digimon")).toBe(true);
    preferred.splice(0, preferred.length, s.perm("sacrifice").topCard.instanceId);
    const war = s.state.players[opponent]!.battleArea.find((p) => p.topCard.cardId === "AD1-004")!;
    expect(war.currentDP).toBeGreaterThan(s.perm("lucemon").currentDP);
    expect(
      s.engine.applyIntent(opponent, {
        type: "attack",
        attackerPermanentId: war.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    expect(
      s.events.some(
        (e) => e.kind === "attackDeclared" && e.target.kind === "permanent" && e.target.permanentId === lucemonId,
      ),
    ).toBe(true);
    expect(
      s.events.some(
        (e) =>
          e.kind === "cardsMoved" && e.battleDeletion && e.deletedPermanents?.some((p) => p.permanentId === lucemonId),
      ),
    ).toBe(true);
    expect(s.state.players[seat]!.battleArea.some((p) => p.permanentId === lucemonId)).toBe(false);
    expect(s.state.players[opponent]!.battleArea.some((p) => p.topCard.cardId === "ST20-12")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("keeps the grant through the opponent turn and expires at that turn end", async () => {
    const opponent: Seat = seat === 0 ? 1 : 0;
    const preferred: string[] = [];
    const s = setupEngine(
      {
        [seat]: {
          hand: [{ card: "AD1-018", as: "lord" }],
          battleArea: [{ card: "BT1-013", as: "target", dp: 9000 }],
          deck: Array(12).fill("BT1-009"),
        },
        [opponent]: { hand: [{ card: "BT15-041", as: "babamon" }], deck: Array(12).fill("BT1-009") },
      },
      { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = seat;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(seat);
    preferred.push(s.perm("target").topCard.instanceId);
    s.state.memory = 20;
    expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: s.inst("lord").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(observe(s.engine).hasRestriction(s.perm("target"), "beAffected", "Digimon")).toBe(true);
    expect(s.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(opponent);
    expect(observe(s.engine).hasRestriction(s.perm("target"), "beAffected", "Digimon")).toBe(true);
    s.state.memory = 20;
    expect(s.engine.applyIntent(opponent, { type: "playCard", instanceId: s.inst("babamon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("target").currentDP).toBe(9000);
    expect(s.engine.applyIntent(opponent, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(seat);
    expect(observe(s.engine).hasRestriction(s.perm("target"), "beAffected", "Digimon")).toBe(false);
    expect(s.perm("target").currentDP).toBe(3000);
    expect(s.engine.applyIntent(seat, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("permits an ordinary opponent Tamer's DP reduction through Digimon-only immunity", async () => {
    const { s, opponent } = await protectionBoard(seat);
    expect(observe(s.engine).hasRestriction(s.perm("lucemon"), "beAffected", "Tamer")).toBe(false);
    s.state.turnSeat = opponent;
    s.state.memory = 20;
    expect(s.engine.applyIntent(opponent, { type: "playCard", instanceId: s.inst("marcus").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("lucemon").currentDP).toBe(10000);
    expect(observe(s.engine).hasRestriction(s.perm("lucemon"), "beAffected", "Digimon")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
