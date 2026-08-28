import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-044.js";

describe("BT13-044 BanchoLeomon", () => {
  it("uses the top security card for the DP reduction and reacts to security removal", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [expect.objectContaining({ keyword: "Blocker" })],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ModifyDP",
          amount: -6000,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "trash",
            target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
          },
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["hand"],
              payCost: false,
              target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Yellow"] }, count: 1 },
            },
          ],
        },
      ],
    });
  });

  it("trashes the top security card and reduces one opposing Digimon by 6000", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-044", as: "bancho" }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT13-111", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("bancho"));
    await settle(() => s.perm("target").currentDP === 7000);
    expect(s.perm("target").currentDP).toBe(7000);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
  });

  it("exposes Blocker and its evolution security payment may play one yellow Tamer for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-044", as: "bancho" }],
          security: ["BT1-001"],
          hand: [{ card: "BT13-098", as: "richard" }],
        },
        1: { battleArea: [{ card: "BT13-111", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("bancho"), "Blocker")).toBe(true);
    const before = s.state.memory;
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("bancho"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT13-098"));
    expect(s.state.memory).toBe(before);
  });

  it("ignores opponent security removal and plays only one Tamer across two own removals", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-044", as: "bancho" }],
          security: ["BT1-001", "BT1-002"],
          hand: ["BT13-098", "BT13-095"],
        },
        1: { security: ["BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.trashFromSecurity(1, 1);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    await advance(s.engine).verb.trashFromSecurity(0, 1);
    await advance(s.engine).verb.trashFromSecurity(0, 1);
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId !== "BT13-044")).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("does not play a non-yellow Tamer and cannot debuff without security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-044", as: "bancho" }], hand: ["BT13-097"] },
        1: { battleArea: [{ card: "BT13-111", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const baseDP = s.perm("target").currentDP;
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("bancho"));
    expect(s.perm("target").currentDP).toBe(baseDP);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("may decline the evolution security payment without trashing or reducing DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-044", as: "bancho" }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT13-111", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const baseDP = s.perm("target").currentDP;
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("bancho"));
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("target").currentDP).toBe(baseDP);
  });

  it("digivolves from a yellow level 5 for exactly 3 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-041", as: "base" }], hand: [{ card: "BT13-044", as: "bancho" }] },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("bancho").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-044");
    expect(s.state.memory).toBe(1);
  });
});
