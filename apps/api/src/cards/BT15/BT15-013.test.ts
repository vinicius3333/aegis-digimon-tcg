import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-013.js";

describe("BT15-013", () => {
  it("returns one red Avian/Bird/Beast/Animal/Sovereign other than Sea Animal from trash", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Return",
          to: "hand",
          target: {
            count: 1,
            filter: {
              zone: "trash",
              colors: ["Red"],
              excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
            },
          },
        },
      ],
    }));
  it("gains 1 memory once per turn when an opponent's security is removed", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved", sourceFilter: { controller: "opponent" } }],
    }));

  it("digivolves from a red level 3 for 2 and recovers only the qualifying red Bird", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "base" }],
          hand: [{ card: "BT15-013", as: "birdramon" }],
          trash: [
            { card: "BT1-012", as: "redBird" },
            { card: "BT14-008", as: "redSeaAnimal" },
            { card: "BT10-060", as: "blackBird" },
            { card: "BT1-009", as: "redNonMatch" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("birdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("redBird").instanceId));

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").topCard.cardId).toBe("BT15-013");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("redSeaAnimal").instanceId,
        s.inst("blackBird").instanceId,
        s.inst("redNonMatch").instanceId,
      ]),
    );
  });

  it("gains memory once only for opposing security removed during its owner's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT15-013"] }] },
    });
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.state.memory).toBe(0);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.state.memory).toBe(1);

    s.state.turnSeat = 1;
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.state.memory).toBe(1);
  });
});
