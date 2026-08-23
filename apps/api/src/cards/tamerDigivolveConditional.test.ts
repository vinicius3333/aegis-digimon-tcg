import { describe, it, expect } from "vitest";
import { GameState, PlayerState, Permanent, CardInstance, Phase, type Seat } from "@aegis/shared";
import { validateDigivolve, type DigivolveDeps } from "../engine/actions/digivolve.js";

// Integration coverage for the conditional Tamer-base digivolution paths whose documented behavior `condition:`
// or stack gate the text parser could not express:
//   BT22-042 — from Chaperomon, only while you control a [Arisa Kinosaki] Tamer (controllerControls).
//   BT23-101 — from [Erika Mishima], only while you control 4+ [Hudie] Tamers (controllerControls);
//              plus the Lv.3 [CS] base path, which carries no controller gate.
//   P-185    — from a [Takuya Kanbara] Tamer with 5+ [Hybrid] cards under it (minTraitStackCount).
// memory is removed from the equation (maxAffordable: () => 99) so each test isolates the gate.

let counter = 0;
function instance(cardId: string, seat: Seat = 0): CardInstance {
  const ci = new CardInstance();
  ci.instanceId = `i${counter++}`;
  ci.cardId = cardId;
  ci.ownerSeat = seat;
  ci.faceUp = true;
  return ci;
}

function permanent(topCardId: string, opts?: { stack?: string[] }): Permanent {
  const p = new Permanent();
  p.permanentId = `p${counter++}`;
  p.controllerSeat = 0;
  p.topCard = instance(topCardId);
  p.baseDP = 3000;
  p.currentDP = 3000;
  for (const s of opts?.stack ?? []) p.stack.push(instance(s));
  return p;
}

/** Seat-0 turn, Main phase, controlling `permanents` (first = the digivolve base), `evolver` in hand. */
function setup(permanents: Permanent[], evolverCardId: string) {
  const state = new GameState();
  state.phase = Phase.Main;
  state.turnSeat = 0;
  state.memory = 0;
  const p0 = new PlayerState();
  p0.seat = 0;
  const p1 = new PlayerState();
  p1.seat = 1;
  state.players.push(p0, p1);
  for (const perm of permanents) p0.battleArea.push(perm);
  const evolver = instance(evolverCardId);
  p0.hand.push(evolver);
  return { state, base: permanents[0]!, evolver };
}

const deps: DigivolveDeps = {
  maxAffordable: () => 99,
  payMemory: () => {},
  draw: async () => [],
  fireWhenDigivolving: async () => {},
};

const validate = (state: GameState, base: Permanent, evolver: CardInstance) =>
  validateDigivolve(
    state,
    0,
    { type: "digivolve", permanentId: base.permanentId, instanceId: evolver.instanceId },
    deps,
  );

// Card ids (from cards.json):
const CHAPEROMON = "BT22-036";
const ARISA_KINOSAKI = "BT22-088"; // Tamer
const ERIKA_MISHIMA = "BT23-084"; // Hudie Tamer
const HUDIE_TAMERS = ["BT23-081", "BT23-085", "BT23-090"]; // + Erika = 4
const LV3_CS = "BT22-008"; // Lv.3 [CS] Digimon
const TAKUYA = "BT12-088"; // Takuya Kanbara Tamer
const HYBRID = "AD1-002"; // [Hybrid] Digimon (stack filler)

describe("BT22-042 — digivolve from Chaperomon gated on controlling a [Arisa Kinosaki] Tamer", () => {
  it("is illegal without an Arisa Kinosaki Tamer", () => {
    const { state, base, evolver } = setup([permanent(CHAPEROMON)], "BT22-042");
    expect(validate(state, base, evolver).ok).toBe(false);
  });

  it("is legal when an Arisa Kinosaki Tamer is in play", () => {
    const { state, base, evolver } = setup([permanent(CHAPEROMON), permanent(ARISA_KINOSAKI)], "BT22-042");
    const check = validate(state, base, evolver);
    expect(check.ok).toBe(true);
    if (check.ok) expect(check.cost).toBe(6);
  });
});

describe("BT23-101 — Erika Mishima path gated on 4+ [Hudie] Tamers, plus the Lv.3 [CS] path", () => {
  it("is illegal from Erika Mishima with fewer than 4 Hudie Tamers", () => {
    const { state, base, evolver } = setup([permanent(ERIKA_MISHIMA)], "BT23-101");
    expect(validate(state, base, evolver).ok).toBe(false);
  });

  it("is legal from Erika Mishima with 4 Hudie Tamers (cost 3)", () => {
    const { state, base, evolver } = setup(
      [permanent(ERIKA_MISHIMA), ...HUDIE_TAMERS.map((id) => permanent(id))],
      "BT23-101",
    );
    const check = validate(state, base, evolver);
    expect(check.ok).toBe(true);
    if (check.ok) expect(check.cost).toBe(3);
  });

  it("is legal from a Lv.3 [CS] Digimon with no controller gate (cost 4)", () => {
    const { state, base, evolver } = setup([permanent(LV3_CS)], "BT23-101");
    const check = validate(state, base, evolver);
    expect(check.ok).toBe(true);
    if (check.ok) expect(check.cost).toBe(4);
  });
});

describe("P-185 — digivolve from a [Takuya Kanbara] Tamer with 5+ [Hybrid] cards under it", () => {
  it("is illegal with only 4 [Hybrid] cards under the Tamer", () => {
    const { state, base, evolver } = setup([permanent(TAKUYA, { stack: Array(4).fill(HYBRID) })], "P-185");
    expect(validate(state, base, evolver).ok).toBe(false);
  });

  it("is legal with 5 [Hybrid] cards under the Tamer (cost 4)", () => {
    const { state, base, evolver } = setup([permanent(TAKUYA, { stack: Array(5).fill(HYBRID) })], "P-185");
    const check = validate(state, base, evolver);
    expect(check.ok).toBe(true);
    if (check.ok) expect(check.cost).toBe(4);
  });
});
