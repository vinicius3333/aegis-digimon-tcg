import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

const CHERUBIMON = "dev-perm-1-metalgarurumon-cherubimon";
const SALAMON = "dev-perm-1-metalgarurumon-salamon";
const CHERUBIMON_SOURCE = "dev-stack-1-metalgarurumon-cherubimon-0";

describe("EX12 MetalGarurumon Discord arena scenario", () => {
  it("trashes the sources first, then asks for the return target separately (Discord 1555176240359415878)", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario("arena-ex12-metalgarurumon-trash-then-return", s.state, [BLUE_DECK, RED_DECK]);
    const bot = s.state.players[1]!;

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: "dev-perm-0-metalgarurumon-base",
        instanceId: "dev-metalgarurumon-in-hand",
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision !== undefined);

    const { req } = s.decisions.at(-1)!;
    expect(req.kind).toBe("chooseTargets");
    expect(req.options).toMatchObject({
      candidateInstanceIds: [CHERUBIMON, SALAMON],
      min: 1,
      max: 1,
      targetFate: "returnToDeck",
    });
    expect(bot.trash.map(({ instanceId }) => instanceId)).toContain(CHERUBIMON_SOURCE);
    expect(bot.battleArea.find(({ permanentId }) => permanentId === CHERUBIMON)?.stack).toHaveLength(0);
    // The trash had no choice to ask for, so this event is the only way the player learns it happened.
    expect(
      s.events.find((event) => event.kind === "cardsMoved" && event.instanceIds.includes(CHERUBIMON_SOURCE)),
    ).toMatchObject({
      to: "trash",
      seat: 1,
      cardIds: ["BT16-024"],
      trashedSources: { permanentId: CHERUBIMON, hostCardId: "EX6-035", sourceCardId: "EX12-035" },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: req.decisionId,
        response: { kind: "chooseTargets", instanceIds: [SALAMON] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => bot.battleArea.every(({ permanentId }) => permanentId !== SALAMON) && s.state.pendingDecision === undefined,
    );

    expect(bot.battleArea.map(({ permanentId }) => permanentId)).toEqual([CHERUBIMON]);
    expect(bot.deck.at(-1)?.cardId).toBe("BT15-034");

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
