import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-021.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT16-021", () => {
  it("models Blocker and Armor Purge", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Blocker" }, { keyword: "Armor Purge" }],
    });
  });

  it("trashes and restricts an opponent Digimon when it suspends", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({ kind: "SubTrigger", event: "whenSuspended" });
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      actions: [
        expect.objectContaining({
          kind: "TrashDigivolution",
          amount: 1,
          target: expect.objectContaining({
            count: 1,
            filter: expect.objectContaining({ digivolutionCards: "hasAny" }),
          }),
        }),
        expect.objectContaining({ kind: "Restrict", restriction: "attackOrBlock", duration: "untilOpponentTurnEnd" }),
      ],
    });
  });

  it("naturally trashes the top source and restricts the resulting source-less opponent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-021", as: "watcher" }] },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", under: ["BT1-009"] }] },
      },
      { autoSelectCards: true },
    );
    const sourceId = s.perm("attacker").stack[0]!.instanceId;
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").stack.length === 0);

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === sourceId)).toBe(true);
    expect(s.perm("attacker").stack).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("attacker"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("attacker"), "block")).toBe(true);
  });
});
