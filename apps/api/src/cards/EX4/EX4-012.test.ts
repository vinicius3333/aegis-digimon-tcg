import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-012.js";
import "../index.js";

describe("EX4-012 VictoryGreymon", () => {
  it("has the official identity and raises the DP ceiling per opposing Digimon", () => {
    expect(getCardDefinition("EX4-012")).toMatchObject({
      cardId: "EX4-012",
      nameEn: "VictoryGreymon",
      colors: ["Red"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Red", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Dragonkin"],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Delete",
      dpCeiling: 6000,
      dpCeilingScaling: {
        per: 1,
        amount: 2000,
        unit: "cards",
        filter: { zone: "battleArea", controller: "opponent", kind: ["Digimon"] },
      },
    });
  });

  it("digivolves from a red level-5 Digimon and preserves its source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX4-009", as: "base" }],
        hand: [{ card: "EX4-012", as: "victory" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("victory").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX4-012");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX4-009"]);
  });
  it("deletes the highest-DP opposing Digimon after another deletion if a Tamer is in play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
      condition: { kind: "youHave", filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"] } },
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestDP" }, count: 1 },
        },
      ],
    });
  });

  it("scales the digivolution deletion ceiling by opposing Digimon in play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-012", as: "victory" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target", dp: 10000 },
            { card: "BT1-009", as: "other", dp: 1000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("victory"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not delete above the exact scaled DP ceiling", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-012", as: "victory" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target", dp: 10001 },
            { card: "BT1-009", as: "other", dp: 1000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("victory"));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("target").currentDP).toBe(10001);
  });

  it("deletes the opposing highest-DP Digimon after an opponent deletion when a Tamer is present", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX4-012", as: "victory" },
          { card: "BT1-085", as: "tamer" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first", dp: 3000 },
          { card: "BT1-009", as: "highest", dp: 7000 },
          { card: "BT1-009", as: "second", dp: 2000 },
          { card: "BT1-009", as: "survivor", dp: 5000 },
        ],
      },
    });
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.None, s.perm("victory"));

    await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(true);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("survivor").permanentId),
    ).toBe(true);

    await advance(s.engine).verb.deletePermanent([s.perm("second").permanentId], "byEffect");

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("survivor").currentDP).toBe(5000);
  });

  it("does not trigger the follow-up deletion without one of your Tamers in play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX4-012", as: "victory" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first", dp: 3000 },
          { card: "BT1-009", as: "highest", dp: 7000 },
        ],
      },
    });
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.None, s.perm("victory"));

    await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId], "byEffect");

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("highest").currentDP).toBe(7000);
  });
});
