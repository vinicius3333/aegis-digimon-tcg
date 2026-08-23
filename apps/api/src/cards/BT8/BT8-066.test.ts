import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-066.js";
import "./BT8-092.js";

describe("BT8-066 Hisyaryumon", () => {
  it("gives Reboot to an X-Antibody host on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-069", as: "host", under: ["BT8-066"], suspended: true }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
  });

  it("digivolves for 1 less after Yuji places a digivolution card under it", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-092", as: "yuji" },
            { card: "BT8-066", as: "hisyaryumon" },
          ],
          hand: [
            { card: "BT8-060", as: "placed" },
            { card: "BT8-069", as: "ouryumon" },
          ],
        },
        1: { security: ["BT8-034"] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.inst("placed").instanceId, s.inst("ouryumon").instanceId);
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hisyaryumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("hisyaryumon").topCard.instanceId === s.inst("ouryumon").instanceId);

    expect(s.perm("yuji").isSuspended).toBe(true);
    expect(s.perm("hisyaryumon").stack.some((card) => card.instanceId === s.inst("placed").instanceId)).toBe(true);
    expect(s.state.memory).toBe(2);
  });
});
