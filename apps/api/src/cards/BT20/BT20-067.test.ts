import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-067.js";
import "./index.js";

describe("BT20-067 Soulmon", () => {
  it("grants one own Digimon Retaliation on play and digivolving through the opponent's turn", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "GainKeyword",
            keyword: { keyword: "Retaliation" },
            duration: "untilOpponentTurnEnd",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          },
        ],
      });
    }
  });

  it("inherits the costed hand-trash deletion effect", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Delete",
          optional: true,
          abortOnDecline: true,
          cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
            count: 1,
          },
        },
      ],
    });
  });

  it("publishes the printed stats and purple evolution route", () => {
    expect(getCardDefinition("BT20-067")).toMatchObject({
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }],
    });
  });

  it("on play and evolution grants one chosen ally live Retaliation", async () => {
    for (const mode of ["play", "digivolve"] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT20-061", as: "ally" },
              ...(mode === "digivolve" ? [{ card: "BT20-063", as: "base" }] : []),
            ],
            hand: [{ card: "BT20-067", as: "soulmon" }],
            deck: ["BT20-047"],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 4;
      const result =
        mode === "play"
          ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("soulmon").instanceId })
          : s.engine.applyIntent(0, {
              type: "digivolve",
              permanentId: s.perm("base").permanentId,
              instanceId: s.inst("soulmon").instanceId,
            });
      expect(result).toEqual({ ok: true });
      await settle(() => observe(s.engine).hasKeyword(s.perm("ally"), "Retaliation"));
      expect(observe(s.engine).hasKeyword(s.perm("ally"), "Retaliation")).toBe(true);
    }
  });

  it("when inherited, pays one hand card to delete level 4 while preserving level 5", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-072", under: ["BT20-067"], suspended: true, as: "host" }],
          hand: [{ card: "BT20-047", as: "cost" }],
        },
        1: {
          battleArea: [
            { card: "BT20-066", as: "level4" },
            { card: "BT20-071", as: "level5" },
            { card: "BT20-076", as: "attacker" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const hostId = s.perm("host").permanentId;
    preferred.push(s.inst("cost").instanceId, s.perm("level4").permanentId, hostId);
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId) &&
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId) &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-066"),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(
      expect.arrayContaining(["BT20-071", "BT20-076"]),
    );
  });

  it("expires the gained Retaliation at the end of the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-061", as: "ally" }],
          hand: [{ card: "BT20-067", as: "soulmon" }],
          deck: ["BT1-001", "BT1-002"],
        },
        1: { deck: ["BT1-001", "BT1-002"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("soulmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("ally"), "Retaliation"));
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Retaliation")).toBe(true);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Retaliation")).toBe(false);
  });
});
