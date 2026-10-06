import { expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";

it("#5169 standalone P239 does not gain its inherited deletion effect", async () => {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: "BT1-009", as: "red" }], hand: [{ card: "ST1-16", as: "gaia" }] },
      1: { battleArea: [{ card: "P-239", as: "demi" }], hand: [{ card: "BT1-009", as: "payment" }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
  );
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaia").instanceId })).toEqual({ ok: true });
  await settle(
    () => s.state.players[1]!.trash.some((c) => c.cardId === "P-239") && s.state.pendingDecision === undefined,
  );
  expect(s.state.players[1]!.hand.some((c) => c.instanceId === s.inst("payment").instanceId)).toBe(true);
  expect(
    s.events.filter((e) => e.kind === "effectTriggered" && e.sourceCardId === "P-239" && e.isInherited),
  ).toHaveLength(0);
});
it("#5169 moving a deleted top-card DemiDevimon under a host does not retroactively trigger its inherited effect", async () => {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: "BT1-009", as: "red", suspended: true }], hand: [{ card: "ST1-16", as: "gaia" }] },
      1: {
        battleArea: [
          { card: "P-239", as: "demi" },
          { card: "EX10-048", as: "host" },
        ],
        hand: [
          { card: "EX10-011", as: "myotismon" },
          { card: "BT1-009", as: "payment" },
        ],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
  );
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gaia").instanceId })).toEqual({ ok: true });
  await settle();
  expect(s.perm("host").stack.some((c) => c.instanceId === s.inst("demi").instanceId)).toBe(true);
  expect(s.state.players[1]!.hand.some((c) => c.instanceId === s.inst("payment").instanceId)).toBe(true);
  expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("red").permanentId)).toBe(true);
  expect(
    s.events.filter((e) => e.kind === "effectTriggered" && e.sourceCardId === "P-239" && e.isInherited),
  ).toHaveLength(0);
});

it("#5169 a naked DemiDevimon deleted for Arukenimon's play cost cannot gain a retroactive inherited deletion", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "P-239", as: "demi" }],
        hand: [
          { card: "EX10-048", as: "arukenimon" },
          { card: "EX10-011", as: "myotismon" },
          { card: "BT1-009", as: "payment" },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
  );
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arukenimon").instanceId })).toEqual({
    ok: true,
  });
  await settle();
  const host = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX10-011");
  expect(host?.stack.some((c) => c.instanceId === s.inst("demi").instanceId)).toBe(true);
  expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("payment").instanceId)).toBe(true);
  expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("target").permanentId)).toBe(true);
  expect(
    s.events.filter((e) => e.kind === "effectTriggered" && e.sourceCardId === "P-239" && e.isInherited),
  ).toHaveLength(0);
});

it("#5169 a DemiDevimon inherited at play-cost deletion still deletes the opponent", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT16-072", as: "host", under: ["P-239"] }],
        hand: [
          { card: "EX10-048", as: "arukenimon" },
          { card: "BT1-009", as: "payment" },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
  );
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arukenimon").instanceId })).toEqual({
    ok: true,
  });
  await settle();
  expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("payment").instanceId)).toBe(true);
  expect(s.state.players[1]!.battleArea).toHaveLength(0);
  expect(
    s.events.filter((e) => e.kind === "effectTriggered" && e.sourceCardId === "P-239" && e.isInherited),
  ).toHaveLength(1);
});
