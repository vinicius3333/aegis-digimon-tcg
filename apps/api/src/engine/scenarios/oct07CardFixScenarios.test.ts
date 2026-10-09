import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle } from "../testkit/harness.js";

async function startHumanMain(s: ReturnType<typeof setupEngine>): Promise<{ loop: Promise<void> }> {
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return { loop };
}

describe("October 7 Discord card-fix arena scenarios", () => {
  it("Discord 1557417507898269858: Kurata's Gizmon: AT deletion reduces Belphemon: Sleep Mode by 6", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-bt13-kurata-belphemon-play-cost", s.state, [BLUE_DECK, RED_DECK]);
    const human = s.state.players[0]!;
    const { loop } = await startHumanMain(s);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-kurata-belphemon" })).toEqual({ ok: true });
    await settle(
      () =>
        human.battleArea.some(({ topCard }) => topCard.instanceId === "dev-kurata-belphemon") &&
        s.state.pendingDecision === undefined,
      5000,
    );

    expect(human.battleArea.some(({ permanentId }) => permanentId === "dev-perm-0-kurata-gizmon")).toBe(false);
    expect(s.state.memory).toBe(0);
    expect(s.state.turnSeat).toBe(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Discord 1557413340161253496: Close returns itself and plays Sunarizamon with no Close in hand", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-ex10-close-sunarizamon-without-close", s.state, [BLUE_DECK, RED_DECK]);
    const human = s.state.players[0]!;
    const { loop } = await startHumanMain(s);
    await settle(() => s.state.pendingDecision === undefined, 5000);

    expect(human.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual(["dev-close-sunarizamon"]);
    expect(human.deck.at(-1)?.instanceId).toBe("dev-field-0-close-tamer");
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Discord 1557413340161253496: Pyramidimon's Fragment trash triggers its [All Turns] recovery", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["By trashing any 3"] },
    );
    layDevScenario("arena-ex11-pyramidimon-fragment-recovery", s.state, [BLUE_DECK, RED_DECK]);
    const pyramidimon = () =>
      s.state.players[0]!.battleArea.find(({ permanentId }) => permanentId === "dev-perm-0-pyramidimon");
    const { loop } = await startHumanMain(s);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: "dev-perm-0-pyramidimon",
        target: { kind: "permanent", permanentId: "dev-perm-1-pyramidimon-brachiomon" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined, 5000);

    expect(s.events.some((event) => event.kind === "deletionPrevented" && event.keyword === "Fragment")).toBe(true);
    expect(pyramidimon()?.stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining(["dev-pyramidimon-trash-a", "dev-pyramidimon-trash-b", "dev-pyramidimon-trash-c"]),
    );
    expect(pyramidimon()?.stack).toHaveLength(4);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
