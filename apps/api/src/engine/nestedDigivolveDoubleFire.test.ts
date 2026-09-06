import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { registerIrCard } from "./effects/interpreter.js";
import { compiled as driverCompiled } from "../cards/ST1/ST1-02.js";
import { setupEngine } from "./testkit/harness.js";
import "../cards/index.js";

/**
 * Regression: a permanent that digivolves into a [When Digivolving] card MID-WINDOW must
 * not fire that card's [When Digivolving] twice.
 *
 * `fireTimingForPermanent` (the permanent-scoped WhenDigivolving / WhenAttacking window)
 * re-collects the permanent's live instances every resolver pass. When an effect resolving
 * inside that window digivolves the SAME permanent into a new top card, the effect-driven
 * entry seam (`fireEnteredByEffect` -> `fireTimingForInstance`) already fires the new card's
 * [When Digivolving] once. Without freezing the subject-instance set at window open, the
 * outer re-collect would surface the new top card and fire it a SECOND time.
 *
 * The vehicle: `DRIVER_ID` is a vanilla card (an empty IR module) hijacked with a
 * [When Digivolving] that digivolves its own permanent into a Lv.6 Digimon (EX11-024) from
 * hand, ignoring cost/requirements. A manual digivolve onto it opens the permanent-scoped
 * window; EX11-024's [When Digivolving] "play 1 [Puppet]" must resolve exactly once.
 */
const DRIVER_ID = "ST1-02"; // vanilla Lv.3 Red (evoCost Lv.2 Red)
const EGG_BASE_ID = "BT1-001"; // Lv.2 Red DigiEgg — matches ST1-02's evoCost
const PUPPET_A = "BT11-035";
const PUPPET_B = "BT13-035";

beforeAll(() => {
  registerIrCard(DRIVER_ID, {
    effects: [
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "Digivolve",
            target: {
              filter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "gte", value: 3 } },
              count: 1,
            },
            into: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "gte", value: 6 } },
            from: ["hand"],
            payCost: false,
            ignoreRequirements: true,
          },
        ],
      },
    ],
    coverage: "full",
    residual: [],
  } as never);
});

afterAll(() => {
  // Restore both executable and compiled registries. Removing only the executable
  // module leaves the synthetic IR visible to later files under `isolate: false`.
  registerIrCard(DRIVER_ID, driverCompiled);
});

describe("nested digivolve does not double-fire WhenDigivolving", () => {
  it("plays EX11-024's [When Digivolving] Puppet exactly once when digivolved into mid-window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: EGG_BASE_ID, dp: 2000, as: "base" }],
          deck: ["BT1-009"], // digivolve draw source
          hand: [{ card: PUPPET_A }, { card: PUPPET_B }, { card: "EX11-024" }, { card: DRIVER_ID, as: "driver" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", dp: 3000 }], // scaling subject for the token/DP effects
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 11;

    const p0 = s.state.players[0] as PlayerState;
    const puppetsBefore = p0.hand.filter((c) => c.cardId === PUPPET_A || c.cardId === PUPPET_B).length;

    const res = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("driver").instanceId,
    } as never);
    expect(res).toEqual({ ok: true });

    for (let i = 0; i < 300; i++) await new Promise((r) => setTimeout(r, 0));

    expect(s.perm("base").topCard?.cardId).toBe("EX11-024"); // the nested digivolve actually happened
    const puppetsPlayed = puppetsBefore - p0.hand.filter((c) => c.cardId === PUPPET_A || c.cardId === PUPPET_B).length;
    expect(puppetsPlayed).toBe(1); // NOT 2 — the WhenDigivolving Puppet play fires once
  });
});
