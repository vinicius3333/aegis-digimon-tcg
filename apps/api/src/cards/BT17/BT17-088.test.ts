import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-088.js";
import "./index.js";

describe("BT17-088 Willis", () => {
  it("matches the immutable catalog identity and preserves full IR coverage", () => {
    expect(getCardDefinition("BT17-088")).toMatchObject({
      nameEn: "Willis",
      colors: ["Green"],
      kinds: ["Tamer"],
      playCost: 4,
      effectText: expect.stringContaining("Terriermon"),
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("boosts one green Digimon on play and at the start of the owner's main phase", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "ModifyDP",
          amount: 2000,
          duration: "untilOpponentTurnEnd",
          target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Green"] }, count: 1 },
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "untilOpponentTurnEnd" }],
    });
  });

  it("reacts to a played Terriermon or Lopmon by suspending this Tamer and reducing a free target's evolution cost", () => {
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Terriermon", "Lopmon"], match: "name" }],
      },
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          reduceCost: 2,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "suspend",
            target: {
              filter: {
                controller: "mine",
                kind: ["Tamer"],
                isSelfRef: true,
                nameOrTrait: [{ tokens: ["Willis"], match: "name" }],
              },
              count: 1,
              isSelf: true,
            },
          },
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Terriermon", "Lopmon"], match: "name" }],
            },
          },
        },
      ],
    });
  });

  it("allows the digivolve target to be any hand Digimon, not necessarily the played one", () => {
    expect((compiled.effects?.[2]?.actions?.[0] as any)?.actions?.[0]).toMatchObject({ into: { kind: ["Digimon"] } });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
  });

  it("boosts a green Digimon when Willis is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-043", as: "terriermon" }],
          hand: [{ card: "BT17-088", as: "willis" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("willis").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("terriermon").currentDP > 1000);

    expect(s.perm("terriermon").currentDP).toBe(3000);
  });

  it("boosts one green Digimon at the natural start of the owner's main phase", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-088", as: "willis" }, { card: "BT17-043", as: "terriermon" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );

    await s.ready();
    await advance(s.engine).runTurn(0);

    expect(s.perm("terriermon").currentDP).toBe(3000);
  });

  it("naturally suspends only Willis and digivolves a different Terriermon into a reduced-cost Gargomon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-088", as: "willis" },
            { card: "BT17-043", as: "targetTerriermon" },
          ],
          hand: [
            { card: "BT17-043", as: "playedTerriermon" },
            { card: "BT17-046", as: "gargomon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("targetTerriermon").permanentId, s.inst("gargomon").instanceId);
    s.state.memory = 3;

    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedTerriermon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("targetTerriermon").topCard?.cardId === "BT17-046");

    expect(s.perm("willis").isSuspended).toBe(true);
    expect(s.perm("targetTerriermon").topCard?.cardId).toBe("BT17-046");
    expect(s.perm("targetTerriermon").stack.some((card) => card.cardId === "BT17-043")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("playedTerriermon").instanceId)).toBe(true);
  });

  it("naturally plays itself from security without paying its cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-086", as: "attacker" }] },
        1: { security: [{ card: "BT17-088", as: "securityWillis" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const instanceId = s.inst("securityWillis").instanceId;

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
    expect(s.state.players[1]!.security.some((card) => card.instanceId === instanceId)).toBe(false);
  });
});
