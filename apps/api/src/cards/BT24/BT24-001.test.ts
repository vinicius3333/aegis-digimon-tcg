import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-001.js";
import "../index.js";

describe("BT24-001 Gigimon", () => {
  it("may delete an opponent's 3000-DP-or-less Digimon when their security is removed", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    expect(inherited.frequency).toBe("OncePerTurn");
    expect(inherited.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      sourceFilter: { controller: "opponent" },
      fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "opponent" },
    });
    expect(inherited.actions[0].actions[0]).toMatchObject({
      kind: "Delete",
      optional: true,
      target: { filter: { controller: "opponent", dp: { op: "lte", value: 3000 } } },
    });
  });

  it("deletes an opposing 3000-DP Digimon from an evolution stack only once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT24-001"] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "boundary", dp: 3000 },
            { card: "BT1-009", as: "second", dp: 2000 },
            { card: "BT1-009", as: "tooLarge", dp: 4000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.state.players[1]!.battleArea).toHaveLength(3);

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("tooLarge").permanentId),
    ).toBe(true);

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
  });

  it("does nothing when the optional deletion is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT24-001"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
