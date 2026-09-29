import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-090.js";

describe("BT15-090", () => {
  it("matches the catalog identity and keeps the direct module full and residual-free", () => {
    expect(getCardDefinition("BT15-090")).toMatchObject({
      nameEn: "Fox Fire",
      colors: ["Blue"],
      kinds: ["Option"],
      playCost: 4,
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("uses exactly one return branch, replacing the level gate with lowest level when qualified", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "ConditionalBranch",
      condition: { kind: "youHave" },
      ifTrue: [{ kind: "Return", target: { filter: { superlative: "lowestLevel" } } }],
      ifFalse: [{ kind: "Return", target: { filter: { levelComparison: { op: "lte", value: 4 } } } }],
    });
  });
  it("activates its main effect in security", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    }));

  it("naturally returns the lowest-level opposing Digimon when Gabumon is present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-029", as: "gabumon" }],
          hand: [{ card: "BT15-090", as: "fox" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowLevel", dp: 12000 },
            { card: "BT1-036", as: "highLevel", dp: 1000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const lowLevelId = s.perm("lowLevel").permanentId;
    const lowLevelInstanceId = s.inst("lowLevel").instanceId;
    const highLevelId = s.perm("highLevel").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("fox").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === lowLevelInstanceId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowLevelId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highLevelId)).toBe(true);
    expect(s.state.memory).toBe(6);
  });

  it("naturally limits the unqualified branch to level 4 or lower", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-086", as: "blueSource" }],
          hand: [{ card: "BT15-090", as: "fox" }],
        },
        1: {
          battleArea: [
            { card: "BT1-036", as: "level4", dp: 1000 },
            { card: "BT1-040", as: "level5", dp: 12000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("fox").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("level4").instanceId));

    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("level5").permanentId),
    ).toBe(true);
    expect(s.state.memory).toBe(6);
  });

  it("naturally activates the lowest-level branch from security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-029", as: "gabumon" }],
          security: [{ card: "BT15-090", as: "fox" }],
        },
        1: {
          battleArea: [
            { card: "BT15-053", as: "attacker" },
            { card: "BT1-009", as: "lowLevel", dp: 12000 },
            { card: "BT1-036", as: "highLevel", dp: 1000 },
          ],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const lowLevelInstanceId = s.inst("lowLevel").instanceId;
    const highLevelId = s.perm("highLevel").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === lowLevelInstanceId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highLevelId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});

describe("BT15-090 Fox Fire — KB Q&A rulings", () => {
  async function playFoxFirePreferringLevel4(ownDigimon: string) {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: ownDigimon, as: "ownDigimon" }],
          hand: [{ card: "BT15-090", as: "fox" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "level3", dp: 3000 },
            { card: "BT1-036", as: "level4", dp: 5000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("level4").permanentId, s.perm("level4").topCard.instanceId);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const level3InstanceId = s.inst("level3").instanceId;
    const level4InstanceId = s.inst("level4").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("fox").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.length === 1);

    const opponentHand = s.state.players[1]!.hand.map((card) => card.instanceId);
    return {
      level3Returned: opponentHand.includes(level3InstanceId),
      level4Returned: opponentHand.includes(level4InstanceId),
    };
  }

  it("must return the opponent's lowest-level Digimon, not a free choice among level 4 or lower, with Gabumon (Q2588)", async () => {
    await expect(playFoxFirePreferringLevel4("BT1-029")).resolves.toEqual({
      level3Returned: true,
      level4Returned: false,
    });
    await expect(playFoxFirePreferringLevel4("BT1-086")).resolves.toEqual({
      level3Returned: false,
      level4Returned: true,
    });
  });
});
