import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT12-092.js";

describe("BT12-092 compiled IR module", () => {
  it("registers each printed timing through one declarative effect record", () => {
    const module = getEffectModule("BT12-092");
    expect(module?.cardId).toBe("BT12-092");
    const source = {
      instanceId: "source-092",
      cardId: "BT12-092",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnStartMainPhase, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "YourTurn",
          actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenSuspended" })],
        }),
      ]),
    );
  });

  it("pays 1 memory and becomes a 3000 DP Digimon when Agumon or Greymon is present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-092", as: "marcus" },
            { card: "BT12-034", as: "agumon" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("marcus"));
    expect(s.state.memory).toBe(4);
    expect(s.perm("marcus").currentDP).toBe(3000);
  });

  it("digivolves a Digimon into a yellow Greymon for free when Marcus becomes suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-092", as: "marcus" },
            { card: "BT12-038", as: "host" },
          ],
          hand: [{ card: "BT12-042", as: "rize" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("marcus").permanentId]);
    await settle(() => s.perm("host").topCard.cardId === "BT12-042");

    expect(s.perm("marcus").isSuspended).toBe(true);
    expect(s.perm("host").topCard.cardId).toBe("BT12-042");
  });

  it("plays Marcus from security without paying its memory cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT12-092", as: "marcus", faceUp: true }] } });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("marcus"));

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-092")).toBe(true);
  });
});
