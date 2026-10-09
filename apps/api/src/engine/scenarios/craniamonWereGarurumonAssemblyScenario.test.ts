import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const MATERIALS = ["dev-craniamon-lv5", "dev-craniamon-lv4", "dev-craniamon-lv3"];

describe("Craniamon WereGarurumon Assembly arena scenario", () => {
  it("Discord 1556898336567459890: plays Craniamon with WereGarurumon as the Lv.5 material for 7", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true });
    layDevScenario("arena-ex13-craniamon-weregarurumon-assembly", s.state, [BLUE_DECK, RED_DECK]);
    s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(0);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: "dev-craniamon",
        assembly: { materialInstanceIds: MATERIALS },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === "dev-craniamon"),
    );
    const craniamon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.instanceId === "dev-craniamon")!;
    expect(craniamon.stack.map(({ instanceId }) => instanceId)).toEqual([...MATERIALS].reverse());
    expect(craniamon.stack.map(({ cardId }) => cardId)).toEqual(["EX13-047", "EX13-051", "BT23-056"]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      "dev-craniamon-inherited-blocker",
      "dev-craniamon-blue-blocker",
    ]);
    await settle(() => s.state.turnSeat === 1 && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(7);
  });
});
