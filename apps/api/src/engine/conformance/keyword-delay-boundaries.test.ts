import { describe, expect, it } from "vitest";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import { cite } from "./_kb.js";
import "../../cards/P/index.js";

const DELAY_FINGERPRINT = "866991fdeb6c896a2840c30399a87d353e8cbd33d30f706e6729ba46bd4428d2";

describe("Delay public boundaries", () => {
  it("refuses the entry-turn Delay and activates it after a natural owner-turn boundary", async () => {
    cite(
      "comprehensive-0235",
      "§16-17-1/2/3: Delay trashes its battle-area source, is optional, and cannot activate the turn it entered",
      DELAY_FINGERPRINT,
    );
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-027", as: "blueSource" }],
          hand: [
            { card: "P-036", as: "delay" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-027", "BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    const control = setupEngine({ 0: { battleArea: [{ card: "P-036", as: "control" }] } });
    await control.ready();
    const controlEntry = observe(control.engine)
      .activatableEffects(control.perm("control"))
      .find((entry) => entry.instanceId === control.inst("control").instanceId);
    expect(controlEntry).toBeDefined();
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      const delayId = s.inst("delay").instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: delayId })).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === delayId));
      const delay = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === delayId)!;
      expect(
        observe(s.engine)
          .activatableEffects(delay)
          .some((entry) => entry.instanceId === delayId),
      ).toBe(false);
      const memoryOnEntryTurn = s.state.memory;
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: delayId,
          effectKey: controlEntry!.effectKey,
        }).ok,
      ).toBe(false);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(delayId);
      expect(s.state.memory).toBe(memoryOnEntryTurn);
      expect(s.state.pendingDecision).toBeUndefined();

      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const laterEntry = observe(s.engine)
        .activatableEffects(delay)
        .find((entry) => entry.instanceId === delayId);
      expect(laterEntry).toBeDefined();
      const memoryBefore = s.state.memory;
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: delayId,
          effectKey: laterEntry!.effectKey,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[0]!.trash.some((card) => card.instanceId === delayId) &&
          s.state.pendingDecision === undefined,
      );
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(delayId);
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === delayId)).toBe(false);
      expect(s.state.memory).toBe(memoryBefore + 2);
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: delayId,
          effectKey: laterEntry!.effectKey,
        }).ok,
      ).toBe(false);
    } finally {
      if (!s.state.gameOver) s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
      await loop;
    }
  });
});
