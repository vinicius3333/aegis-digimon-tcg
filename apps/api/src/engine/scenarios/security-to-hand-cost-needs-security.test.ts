import { expect, it } from "vitest";
import { setupEngine, settle } from "#api/engine/testkit/harness";
import "#api/cards/EX6/EX6-003";

it("does not let Cupimon place an Angel from hand when the security stack is empty", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT6-038", as: "host", under: ["EX6-003", "BT1-045"] }],
        hand: [{ card: "BT1-053", as: "angel" }],
      },
      1: { deck: Array(10).fill("BT1-009"), security: Array(3).fill("BT1-009") },
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
  await settle(() => s.state.players[1]!.security.length === 2);

  expect(s.state.players[0]!.security).toHaveLength(0);
  expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("angel").instanceId]);
  expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX6-003" || req.sourceCardId === "BT6-038")).toEqual([]);
});

it("lets Cupimon pay its security cost without an Angel to place", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT6-038", as: "host", under: ["EX6-003", "BT1-045"] }],
        hand: [{ card: "BT1-009", as: "nonAngel" }],
        security: [{ card: "BT1-010", as: "securityTop" }],
      },
      1: { deck: Array(10).fill("BT1-009"), security: Array(3).fill("BT1-009") },
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
  await settle(() => s.state.players[1]!.security.length === 2);

  expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
    expect.arrayContaining([s.inst("securityTop").instanceId, s.inst("nonAngel").instanceId]),
  );
  expect(s.state.players[0]!.security).toHaveLength(0);
});
