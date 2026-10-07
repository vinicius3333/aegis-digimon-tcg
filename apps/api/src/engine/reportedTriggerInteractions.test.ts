import { expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { advance } from "./testkit/advance.js";

it("#5168 blue source played by Alter-S sees the simultaneously played red source", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "EX9-021", as: "omni", under: ["EX9-012", "AD1-010"] }],
        hand: [{ card: "EX9-019", as: "blueEvo" }],
      },
      1: { security: ["BT1-009", "BT1-009"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
  );
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("omni").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(
    () => s.state.players[0]!.security.some((c) => c.cardId === "EX9-021") && s.state.pendingDecision === undefined,
  );
  await settle();
  expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX9-019")).toBe(true);
});
it.each(["BT23-076", "BT23-077"])("#5170 EX9 Kaguyamon can play Puppet %s from trash", async (card) => {
  const s = setupEngine(
    { 0: { battleArea: [{ card: "EX9-033", as: "kagu" }], trash: [card], deck: ["BT1-009", "BT1-009"] } },
    { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
  );
  s.state.isFirstPlayersFirstTurn = false;
  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  advance(s.engine).endMainPhaseIfOpen(0);
  await turn;
  await settle();
  expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === card)).toBe(true);
});

it.each(["BT23-076", "BT23-077"])("#5170 EX12 Kaguyamon can play Puppet %s from trash", async (card) => {
  const s = setupEngine(
    { 0: { hand: [{ card: "EX12-065", as: "kagu" }], trash: [card] } },
    { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
  );
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kagu").instanceId })).toEqual({ ok: true });
  await settle();
  expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === card)).toBe(true);
});
it.each(["BT23-076", "BT23-077"])("#5170 Arisa plays Puppet %s after Overclock", async (card) => {
  const s = setupEngine(
    {
      0: {
        hand: [card],
        deck: ["AD1-001", "AD1-001", "AD1-001"],
        battleArea: [
          { card: "EX11-060", as: "arisa" },
          { card: "EX11-024", as: "overclocker", dp: 6000 },
          { card: "TOKEN-Familiar-Token", as: "token", dp: 3000 },
        ],
      },
      1: { deck: ["AD1-001", "AD1-001"], security: ["AD1-001", "AD1-001"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
  );
  s.state.isFirstPlayersFirstTurn = true;
  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(0);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await turn;
  await settle();
  expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === card)).toBe(true);
});
