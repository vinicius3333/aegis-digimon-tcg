import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_040 } from "./BT24-040.js";
import "../index.js";

describe("BT24-040 Venusmon", () => {
  it("trashes one opponent stack and applies the two shared restrictions", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = BT24_040.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({
        kind: "TrashDigivolution",
        amount: 99,
        target: { filter: { controller: "opponent", digivolutionCards: "hasAny" } },
      });
      expect(actions[1]).toMatchObject({ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" });
      expect(actions[2]).toMatchObject({
        kind: "Restrict",
        restriction: "cannotActivateWhenDigivolving",
        duration: "untilOpponentTurnEnd",
        target: { sameTarget: true },
      });
    }
  });
  it("uses the other no-stack Digimon as a bottom-security replacement", () => {
    const inherited = BT24_040.effects?.find((entry) => entry.trigger === "AllTurns");
    expect(inherited).toMatchObject({ frequency: "OncePerTurn" });
    expect(inherited?.actions?.[0]).toMatchObject({
      mode: "prevent",
      leaveCause: "otherThanYourEffect",
      affectsAll: true,
      target: { count: 10000, upTo: true },
      cost: {
        kind: "place",
        targetIsPermanent: true,
        destination: "security",
        position: "bottom",
        target: { filter: { excludeLeavingSubject: true, digivolutionCards: "none" } },
      },
    });
  });

  it("reduces its actual play cost by 5 at 3 security but not at 4", async () => {
    const reduced = setupEngine({
      0: { hand: [{ card: "BT24-040", as: "venusmon" }], security: ["BT1-009", "BT1-010", "BT1-011"] },
    });
    reduced.state.memory = 12;
    await reduced.ready();
    expect(
      reduced.engine.applyIntent(0, {
        type: "playCard",
        instanceId: reduced.inst("venusmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      reduced.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-040"),
    );
    expect(reduced.state.memory).toBe(5);

    const full = setupEngine({
      0: {
        hand: [{ card: "BT24-040", as: "venusmon" }],
        security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
      },
    });
    full.state.memory = 12;
    await full.ready();
    expect(
      full.engine.applyIntent(0, {
        type: "playCard",
        instanceId: full.inst("venusmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => full.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-040"));
    expect(full.state.memory).toBe(0);
  });

  it("trashes one full stack and applies both restrictions to the same two permanents", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-040", as: "venusmon" }] },
        1: {
          battleArea: [
            { card: "BT24-030", as: "stacked", under: ["BT24-029", "BT24-027"] },
            { card: "BT24-083", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(
      s.perm("stacked").topCard.instanceId,
      s.perm("stacked").topCard.instanceId,
      s.perm("tamer").topCard.instanceId,
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("venusmon"));

    expect(s.perm("stacked").stack).toHaveLength(0);
    for (const permanent of [s.perm("stacked"), s.perm("tamer")]) {
      expect(observe(s.engine).isRestricted(permanent, "suspend")).toBe(true);
      expect(observe(s.engine).isRestricted(permanent, "cannotActivateWhenDigivolving")).toBe(true);
    }
  });

  it("does not suppress the restricted card's When Attacking timing (Q5622-Q5626)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-040", as: "venusmon" }],
        hand: [{ card: "BT1-009", as: "moved" }],
        security: [{ card: "BT1-010", as: "trashed" }],
      },
      1: { battleArea: [{ card: "BT24-016", as: "lamiamon" }] },
    });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("venusmon"));
    expect(observe(s.engine).isRestricted(s.perm("lamiamon"), "cannotActivateWhenDigivolving")).toBe(true);
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("lamiamon"));
    expect(s.state.players[0]!.hand).toHaveLength(1);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("lamiamon"));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("moved").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("trashed").instanceId);
  });

  it("pays once to protect all simultaneously leaving TS Digimon (Q5621)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-040", as: "venusmon" },
            { card: "BT24-034", as: "first" },
            { card: "BT24-035", as: "second" },
            { card: "BT1-009", as: "cost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("cost").permanentId);
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      await advance(s.engine).verb.deletePermanent(
        [s.perm("first").permanentId, s.perm("second").permanentId],
        "byEffect",
      ),
    ).toBe(0);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual(
      expect.arrayContaining([
        s.perm("venusmon").permanentId,
        s.perm("first").permanentId,
        s.perm("second").permanentId,
      ]),
    );
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("cost").instanceId);
  });

  it("may use Venusmon itself as the other no-source cost when another TS Digimon leaves (Q5781)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-040", as: "venusmon" },
            { card: "BT24-034", as: "leaving" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("venusmon").permanentId);
    s.state.turnSeat = 1;
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("leaving").permanentId], "byEffect")).toBe(0);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("leaving").permanentId,
    );
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("venusmon").instanceId);
  });

  it("allows a different simultaneously leaving Digimon to pay the cost (Q5781)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-040", as: "venusmon", under: ["BT24-033"] },
            { card: "BT24-034", as: "first" },
            { card: "BT24-035", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("second").permanentId);
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      await advance(s.engine).verb.deletePermanent(
        [s.perm("first").permanentId, s.perm("second").permanentId],
        "byEffect",
      ),
    ).toBe(0);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("first").permanentId,
    );
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("second").instanceId);
  });

  it.each([
    ["normal yellow requirement", false, 4],
    ["alternate TS requirement (Q5604)", true, 3],
  ])("may use the %s", async (_label, useAlternateCost, expectedCost) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-039", as: "base" }],
        hand: [{ card: "BT24-040", as: "venusmon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("venusmon").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("venusmon").instanceId);

    expect(s.state.memory).toBe(5 - expectedCost);
  });
});
