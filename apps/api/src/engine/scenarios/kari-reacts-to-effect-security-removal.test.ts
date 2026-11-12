import { expect, it } from "vitest";
import { setupEngine, settle } from "#api/engine/testkit/harness";
import "#api/cards/BT15/BT15-084";
import "#api/cards/EX6/EX6-003";
import "#api/cards/P/P-122";

it("suspends Kari Kamiya when Cupimon's cost adds the top security card to the hand", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT6-038", as: "host", under: ["EX6-003", "BT1-045"] },
          { card: "BT15-084", as: "kari" },
        ],
        hand: [{ card: "BT1-053", as: "angel" }],
        security: [{ card: "BT1-010", as: "securityTop" }],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "victim" }],
        deck: Array(10).fill("BT1-009"),
        security: Array(3).fill("BT1-009"),
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.security.length === 2 && s.state.pendingDecision === undefined);

  expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("securityTop").instanceId);
  expect(s.perm("kari").isSuspended).toBe(true);
});

it("suspends Kari Kamiya when Patamon's On Play adds a security card to the hand", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT15-084", as: "kari" }],
        hand: [{ card: "P-122", as: "patamon" }],
        security: [{ card: "BT1-010" }, { card: "AD1-016", as: "multicolor" }],
        deck: Array(10).fill("BT1-009"),
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "victim" }],
        deck: Array(10).fill("BT1-009"),
        security: Array(3).fill("BT1-009"),
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 5;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
    ok: true,
  });
  await settle(
    () =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "P-122") &&
      s.state.pendingDecision === undefined,
  );

  expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("multicolor").instanceId);
  expect(s.perm("kari").isSuspended).toBe(true);
});
