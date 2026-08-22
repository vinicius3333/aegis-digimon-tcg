import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_057 } from "./BT24-057.js";
import "../index.js";

describe("BT24-057 Docmon", () => {
  it("plays from security at battle end and restricts one opposing Digimon", () => {
    const security = BT24_057.effects?.find((entry) => entry.trigger === "Security");
    expect(security?.actions?.[0]).toMatchObject({ kind: "PlayWithoutCost", payCost: false });
    for (const trigger of ["OnPlay", "OnDeletion"]) {
      const effect = BT24_057.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "Restrict",
        restriction: "attackPlayers",
        duration: "untilOpponentTurnEnd",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
    }
  });

  it("models its cost-2 Appmon link and linked De-Digivolve 1", () => {
    expect(BT24_057.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 2 }]);
    expect(BT24_057.effects.find((effect) => effect.isLinked)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "DeDigivolve", amount: 1 }],
    });
  });

  it("plays itself from security without paying", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT24-057", as: "docmon" }] },
    });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("docmon"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("docmon").instanceId),
    );

    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("On Play prevents an opposing Digimon from attacking players", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-057", as: "docmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("docmon"));

    expect(observe(s.engine).isRestricted(s.perm("target"), "attackPlayers")).toBe(true);
  });

  it("links for cost 2, adds 3000 DP, and De-Digivolves after the host is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [{ card: "BT24-057", as: "docmon" }],
        },
        1: { battleArea: [{ card: "BT24-051", as: "target", under: ["BT24-050"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const hostDp = s.perm("host").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("docmon").instanceId,
        targetPermanentId: hostId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("docmon").instanceId));
    expect(s.state.memory).toBe(3);
    expect(s.perm("host").currentDP).toBe(hostDp + 3000);

    await advance(s.engine).verb.deletePermanent([hostId], "effect");
    await settle(() => s.perm("target").topCard.cardId === "BT24-050");

    expect(s.perm("target").stack).toHaveLength(1);
  });
});
