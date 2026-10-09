import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

describe("BT11 Rina / Mailmon suspended subject arena", () => {
  it("GitHub #5016: Mailmon's locked Ulforce cannot lend an effect when another Veedramon attacks", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferTriggerKeys: ["BT11-112"],
        preferInstanceIds: preferred,
      },
    );
    layDevScenario("arena-bt11-rina-mailmon-suspended-subject", s.state, [BLUE_DECK, RED_DECK]);
    const host = s.state.players[0]!.battleArea[0]!;
    const rina = s.state.players[1]!.battleArea.find(({ topCard }) => topCard.cardId === "BT11-112")!;
    const ulforce = s.state.players[1]!.battleArea.find(({ topCard }) => topCard.cardId === "EX13-023")!;
    const veedramon = s.state.players[1]!.battleArea.find(({ topCard }) => topCard.cardId === "EX13-019")!;
    preferred.push(ulforce.permanentId);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: "dev-rina-mailmon-link",
        targetPermanentId: host.permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(ulforce, "suspend") && s.state.pendingDecision === undefined);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: ulforce.permanentId, target: { kind: "player" } }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: veedramon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.events.some((event) => event.kind === "securityChecked") && s.state.pendingDecision === undefined,
    );

    expect(rina.isSuspended).toBe(true);
    expect(veedramon.isSuspended).toBe(true);
    expect(ulforce.isSuspended).toBe(false);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([host.permanentId]);
    expect(s.events.filter((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX13-023")).toEqual(
      [],
    );
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "BT11-112" && req.kind === "chooseOption")).toEqual([]);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    // The attack can auto-pass into breeding; timer expiry also releases that phase's waiter.
    s.engine.expireMatchTimer(1);
    await loop;
  });
});
