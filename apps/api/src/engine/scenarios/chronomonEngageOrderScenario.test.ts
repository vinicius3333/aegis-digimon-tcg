import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

it("Discord 1557926494536466514: arena completes the first attack before offering Engage", async () => {
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoSelectCards: true,
      autoChooseOption: true,
      preferTriggerKeys: ["BT26-015"],
      preferOptionIndex: 1,
      preferInstanceIds: ["engage-filler-0"],
    },
  );
  layDevScenario("arena-chronomon-engage-order", s.state, [BLUE_DECK, RED_DECK]);
  const host = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT26-013")!;
  await s.ready();
  const loop = s.engine.startTurnLoop();
  const engageCounts: { checks: number; ends: number }[] = [];
  const responses: { ok: boolean }[] = [];
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: host.permanentId,
        instanceId: "engage-buten",
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    for (let step = 0; step < 20000; step++) {
      if (s.state.turnSeat === 1 && !s.state.pendingDecision) break;
      const pending = s.state.pendingDecision;
      if (pending?.kind === "optional") {
        const request = s.decisions.find((d) => d.req.decisionId === pending.decisionId)!.req;
        if (request.options?.timing === "EndOfYourTurn") {
          engageCounts.push({
            checks: s.events.filter((e) => e.kind === "securityChecked").length,
            ends: s.events.filter((e) => e.kind === "attackEnded").length,
          });
        }
        responses.push(
          s.engine.applyIntent(pending.seat, {
            type: "respondDecision",
            decisionId: pending.decisionId,
            response: { kind: "optional", accept: true },
          }),
        );
      }
      if (step % 200 === 199) await new Promise<void>((resolve) => setImmediate(resolve));
      else await Promise.resolve();
    }
    expect(engageCounts).toEqual([{ checks: 1, ends: 1 }]);
    expect(responses.length).toBeGreaterThan(0);
    expect(responses.every((response) => response.ok)).toBe(true);
    expect(host.topCard.cardId).toBe("BT26-016");
    expect(s.events.filter((e) => e.kind === "securityChecked")).toHaveLength(2);
    expect(s.events.filter((e) => e.kind === "attackEnded")).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.state.turnSeat).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  } finally {
    if (s.state.phase === Phase.Breeding) s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
    s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
    await loop;
  }
});
