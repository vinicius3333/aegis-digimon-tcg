import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_039 } from "./BT24-039.js";
import "../index.js";

describe("BT24-039 Piximon", () => {
  it("plays from security without battle only against an opposing level 6+ Digimon", () => {
    const security = BT24_039.effects?.find((entry) => entry.trigger === "Security");
    expect(security?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["security"],
      payCost: false,
      withoutBattle: true,
      condition: { kind: "opponentHas", filter: { levelComparison: { op: "gte", value: 6 } } },
    });
  });
  it("has Blocker, Barrier, and inherited Recovery +1", () => {
    expect(
      BT24_039.effects
        ?.filter((entry) => entry.keywords?.length)
        .flatMap((entry) => entry.keywords?.map((keyword: any) => keyword.keyword)),
    ).toEqual(["Blocker", "Barrier", "Recovery"]);
  });

  it("plays from security without battle against an opposing level 6 Digimon", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT24-039", as: "piximon" }] },
      1: { battleArea: [{ card: "BT24-030", as: "level6" }] },
    });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("piximon"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-039"));

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea[0]!.topCard.instanceId).toBe(s.inst("piximon").instanceId);
  });

  it("does not play from security when the opponent has only level 5 Digimon", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT24-039", as: "piximon" }] },
      1: { battleArea: [{ card: "BT24-038", as: "level5" }] },
    });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("piximon"));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toContain(s.inst("piximon").instanceId);
  });

  it("exposes Blocker and Barrier", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT24-039", as: "piximon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("piximon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("piximon"), "Barrier")).toBe(true);
  });

  it("recovers the deck top when its inherited host is deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-040", as: "host", under: ["BT24-039"] }],
        deck: [{ card: "BT1-009", as: "recovered" }],
      },
    });
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("recovered").instanceId);
  });

  it("digivolves from a level-4 TS Digimon for cost 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-011", as: "base" }],
        hand: [{ card: "BT24-039", as: "piximon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("piximon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("piximon").instanceId);

    expect(s.state.memory).toBe(2);
  });
});
