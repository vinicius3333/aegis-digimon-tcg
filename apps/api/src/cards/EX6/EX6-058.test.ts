import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-058.js";

describe("EX6-058 Creepymon", () => {
  it("has Blocker and deletes the opponent's lowest-DP Digimon, then trashes cards based on its level", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("Blocker");
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Delete", target: { filter: { superlative: "lowestDP" } } },
      { kind: "TrashTopDeck", controller: "mine", amount: 1, scaling: { per: 1, unit: "lastDeletedLevel" } },
    ]);
  });
  it("places a Seven Great Demon Lords card under a Gate of Deadly Sins when leaving play", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      leaveCause: "otherThanBattle",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "PlaceUnder",
          target: { filter: { zone: "trash" } },
          underFilter: { zone: "breeding", nameOrTrait: [{ match: "name", tokens: ["Gate of Deadly Sins"] }] },
          position: "bottom",
        },
      ],
    }));
  it("publicly deletes the opponent's lowest-DP Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-058", as: "creepy" }], deck: ["BT1-009"] },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 1000, as: "low" },
            { card: "BT1-010", dp: 2000, as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const lowId = s.perm("low").permanentId;
    const highId = s.perm("high").permanentId;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("creepy"));
    await settle(() => !s.state.players[1]!.battleArea.some((perm) => perm.permanentId === lowId));
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === lowId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === highId)).toBe(true);
  });

  it("trashes one deck card per deleted level, including the level-3 boundary", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-058", as: "creepy" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest", dp: 1000 },
            { card: "BT1-010", as: "higher", dp: 2000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("creepy"));
    await settle(() => s.state.players[0]!.deck.length === 1);

    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(3);
  });

  it("trashes no deck cards when the deleted lowest-DP Digimon has no level", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-058", as: "creepy" }], deck: ["BT1-009", "BT1-010"] },
        1: {
          battleArea: [
            { card: "BT19-077", as: "levelLess", dp: 1000 },
            { card: "BT1-009", as: "higher", dp: 2000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("creepy"));
    await settle(() => !s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT19-077"));

    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-009")).toBe(true);
  });

  it("digivolves from a Red Lv.5 for four memory and rejects an off-color source", async () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT1-020", as: "redBase" }], hand: [{ card: "EX6-058", as: "creepy" }] },
    });
    legal.state.memory = 4;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("redBase").permanentId,
        instanceId: legal.inst("creepy").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("redBase").topCard?.cardId === "EX6-058");
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("redBase").stack.map((card) => card.cardId)).toEqual(["BT1-020"]);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-038", as: "blueBase" }], hand: [{ card: "EX6-058", as: "creepy" }] },
    });
    illegal.state.memory = 4;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("blueBase").permanentId,
        instanceId: illegal.inst("creepy").instanceId,
      }).ok,
    ).toBe(false);
    expect(illegal.perm("blueBase").topCard?.cardId).toBe("BT1-038");
  });

  it("places a valid Seven Great Demon Lords card under a Gate when removed outside battle", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "EX6-006", as: "gate" },
        battleArea: [{ card: "EX6-058", as: "creepy" }],
        trash: [{ card: "EX6-056", as: "material" }],
      },
    });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("creepy").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.breeding?.stack.some((card) => card.instanceId === s.inst("material").instanceId),
    );

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.breeding?.stack.at(-1)?.instanceId).toBe(s.inst("material").instanceId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("material").instanceId)).toBe(false);
  });
});
