import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-067.js";

describe("EX6-067 Final Excalibur", () => {
  it("unsuspends one Angel-family Digimon without Dominimon, or all with Dominimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([
      { kind: "Unsuspend", target: { count: 1 }, condition: { kind: "youHaveNone" } },
      { kind: "Unsuspend", target: { count: "all" }, condition: { kind: "youHave" } },
    ]));
  it("recovers one and adds itself to hand from security", () =>
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions).toMatchObject([
      { kind: "GainKeyword", keyword: { keyword: "Recovery", amount: 1 } },
      { kind: "AddToHandSelf" },
    ]));
  it("publicly unsuspends one Angel without Dominimon and all Angels with Dominimon", async () => {
    const single = setupEngine(
      {
        0: {
          hand: [{ card: "EX6-067", as: "option" }],
          battleArea: [
            { card: "BT1-053", as: "angelOne", suspended: true },
            { card: "BT1-055", as: "angelTwo", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    single.state.memory = 10;
    await single.ready();
    expect(single.engine.applyIntent(0, { type: "playCard", instanceId: single.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => single.state.players[0]!.battleArea.some((perm) => !perm.isSuspended));
    expect(single.state.players[0]!.battleArea.filter((perm) => !perm.isSuspended)).toHaveLength(1);

    const all = setupEngine(
      {
        0: {
          hand: [{ card: "EX6-067", as: "option" }],
          battleArea: [
            { card: "BT1-053", as: "angelOne", suspended: true },
            { card: "EX6-030", as: "dominimon" },
            { card: "BT1-055", as: "angelTwo", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    all.state.memory = 10;
    await all.ready();
    expect(all.engine.applyIntent(0, { type: "playCard", instanceId: all.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => all.state.players[0]!.battleArea.filter((perm) => !perm.isSuspended).length === 3);
    expect(all.state.players[0]!.battleArea.filter((perm) => !perm.isSuspended)).toHaveLength(3);
  });

  it("matches Angel, Archangel, and Three Great Angels top cards while ignoring a non-matching stack", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX6-067", as: "option" }],
          battleArea: [
            { card: "EX6-030", as: "dominimon", under: ["BT1-060"] },
            { card: "BT1-053", as: "angel", suspended: true },
            { card: "BT1-060", as: "archangel", suspended: true },
            { card: "BT1-063", as: "threeGreatAngels", suspended: true },
            // Petermon is not an Angel-family card; its Kudamon source must not make it match.
            { card: "BT1-056", as: "nearMatch", suspended: true, under: ["BT1-046"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.filter((perm) => !perm.isSuspended).length === 4);

    expect(s.perm("dominimon").stack.map((card) => card.cardId)).toContain("BT1-060");
    expect(s.perm("angel").isSuspended).toBe(false);
    expect(s.perm("archangel").isSuspended).toBe(false);
    expect(s.perm("threeGreatAngels").isSuspended).toBe(false);
    expect(s.perm("nearMatch").isSuspended).toBe(true);
  });

  it("publicly recovers one card from the deck and adds itself to hand from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "EX6-067", as: "option", faceUp: true }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT1-009")).toBe(true);
  });
});
