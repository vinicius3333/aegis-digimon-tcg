import { expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./BT12-045.js";

it("adds a revealed green Digimon to hand", async () => {
  const s = setupEngine(
    {
      0: { hand: [{ card: "BT12-045", as: "ebi" }], deck: [{ card: "BT1-064", as: "greenDigimon" }, "BT1-009"] },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 3;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ebi").instanceId })).toEqual({ ok: true });
  await settle(() =>
    s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("greenDigimon").instanceId),
  );
  expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("greenDigimon").instanceId)).toBe(
    true,
  );
});

it("bottoms a revealed non-green Digimon instead of adding it", async () => {
  const s = setupEngine(
    {
      0: { hand: [{ card: "BT12-045", as: "ebi" }], deck: [{ card: "BT1-009", as: "notGreen" }, "BT1-010"] },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 3;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ebi").instanceId })).toEqual({ ok: true });
  await settle(() => {
    const bottom = s.state.players[0]!.deck.at(-1);
    return bottom?.instanceId === s.inst("notGreen").instanceId && bottom.faceUp === false;
  });
  expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("notGreen").instanceId)).toBe(false);
  expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("notGreen").instanceId);
});

it("bottoms a green non-Digimon card because the condition requires both traits", async () => {
  const s = setupEngine(
    {
      0: { hand: [{ card: "BT12-045", as: "ebi" }], deck: [{ card: "AD1-020", as: "greenTamer" }, "BT1-009"] },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 3;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ebi").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.deck.at(-1)?.instanceId === s.inst("greenTamer").instanceId);
  expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("greenTamer").instanceId)).toBe(false);
  expect(s.state.players[0]!.deck.at(-1)?.faceUp).toBe(false);
});
