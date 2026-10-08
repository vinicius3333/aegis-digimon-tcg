import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "./testkit/harness.js";

const protectionPrompt = "Prevent leaving the battle area?";

describe("#5363 Veemon inherited protection arena", () => {
  it("saves the unsuspended Ulforce X and deletes the already suspended control", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine({ 0: {}, 1: {} }, { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds });
    layDevScenario("arena-ex13-veemon-protection-5363", s.state, [RED_DECK, BLUE_DECK]);
    const defender = s.state.players[1]!;
    const readyHost = defender.battleArea.find((p) => p.permanentId === "dev-perm-1-veemon-unsuspended")!;
    const suspendedHost = defender.battleArea.find((p) => p.permanentId === "dev-perm-1-veemon-suspended")!;
    const prompts = () =>
      s.decisions.filter(({ req }) => req.kind === "optional" && req.promptText === protectionPrompt);
    expect(readyHost.isSuspended).toBe(false);
    expect(suspendedHost.isSuspended).toBe(true);

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    preferInstanceIds.push(readyHost.permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: "dev-perm-0-veemon-base-1",
        instanceId: "dev-veemon-wargreymon-1",
      }),
    ).toEqual({ ok: true });
    await settle(() => readyHost.isSuspended && s.state.pendingDecision === undefined && s.state.phase === Phase.Main);
    expect(defender.battleArea.map((p) => p.permanentId)).toContain(readyHost.permanentId);
    expect(readyHost.stack.map((c) => c.cardId)).toEqual(["EX13-017"]);
    expect(prompts()).toHaveLength(1);
    expect(prompts()[0]!.seat).toBe(1);

    await advance(s.engine).waitForMainPhase(0);
    preferInstanceIds.splice(0, preferInstanceIds.length, suspendedHost.permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: "dev-perm-0-veemon-base-2",
        instanceId: "dev-veemon-wargreymon-2",
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        defender.trash.some((c) => c.instanceId === suspendedHost.topCard.instanceId) &&
        s.state.pendingDecision === undefined,
    );
    expect(defender.battleArea.map((p) => p.permanentId)).toEqual([readyHost.permanentId]);
    expect(defender.trash.map((c) => c.cardId)).toEqual(expect.arrayContaining(["BT12-029", "EX13-017"]));
    expect(prompts()).toHaveLength(1);
    assertNoLoudGap(s);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
