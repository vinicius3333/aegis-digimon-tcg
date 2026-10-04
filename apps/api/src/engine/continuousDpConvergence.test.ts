import { expect, it } from "vitest";
import { type Seat } from "@aegis/shared";
import { advance } from "./testkit/advance.js";
import { assertNoLoudGap, setupEngine } from "./testkit/harness.js";
import "../cards/index.js";

const cases = ([0, 1] as const).flatMap((sourceSeat) => [false, true].map((suspended) => ({ sourceSeat, suspended })));

it.each(cases)(
  "converges KingEtemon's aura with source seat $sourceSeat and Ulforce suspended=$suspended",
  async ({ sourceSeat, suspended }) => {
    const targetSeat: Seat = sourceSeat === 0 ? 1 : 0;
    const s = setupEngine({
      [sourceSeat]: {
        battleArea: [
          { card: "EX13-035", as: "kingEtemon" },
          { card: "EX5-048", as: "etemon" },
          { card: "EX13-028", as: "sukamon" },
        ],
      },
      [targetSeat]: {
        battleArea: [
          { card: "EX13-023", as: "ulforce", suspended },
          { card: "BT1-009", as: "ordinary", dp: 10000 },
        ],
      },
    });
    await expect(s.ready()).resolves.toBeUndefined();
    for (let pass = 0; pass < 3; pass += 1) {
      await s.engine.recomputeContinuousEffects();
      expect(s.perm("ulforce").currentDP).toBe(suspended ? 9000 : 12000);
      expect(s.perm("ordinary").currentDP).toBe(7000);
    }
    assertNoLoudGap(s);
  },
);

it("updates the aura's reduction when Ulforce suspends, unsuspends and the aura lapses", async () => {
  const s = setupEngine({
    0: {
      battleArea: [
        { card: "EX13-035", as: "kingEtemon" },
        { card: "EX5-048", as: "etemon" },
        { card: "EX13-028", as: "sukamon" },
      ],
    },
    1: {
      battleArea: [
        { card: "EX13-023", as: "ulforce" },
        { card: "BT1-009", as: "ordinary", dp: 10000 },
      ],
    },
  });
  await s.ready();
  const ulforceId = s.perm("ulforce").permanentId;
  await advance(s.engine).verb.suspend([ulforceId]);
  expect(s.perm("ulforce").currentDP).toBe(9000);
  expect(s.perm("ordinary").currentDP).toBe(7000);

  await advance(s.engine).verb.unsuspend([ulforceId]);
  expect(s.perm("ulforce").currentDP).toBe(12000);
  expect(s.perm("ordinary").currentDP).toBe(7000);

  await advance(s.engine).verb.returnToHand([s.inst("sukamon").instanceId]);
  expect(s.perm("ulforce").currentDP).toBe(12000);
  expect(s.perm("ordinary").currentDP).toBe(10000);
  assertNoLoudGap(s);
});

it("finishes the incident's KingSukamon reveal-to-play chain after another Sukamon is deleted", async () => {
  // Match b3868e4e-f91d-4941-a813-a05960f0bc09: the inherited watcher stages a
  // revealed Sukamon in hand before its free play, recomputing DP at that boundary.
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "EX13-035", as: "kingEtemon", under: ["BT11-036", "EX13-031"] },
          { card: "EX5-048", as: "etemon", under: ["EX13-028"] },
          { card: "EX13-028", as: "deletedSukamon" },
          { card: "EX13-028", as: "survivingSukamon" },
        ],
        deck: [
          { card: "EX13-028", as: "replacement" },
          { card: "LM-054", as: "option" },
          { card: "BT13-062", as: "chuumon" },
        ],
        security: ["BT1-009"],
      },
      1: {
        battleArea: [
          { card: "EX13-023", as: "ulforce" },
          { card: "EX13-019", as: "ordinary", suspended: true },
        ],
        security: ["BT1-009"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: ["EX13-031"] },
  );
  s.state.turnSeat = 1;
  await s.ready();
  const replacementId = s.inst("replacement").instanceId;
  const deletedId = s.inst("deletedSukamon").instanceId;
  const memory = s.state.memory;

  // This production deletion seam reaches the actual inherited SubTrigger and RevealAdd.
  expect(await advance(s.engine).verb.deletePermanent([s.perm("deletedSukamon").permanentId], "byBattle")).toBe(1);

  expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === replacementId)).toBe(true);
  expect(s.state.players[0]!.hand).toHaveLength(0);
  expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
    expect.arrayContaining([deletedId, s.inst("option").instanceId, s.inst("chuumon").instanceId]),
  );
  expect(s.state.memory).toBe(memory);
  expect(s.perm("ulforce").currentDP).toBe(12000);
  expect(s.perm("ordinary").currentDP).toBe(3000);
  expect(s.state.pendingDecision).toBeUndefined();
  assertNoLoudGap(s);
});
