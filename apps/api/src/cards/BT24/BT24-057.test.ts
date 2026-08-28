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

  it("a real security check plays itself and applies On Play", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT24-057", as: "docmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("docmon").instanceId),
    );
    await settle(() => observe(s.engine).isRestricted(s.perm("attacker"), "attackPlayers"));

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("attacker"), "attackPlayers")).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("normal black level-3 evolution costs 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-036", as: "base" }],
        hand: [{ card: "BT24-057", as: "docmon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("docmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("docmon").instanceId);

    expect(s.state.memory).toBe(3);
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

  it("public play pays 4 and restricts one opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-057", as: "docmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("docmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "attackPlayers"));

    expect(s.state.memory).toBe(1);
  });

  it("On Deletion applies the same player-attack restriction", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-057", as: "docmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const docmonId = s.perm("docmon").permanentId;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([docmonId], "byEffect");
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "attackPlayers"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === docmonId)).toBe(false);
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

    await advance(s.engine).verb.deletePermanent([hostId], "byEffect");
    await settle(() => s.perm("target").topCard.cardId === "BT24-050");

    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT24-051")).toBe(true);
  });

  it("cancels the linked De-Digivolve when BT7-107 returns its deleted host first (Q5643)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-067", as: "host", linked: [{ card: "BT24-057", as: "docmon" }] }],
          hand: [{ card: "BT7-107", as: "calling" }],
        },
        1: { battleArea: [{ card: "BT24-051", as: "target", under: ["BT24-050"] }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("calling").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("host").instanceId));

    expect(s.perm("target").topCard.cardId).toBe("BT24-051");
    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("docmon").instanceId);
  });
});
