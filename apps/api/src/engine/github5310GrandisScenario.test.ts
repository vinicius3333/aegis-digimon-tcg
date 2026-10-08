import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

describe("GitHub #5310 independent Grandis and Okuwamon timing arenas", () => {
  it("keeps the actual turn loop at zero after one Okuwamon grant and one Grandis suspension", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoSelectCards: true });
    layDevScenario("arena-github5310-okuwamon-grandis-memory", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: "dev-perm-0-5310-host",
        instanceId: "dev-5310-grandis",
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT9-055") &&
        s.state.pendingDecision === undefined,
    );
    await advance(s.engine).waitForMainPhase(0);

    const host = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === "dev-perm-0-5310-host")!;
    const opponent = s.state.players[1]!.battleArea.find(
      (permanent) => permanent.permanentId === "dev-perm-1-5310-opponent",
    )!;
    expect(host.topCard.cardId).toBe("BT9-055");
    expect(host.stack.map((card) => card.cardId)).toEqual(["P-075"]);
    expect(host.currentDP).toBe(16000);
    expect(observe(s.engine).hasPierce(host)).toBe(true);
    expect(opponent.isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(s.state.turnSeat).toBe(0);
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(
      s.events.flatMap((event) => (event.kind === "memoryChanged" && event.reason === "gainMemory" ? [event.to] : [])),
    ).toEqual([0]);
    expect(
      s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "BT9-055"),
    ).toHaveLength(1);
    expect(s.events.filter((event) => event.kind === "effectTriggered").length).toBeLessThanOrEqual(3);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("keeps Grandis suspended through security and unsuspends only at the first End of Attack", async () => {
    const suspendedDuringChecks: boolean[] = [];
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoSelectCards: true,
        onEvent(event) {
          if (event.kind === "securityChecked") {
            suspendedDuringChecks.push(
              s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === "dev-perm-0-5310-host")!
                .isSuspended,
            );
          }
        },
      },
    );
    layDevScenario("arena-github5310-grandis-end-of-attack", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    for (const attack of [1, 2]) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: "dev-perm-0-5310-host",
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () => s.events.filter((event) => event.kind === "attackEnded").length === attack && !s.state.pendingDecision,
      );
      await advance(s.engine).waitForMainPhase(0);
      expect(s.state.players[0]!.battleArea[0]!.isSuspended).toBe(attack === 2);
    }

    expect(suspendedDuringChecks).toEqual([true, true]);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.state.players[1]!.battleArea[0]!.isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea[0]!.currentDP).toBe(16000);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(
      s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "BT9-055"),
    ).toMatchObject([{ timing: "OnEndAttack" }]);
    expect(s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "gainMemory")).toHaveLength(0);
    expect(s.state.memory).toBe(3);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
