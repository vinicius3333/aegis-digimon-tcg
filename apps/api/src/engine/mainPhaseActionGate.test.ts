import { describe, expect, it } from "vitest";
// Boot side-effect: self-registers every compiled-IR card so the gate sees real effects.
import "../cards/index.js";
import { setupEngine } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

/**
 * The Main-phase action gate (`GameEngine.hasAnyMainPhaseAction`) decides whether the
 * engine force-ends the turn under the player. Every legal action kind the server already
 * publishes as an affordance must read as an action here, or the turn ends while the client
 * is still offering the move.
 *
 * Each scenario below arranges a board whose ONLY legal action is the kind named, so the
 * assertion fails whenever the gate stops covering that kind. All five were RED before the
 * gate was rewritten to read the `syncActivatableEffects` / `syncLinkTargets` projections
 * and to probe `validateDnaDigivolve`.
 */
describe("Main-phase action gate — every legal action kind keeps the turn open", () => {
  it("sees a [Hand][Main] effect (BT10-025 Cyberdramon)", async () => {
    // Memory -3: the effect's own 3-memory cost is payable, but Cyberdramon's play cost (8)
    // is not, and its Lv.4 digivolution requirement rejects the Lv.5 host.
    const s = setupEngine({
      0: {
        hand: [{ card: "BT10-025", as: "cyber" }],
        battleArea: [{ card: "BT10-024", as: "host", suspended: true }],
      },
    });
    s.state.memory = -3;
    await s.ready();

    expect(JSON.parse(s.inst("cyber").activatableEffectsJson || "[]")).toHaveLength(1);
    expect(observe(s.engine).hasAnyMainPhaseAction(0)).toBe(true);
  });

  it("sees a [Trash][Main] effect (BT26-079 ZombiePlutomon)", async () => {
    const s = setupEngine({ 0: { trash: [{ card: "BT26-079", as: "zombie" }] } });
    s.state.memory = 6;
    await s.ready();

    expect(JSON.parse(s.inst("zombie").activatableEffectsJson || "[]")).toHaveLength(1);
    expect(observe(s.engine).hasAnyMainPhaseAction(0)).toBe(true);
  });

  it("sees a [Breeding][Main] effect on a breeding-area Digimon (EX9-005)", async () => {
    const s = setupEngine({ 0: { breeding: { card: "EX9-005", as: "breed" }, deck: ["BT1-009", "BT1-010"] } });
    await s.ready();

    expect(JSON.parse(s.perm("breed").activatableEffectsJson || "[]")).toHaveLength(1);
    expect(observe(s.engine).hasAnyMainPhaseAction(0)).toBe(true);
  });

  it("sees a link declaration (BT23-007 onto BT23-009)", async () => {
    // Memory -9 leaves exactly the link cost affordable; BT23-007's play cost (3) is not,
    // and its Lv.2 digivolution requirement rejects the Lv.4 recipient.
    const s = setupEngine({
      0: {
        hand: [{ card: "BT23-007", as: "link" }],
        battleArea: [{ card: "BT23-009", as: "recipient", suspended: true }],
      },
    });
    s.state.memory = -9;
    await s.ready();

    expect([...s.inst("link").linkTargetPermanentIds]).toEqual([s.perm("recipient").permanentId]);
    expect(observe(s.engine).hasAnyMainPhaseAction(0)).toBe(true);
  });

  it("sees a DNA digivolution (BT20-045 Examon off Breakdramon + Slayerdramon)", async () => {
    // Memory -10 leaves only a cost-0 action affordable: Examon's printed DNA requirement
    // costs 0, while its play cost (9) and single-base digivolution cost (5) are out of reach.
    // Both materials are suspended, so no attack is available either.
    const s = setupEngine({
      0: {
        hand: [{ card: "BT20-045", as: "examon" }],
        battleArea: [
          { card: "BT20-044", as: "break", suspended: true },
          { card: "BT20-027", as: "slayer", suspended: true },
        ],
      },
    });
    s.state.memory = -10;
    await s.ready();

    expect(observe(s.engine).hasAnyMainPhaseAction(0)).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("break").permanentId, s.perm("slayer").permanentId],
        instanceId: s.inst("examon").instanceId,
      }),
    ).toEqual({ ok: true });
  });

  it("still force-ends a turn with nothing left to do", async () => {
    const s = setupEngine({ 0: { hand: ["BT10-025"] } });
    s.state.memory = -10;
    await s.ready();

    expect(observe(s.engine).hasAnyMainPhaseAction(0)).toBe(false);
  });
});
