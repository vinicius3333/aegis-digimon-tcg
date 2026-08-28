import type { PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-081.js";

describe("BT6-081 Titamon", () => {
  it("trashes a hand card then plays a purple level 4 from trash", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-012", as: "base" }],
          hand: [
            { card: "BT6-081", as: "evolving" },
            { card: "BT1-010", as: "discard" },
          ],
          trash: [{ card: "BT2-072", as: "played" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("discard").instanceId, s.inst("played").instanceId);
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT6-081"));

    expect(player.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("played").instanceId)).toBe(
      true,
    );
    expect(player.trash.some((card) => card.instanceId === s.inst("discard").instanceId)).toBe(true);
  });

  it("gains +2000 DP and Security Attack +1 only once per turn when a hand card is trashed", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-081", as: "titamon" }],
        hand: [
          { card: "BT1-010", as: "first" },
          { card: "BT1-011", as: "second" },
        ],
      },
    });
    await s.ready();
    const baseDP = s.perm("titamon").currentDP;

    await advance(s.engine).verb.trash([s.inst("first").instanceId]);
    await advance(s.engine).verb.trash([s.inst("second").instanceId]);

    expect(s.perm("titamon").currentDP).toBe(baseDP + 2000);
    expect(observe(s.engine).keywordAmount(s.perm("titamon"), "SecurityAttack")).toBe(1);
  });
});
