import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-031 Starmons", () => {
  it("has Xros Heart Decoy and the free level-2 Xros Heart evolution route", async () => {
    expect(digivolutionRequirementsFor("BT19-031")).toContainEqual({
      level: 2,
      traits: ["Xros Heart"],
      cost: 0,
      isAlternate: true,
    });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT19-031", as: "stars" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("stars"), "Decoy")).toBe(true);
  });

  it("Decoy deletes Starmons to preserve another Xros Heart from an opponent effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-031", as: "decoy" },
            { card: "BT19-031", as: "protected" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const driver = advance(s.engine);
    driver.verb.enterEffectResolution(1, ["Digimon"]);
    await driver.verb.deletePermanent([s.perm("protected").permanentId], "byEffect");
    driver.verb.leaveEffectResolution();
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-031"]);
    expect(s.state.players[0]!.battleArea[0]!.permanentId).toBe(s.perm("protected").permanentId);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-031"]);
  });

  it("On Deletion plays ShootingStarmon from under a Tamer and places both named trash sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-031", as: "stars" },
            { card: "BT19-083", as: "tamer", under: ["BT19-035"] },
          ],
          trash: ["BT10-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("stars").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-035"));
    const shooting = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT19-035")!;
    expect(shooting.stack.map((card) => card.cardId)).toEqual(["BT10-003", "BT19-031"]);
    expect(s.perm("tamer").stack).toHaveLength(0);
  });

  it("places whichever one of Starmons or Pickmons is available (Q3088)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-031", as: "stars" },
            { card: "BT19-083", as: "tamer", under: ["BT19-035"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("stars").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-035"));
    const shooting = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT19-035")!;
    expect(shooting.stack.map((card) => card.cardId)).toEqual(["BT19-031"]);
  });

  it("places the trash sources under the ShootingStarmon played by this effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-031", as: "stars" },
            { card: "BT19-083", as: "tamer", under: ["BT19-035"] },
            { card: "BT19-035", as: "existing" },
          ],
          trash: ["BT10-003", "BT19-031"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("stars").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "BT19-035").length === 2);
    const played = s.state.players[0]!.battleArea.find(
      (p) => p.topCard?.cardId === "BT19-035" && p.permanentId !== s.perm("existing").permanentId,
    )!;
    expect(played.stack.map((card) => card.cardId)).toEqual(["BT10-003", "BT19-031"]);
    expect(s.perm("existing").stack).toHaveLength(0);
  });

  it("inherited When Attacking reduces one opponent by 2000 only for an Xros Heart host and once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-033", as: "host", under: ["BT19-031"] }] },
        1: {
          battleArea: [
            { card: "BT19-020", as: "first" },
            { card: "BT19-021", as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("first").currentDP).toBe(3000);
    expect(s.perm("second").currentDP).toBe(5000);
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("first").currentDP).toBe(3000);

    const nonmatching = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-015", as: "host", under: ["BT19-031"] }] },
        1: { battleArea: [{ card: "BT19-020", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(nonmatching.engine).fireForPermanent(EffectTiming.OnUseAttack, nonmatching.perm("host"));
    expect(nonmatching.perm("target").currentDP).toBe(5000);
  });

  it("naturally triggers inherited When Attacking through a public attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-033", as: "host", under: ["BT19-031"] }] },
        1: { security: ["BT1-001"], battleArea: [{ card: "BT19-020", as: "target", dp: 5000 }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);
    expect(s.perm("target").currentDP).toBe(3000);
  });
});
