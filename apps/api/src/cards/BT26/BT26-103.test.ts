import { describe, expect, it } from "vitest";
import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT26-103 Jupitermon: Wrath Mode", () => {
  it("can digivolve from a level 6 Olympos XII Digimon for 5", () => {
    expect(digivolutionRequirementsFor("BT26-103")).toContainEqual({
      level: 6,
      traits: ["Olympos XII"],
      cost: 5,
      isAlternate: true,
    });
  });

  it("trashes the top security card and recovers 2 when digivolving", async () => {
    const s = setupEngine({
      0: {
        deck: ["AD1-001", "AD1-002"],
        security: [{ card: "AD1-003", as: "topSecurity" }, "AD1-004"],
        battleArea: [{ card: "BT26-103", as: "wrath" }],
      },
    });

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("wrath"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("topSecurity").instanceId);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("still recovers 2 with no security card to trash, as confirmed by Q7188", async () => {
    const s = setupEngine({
      0: {
        deck: ["AD1-001", "AD1-002"],
        security: [],
        battleArea: [{ card: "BT26-103", as: "wrath" }],
      },
    });

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("wrath"));

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("offers the same trash-and-recover effect in the defending Counter window", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", dp: 3000, as: "attacker" }] },
      1: {
        deck: ["AD1-001", "AD1-002"],
        security: ["AD1-003", "AD1-004"],
        battleArea: [
          { card: "BT26-103", as: "wrath" },
          { card: "AD1-004", dp: 5000, suspended: true, as: "attackTarget" },
        ],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("attackTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));

    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counterWindowOpened not found");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.perm("wrath").topCard!.instanceId);
    expect(eligible).toBeDefined();

    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 3);

    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("Succession gains the effects of its topmost Jupitermon digivolution card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-103", under: ["BT26-033"], as: "wrath" }],
      },
    });

    await s.ready();

    // BT26-033 has a printed ＜Raid＞ static effect. BT26-103 doesn't, so this grant can
    // only come from the Jupitermon card selected by ＜Succession ([Jupitermon])＞.
    expect(observe(s.engine).hasKeyword(s.perm("wrath"), "Raid")).toBe(true);
  });

  it("applies the security-removal penalty only once per turn across both event routes", async () => {
    const s = setupEngine(
      {
        0: {
          security: ["AD1-001", "AD1-002"],
          battleArea: [{ card: "BT26-103", as: "wrath" }],
        },
        1: {
          battleArea: [
            { card: "AD1-003", dp: 20000, as: "first" },
            { card: "AD1-004", dp: 20000, as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    const afterFirst = [s.perm("first").currentDP, s.perm("second").currentDP];
    expect(afterFirst.sort((a, b) => a - b)).toEqual([5000, 20000]);

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    expect([s.perm("first").currentDP, s.perm("second").currentDP].sort((a, b) => a - b)).toEqual([5000, 20000]);
  });

  it("triggers when the opponent's security stack is removed from", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-103", as: "wrath" }],
        },
        1: {
          security: ["AD1-001"],
          battleArea: [{ card: "AD1-003", dp: 20000, as: "target" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(1, 1, { fromTop: true });

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.perm("target").currentDP).toBe(5000);
  });
});
