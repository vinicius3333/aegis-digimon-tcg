import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import "./BT7-102.js";

const DELAY_KEY = "BT7-102/delay-gain-2-memory";

function boosterBoard() {
  return setup(
    {
      0: {
        battleArea: [{ card: "BT1-064", dp: 3000 }],
        hand: [{ card: "BT7-102", as: "option" }],
      },
      1: { battleArea: [{ card: "AD1-001", dp: 3000, as: "foe" }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
}

function playBooster(s: ReturnType<typeof boosterBoard>): { instanceId: string } {
  const option = s.inst("option");
  s.state.memory = 3;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId })).toEqual({
    ok: true,
  });
  return { instanceId: option.instanceId };
}

describe("BT7-102 ＜Delay＞ option-permanent subsystem", () => {
  it("suspends an opponent Digimon and lands in the BATTLE AREA (not the trash)", async () => {
    const s = boosterBoard();
    const p0 = s.state.players[0] as PlayerState;
    const foe = s.perm("foe");

    playBooster(s);
    await settle(() => p0.battleArea.some((perm) => perm.topCard?.cardId === "BT7-102") && foe.isSuspended);

    expect(foe.isSuspended).toBe(true);
    expect(p0.battleArea.some((perm) => perm.topCard?.cardId === "BT7-102")).toBe(true);
    expect(p0.trash.some((c) => c.cardId === "BT7-102")).toBe(false);
  });

  it("cannot activate <Delay> the turn it entered, but DOES on a later turn (trash + gain 2)", async () => {
    const s = boosterBoard();
    const p0 = s.state.players[0] as PlayerState;

    playBooster(s);
    await settle(
      () => p0.battleArea.some((perm) => perm.topCard?.cardId === "BT7-102") && s.state.pendingDecision === undefined,
    );
    const perm = p0.battleArea.find((p) => p.topCard?.cardId === "BT7-102")!;
    const optionInstanceId = perm.topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: optionInstanceId,
        effectKey: DELAY_KEY,
      }).ok,
    ).toBe(false);
    expect(s.state.memory).toBe(0);
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT7-102")).toBe(true);

    s.state.turnCount += 1;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: optionInstanceId,
        effectKey: DELAY_KEY,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory !== 0);

    expect(s.state.memory).toBe(2);
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT7-102")).toBe(false);
    expect(p0.trash.some((c) => c.cardId === "BT7-102")).toBe(true);
  });
});
