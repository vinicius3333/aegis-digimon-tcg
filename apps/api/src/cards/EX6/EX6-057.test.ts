import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-057.js";

describe("EX6-057 Lilithmon", () => {
  it("contains the granted end-of-turn deletion and once-per-turn protection IR", () => {
    const text = JSON.stringify(compiled);
    expect(compiled.coverage).toBe("full");
    expect(text).toContain("GainTriggeredEffect");
    expect(text).toContain("wouldLeavePlay");
    expect(text).toContain("OncePerTurn");
  });
  it("trashes opponent security only when an opposing Digimon is deleted", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
      sourceFilter: { controller: "any", kind: ["Digimon"], excludeSelf: true },
      actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent" }],
    }));
  it("publicly trashes the opponent's top security when their Digimon is deleted on their turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-057", as: "lilith" }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("publicly deletes the granted target at the end of the controller's turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-057", as: "lilith" }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("lilith"));
    const victimId = s.perm("victim").permanentId;
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === victimId)).toBe(false);
  });

  it("prevents one non-battle leave per turn by deleting a level-5-or-lower Digimon, then refuses a second leave", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-057", as: "lilith" },
            { card: "BT10-079", as: "costOne" },
            { card: "BT10-079", as: "costTwo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const lilithId = s.perm("lilith").permanentId;
    await advance(s.engine).verb.deletePermanent([lilithId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.permanentId === lilithId));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === lilithId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT10-079")).toBe(true);

    await advance(s.engine).verb.deletePermanent([lilithId], "byEffect");
    await settle(() => !s.state.players[0]!.battleArea.some((perm) => perm.permanentId === lilithId));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === lilithId)).toBe(false);
  });

  it("digivolves from a Purple Lv.5 for three memory and rejects an off-color source", async () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT10-079", as: "purpleBase" }], hand: [{ card: "EX6-057", as: "lilith" }] },
    });
    legal.state.memory = 3;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("purpleBase").permanentId,
        instanceId: legal.inst("lilith").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("purpleBase").topCard?.cardId === "EX6-057");
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("purpleBase").stack.map((card) => card.cardId)).toEqual(["BT10-079"]);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-020", as: "redBase" }], hand: [{ card: "EX6-057", as: "lilith" }] },
    });
    illegal.state.memory = 3;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("redBase").permanentId,
        instanceId: illegal.inst("lilith").instanceId,
      }).ok,
    ).toBe(false);
    expect(illegal.perm("redBase").topCard?.cardId).toBe("BT1-020");
  });
});
