import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-049.js";
import "../index.js";
describe("EX7-049 Bryweludramon", () => {
  it("De-Digivolves four on play and attack, stopping at level 3", () => {
    for (const trigger of ["OnPlay", "WhenAttacking"])
      expect(compiled.effects?.find((e) => e.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "DeDigivolve",
        amount: 4,
        stopAtLevel: 3,
      });
  });
  it("restricts evolution and replaces other departures", () => {
    expect(compiled.effects?.find((e) => e.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "Restrict",
      restriction: "digivolve",
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects?.find((e) => e.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanYourEffect",
    });
  });

  it("publicly de-digivolves four cards and restricts only opposing battle-area evolution", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX7-049", as: "bry" }] },
      1: {
        battleArea: [{ card: "EX7-014", as: "battle", under: ["EX7-038", "EX7-041", "EX7-045", "EX7-046"] }],
        breeding: { card: "EX7-014", as: "breeding", under: ["EX7-038"] },
      },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("bry"));
    expect(s.perm("battle").stack).toHaveLength(0);

    const restricted = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-045", as: "base" }], hand: [{ card: "EX7-049", as: "bry" }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent" }],
          breeding: { card: "BT1-009", as: "egg" },
        },
      },
      { autoSelectCards: true },
    );
    restricted.state.memory = 10;
    await restricted.ready();
    expect(
      restricted.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: restricted.perm("base").permanentId,
        instanceId: restricted.inst("bry").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(restricted.engine).isRestricted(restricted.perm("opponent"), "digivolve"));
    expect(observe(restricted.engine).isRestricted(restricted.perm("opponent"), "digivolve")).toBe(true);
    expect(observe(restricted.engine).isRestricted(restricted.perm("egg"), "digivolve")).toBe(false);
  });

  it("publicly replaces an opposing-effect deletion by playing a Rock Dragon from trash", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-049", as: "bry" }], trash: [{ card: "BT2-011", as: "rock" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("bry").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT2-011")).toBe(true);
  });

  it("lets an immune level-4 Digimon digivolve despite the restriction", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-049", as: "bry" }] },
        1: {
          battleArea: [{ card: "BT15-047", as: "immune", suspended: true }],
          hand: [{ card: "BT15-049", as: "evolution" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).isRestrictedByEffect(s.perm("immune"), "beAffected", "Digimon")).toBe(true);
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("bry"));

    s.state.turnSeat = 1;
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("immune").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("immune").topCard?.cardId === "BT15-049");
    expect(s.perm("immune").topCard?.cardId).toBe("BT15-049");
  });
});
