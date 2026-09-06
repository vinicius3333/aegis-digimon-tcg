import { describe, expect, it } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/BT20/BT20-036.js";
import "../../cards/BT20/BT20-043.js";
import "../../cards/BT13/BT13-087.js";
import "../../cards/P/P-221.js";
import "../../cards/BT14/BT14-014.js";

type Triggered = Extract<ServerEvent, { kind: "effectTriggered" }>;
type Resolved = Extract<ServerEvent, { kind: "effectResolved" }>;
type Attack = Extract<ServerEvent, { kind: "attackDeclared" }>;

/**
 * BT20-036's End of Your Turn effect performs a public DNA digivolution and then
 * attacks with the result.  P-221 supplies two When Digivolving effects and one When
 * Attacking DP modifier.  This is deliberately driven through runOneTurn(): the
 * attack's two Security checks and the turn-end sweep are the production timing
 * boundaries where deferred trigger collection used to replay those effects.
 */
describe("deferred triggers from a DNA attack", () => {
  it.each([25000, 20000])("resolves P-221 effects and DP rules before Counter (target DP %i)", async (targetDP) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-036", as: "bancho" },
            { card: "BT13-087", as: "partner" },
          ],
          hand: [{ card: "P-221", as: "chaosmon" }],
          deck: ["BT20-001", "BT20-002", "BT20-003", "BT20-004", "BT20-005", "BT20-006"],
        },
        1: {
          battleArea: [
            { card: "BT20-010", dp: targetDP, as: "target" },
            { card: "BT20-012", as: "counterBase" },
          ],
          hand: [{ card: "BT14-014", as: "counter" }],
          security: ["BT20-001", "BT20-002"],
          deck: ["BT20-003", "BT20-004", "BT20-005", "BT20-006", "BT20-007", "BT20-008"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const counterIndex = s.events.findIndex((event) => event.kind === "counterWindowOpened");
    expect(counterIndex).toBeGreaterThanOrEqual(0);
    expect(s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "P-221")).toHaveLength(
      3,
    );
    expect(s.state.players[1]!.security).toHaveLength(2);
    const targetAtCounter = s.state.players[1]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("target").instanceId,
    );
    expect(targetAtCounter?.currentDP).toBe(targetDP === 25000 ? 5000 : undefined);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(
      targetDP === 20000,
    );
    expect(s.engine.applyIntent(1, { type: "respondCounter" })).toEqual({ ok: true });
    await turn;

    const attackDeclarations = s.events.filter((event) => event.kind === "attackDeclared");
    expect(attackDeclarations).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();

    const p221Triggered = s.events.filter(
      (event): event is Triggered => event.kind === "effectTriggered" && event.sourceCardId === "P-221",
    );
    const p221Resolved = s.events.filter(
      (event): event is Resolved => event.kind === "effectResolved" && event.sourceCardId === "P-221",
    );
    expect(p221Triggered).toHaveLength(3);
    expect(p221Resolved).toHaveLength(3);
    expect(p221Triggered.map((event) => event.timing).sort()).toEqual([
      "OnUseAttack",
      "WhenDigivolving",
      "WhenDigivolving",
    ]);
    expect(p221Resolved.map((event) => event.timing).sort()).toEqual([
      "OnUseAttack",
      "WhenDigivolving",
      "WhenDigivolving",
    ]);

    const firstSecurityCheck = s.events.findIndex((event) => event.kind === "securityChecked");
    expect(firstSecurityCheck).toBeGreaterThan(-1);
    for (const event of [...p221Triggered, ...p221Resolved]) {
      expect(s.events.indexOf(event)).toBeLessThan(counterIndex);
      expect(s.events.indexOf(event)).toBeLessThan(firstSecurityCheck);
    }

    const result = s.state.players[0]!.battleArea[0]!;
    expect(result.topCard.cardId).toBe("P-221");
    expect(result.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT20-036", "BT13-087"]));
    expect(result.stack).toHaveLength(2);
    expect(
      s.state.players[1]!.battleArea.find((permanent) => permanent.topCard.instanceId === s.inst("target").instanceId)
        ?.currentDP,
    ).toBe(targetDP === 25000 ? 5000 : undefined);
  });

  it("BT20-043 lets only the DNA result attack and resolves its WD/WA effects once", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-043", as: "varodurumon" },
            { card: "BT13-087", as: "partner" },
            { card: "BT20-010", dp: 3000, as: "unrelatedAlly" },
          ],
          hand: [{ card: "P-221", as: "chaosmon" }],
          deck: ["BT20-001", "BT20-002", "BT20-003", "BT20-004", "BT20-005", "BT20-006"],
        },
        1: {
          battleArea: [
            { card: "BT20-010", dp: 25000, as: "target" },
            { card: "BT20-012", as: "counterBase" },
          ],
          hand: [{ card: "BT14-014", as: "counter" }],
          security: ["BT20-001", "BT20-002"],
          deck: ["BT20-003", "BT20-004", "BT20-005", "BT20-006", "BT20-007", "BT20-008"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    expect(s.perm("target").currentDP).toBe(1000); // inherited -4000 is still active during this turn
    expect(s.engine.applyIntent(1, { type: "respondCounter" })).toEqual({ ok: true });
    await turn;

    const attacks = s.events.filter((event): event is Attack => event.kind === "attackDeclared");
    expect(attacks).toHaveLength(1);
    const result = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "P-221");
    expect(result).toBeDefined();
    expect(attacks[0]!.attackerPermanentId).toBe(result!.permanentId);
    expect(s.perm("unrelatedAlly")).toBeDefined();

    const p221Triggered = s.events.filter(
      (event): event is Triggered => event.kind === "effectTriggered" && event.sourceCardId === "P-221",
    );
    const p221Resolved = s.events.filter(
      (event): event is Resolved => event.kind === "effectResolved" && event.sourceCardId === "P-221",
    );
    expect(p221Triggered).toHaveLength(3);
    expect(p221Resolved).toHaveLength(3);
    expect(p221Triggered.map((event) => event.timing).sort()).toEqual([
      "OnUseAttack",
      "WhenDigivolving",
      "WhenDigivolving",
    ]);
    expect(p221Resolved.map((event) => event.timing).sort()).toEqual([
      "OnUseAttack",
      "WhenDigivolving",
      "WhenDigivolving",
    ]);

    const firstSecurityCheck = s.events.findIndex((event) => event.kind === "securityChecked");
    expect(firstSecurityCheck).toBeGreaterThan(-1);
    for (const event of [...p221Triggered, ...p221Resolved]) {
      expect(s.events.indexOf(event)).toBeLessThan(firstSecurityCheck);
    }
    expect(s.perm("target").currentDP).toBe(5000); // inherited for-the-turn modifier expired
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
