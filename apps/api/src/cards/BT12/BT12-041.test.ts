import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter/compiledCards.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-041.js";

describe("BT12-041 Cho-Hakkaimon", () => {
  it("registers full compiled IR for all three printed clauses", () => {
    const compiled = runtimeCompiledCard("BT12-041")!;
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.map(({ trigger }) => trigger)).toEqual(
      expect.arrayContaining(["WhenDigivolving", "YourTurn", "WhenAttacking"]),
    );
    expect(JSON.stringify(compiled)).not.toContain('"kind":"raw"');
  });
});

it("draws when an opposing Digimon is deleted by dropping to 0 DP", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT12-041", as: "cho" }], deck: ["BT1-009"] },
    1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 0 }] },
  });
  await s.ready();
  const handBefore = s.state.players[0]!.hand.length;
  await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byRule");
  await settle(() => s.state.players[0]!.hand.length > handBefore);
  expect(s.state.players[0]!.hand.length).toBe(handBefore + 1);
});

it("does not draw when an opposing Digimon is deleted without dropping to 0 DP", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT12-041", as: "cho" }], deck: ["BT1-009"] },
    1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 3000 }] },
  });
  await s.ready();
  const handBefore = s.state.players[0]!.hand.length;
  await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byRule");
  await settle(() => s.state.players[1]!.battleArea.length === 0);
  expect(s.state.players[0]!.hand.length).toBe(handBefore);
});

it("draws when a zero-DP opponent is removed in a mixed rule-deletion batch", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT12-041", as: "cho" }], deck: ["BT1-009"] },
    1: {
      battleArea: [
        { card: "BT1-009", as: "zero", dp: 0 },
        { card: "BT1-009", as: "aboveZero", dp: 3000 },
      ],
    },
  });
  await s.ready();
  const handBefore = s.state.players[0]!.hand.length;
  await advance(s.engine).verb.deletePermanent([s.perm("zero").permanentId, s.perm("aboveZero").permanentId], "byRule");
  await settle(() => s.state.players[0]!.hand.length > handBefore);
  expect(s.state.players[0]!.hand.length).toBe(handBefore + 1);
});

it("does not draw outside its controller's turn", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT12-041", as: "cho" }], deck: ["BT1-009"] },
    1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 0 }] },
  });
  s.state.turnSeat = 1;
  await s.ready();
  const handBefore = s.state.players[0]!.hand.length;
  await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byRule");
  await settle(() => s.state.players[1]!.battleArea.length === 0);
  expect(s.state.players[0]!.hand.length).toBe(handBefore);
});

it("does not treat a Digimon in a deleted non-Digimon stack as the deleted Digimon", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT12-041", as: "cho" }], deck: ["BT1-009"] },
    1: { battleArea: [{ card: "BT12-092", as: "tamer", under: ["BT1-009"], dp: 0 }] },
  });
  await s.ready();
  const handBefore = s.state.players[0]!.hand.length;
  await advance(s.engine).verb.deletePermanent([s.perm("tamer").permanentId], "byRule");
  await settle(() => s.state.players[1]!.battleArea.length === 0);
  expect(s.state.players[0]!.hand.length).toBe(handBefore);
});

it("does not draw for a nonzero-DP Digimon deleted alongside a zero-DP non-Digimon", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT12-041", as: "cho" }], deck: ["BT1-009"] },
    1: {
      battleArea: [
        { card: "BT12-092", as: "zeroTamer", dp: 0 },
        { card: "BT1-009", as: "nonzeroDigimon", dp: 3000 },
      ],
    },
  });
  await s.ready();
  const handBefore = s.state.players[0]!.hand.length;
  await advance(s.engine).verb.deletePermanent(
    [s.perm("zeroTamer").permanentId, s.perm("nonzeroDigimon").permanentId],
    "byRule",
  );
  await settle(() => s.state.players[1]!.battleArea.length === 0);
  expect(s.state.players[0]!.hand.length).toBe(handBefore);
});

it("applies minus 3000 DP once for each pair of digivolution cards", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT12-037", as: "base", under: ["BT12-011", "BT12-012", "BT12-013", "BT12-014"] }],
        hand: [{ card: "BT12-041", as: "cho" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 10000 }] },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 3;
  await advance(s.engine).verb.digivolveFromInstance(s.perm("base").permanentId, s.inst("cho").instanceId);
  await settle(() => s.perm("base").topCard?.cardId === "BT12-041");
  expect(s.perm("victim").currentDP).toBe(4000);
});

it("does not apply the scaled effect when there are fewer than two digivolution cards", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT12-037", as: "base" }],
        hand: [{ card: "BT12-041", as: "cho" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 10000 }] },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 3;
  await advance(s.engine).verb.digivolveFromInstance(s.perm("base").permanentId, s.inst("cho").instanceId);
  await settle(() => s.perm("base").topCard?.cardId === "BT12-041");
  expect(s.perm("victim").currentDP).toBe(10000);
});

it("allows the alternate evolution from a level 4 Digimon with Save in its text", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT12-011", as: "saveBase" }],
        hand: [{ card: "BT12-041", as: "cho" }],
      },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 3;
  await advance(s.engine).verb.digivolveFromInstance(s.perm("saveBase").permanentId, s.inst("cho").instanceId);
  await settle(() => s.perm("saveBase").topCard?.cardId === "BT12-041");
  expect(s.perm("saveBase").topCard?.cardId).toBe("BT12-041");
});

it("applies the inherited minus 2000 DP effect only when the host has Save in its text", async () => {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: "BT12-011", as: "host", under: ["BT12-041"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 10000 }] },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
  await settle(() => s.perm("victim").currentDP === 8000);
  expect(s.perm("victim").currentDP).toBe(8000);
});

it("applies the inherited Save reduction through the public attack intent", async () => {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: "BT12-011", as: "host", under: ["BT12-041"] }], security: ["BT1-009"] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 10000 }], security: ["BT1-009"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  s.state.turnSeat = 0;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("attacker").currentDP === 8000);
  expect(s.perm("attacker").currentDP).toBe(8000);
});

it("does not apply the inherited effect when the host top card has no Save text", async () => {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-041"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 10000 }] },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
  await settle(() => s.state.players[1]!.battleArea.length === 1);
  expect(s.perm("victim").currentDP).toBe(10000);
});

it("applies the inherited Save reduction only once per turn", async () => {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: "BT12-011", as: "host", under: ["BT12-041"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 10000 }] },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
  await settle(() => s.perm("victim").currentDP === 8000);
  await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
  await settle(() => s.perm("victim").currentDP === 8000);
  expect(s.perm("victim").currentDP).toBe(8000);
});
