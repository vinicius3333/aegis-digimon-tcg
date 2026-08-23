import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_072 } from "./BT24-072.js";
import "../index.js";

describe("BT24-072 SkullGreymon", () => {
  it("requires the hand-trash cost before granting both keywords", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = BT24_072.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Blocker" },
        cost: { kind: "trash", target: { filter: { zone: "hand" } } },
        optional: true,
        abortOnDecline: true,
      });
      expect(actions[1]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Retaliation" },
        target: { sameTarget: true },
      });
    }
  });

  it("public play pays 7, trashes the cost, and grants both keywords", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-072", as: "skullgreymon" },
            { card: "BT1-001", as: "cost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skullgreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("skullgreymon"), "Retaliation"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("skullgreymon"), "Blocker")).toBe(true);
  });

  it.each([
    ["normal purple level-4 requirement", "BT24-070"],
    ["alternate Demon requirement without matching color", "BT1-069"],
  ])("uses the %s for cost 3", async (_label, baseCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: baseCard, as: "base" }],
          hand: [
            { card: "BT24-072", as: "skullgreymon" },
            { card: "BT1-001", as: "cost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("skullgreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Retaliation"));

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("skullgreymon").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
  });

  it("pays the hand-trash cost to grant Blocker and Retaliation to the same eligible Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-072", as: "skullgreymon" }],
          hand: [{ card: "BT1-001", as: "cost" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("skullgreymon"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("skullgreymon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("skullgreymon"), "Retaliation")).toBe(true);
  });

  it("grants neither keyword when the hand-trash cost cannot be paid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-072", as: "skullgreymon" },
            { card: "BT1-069", as: "eligible" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("skullgreymon"));

    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Retaliation")).toBe(false);
  });

  it("public deletion plays a level 4 Demon from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-072", as: "skullgreymon" }],
          trash: [{ card: "BT1-069", as: "demon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("skullgreymon").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("demon").instanceId),
    );
  });

  it.each([
    ["exact Titamon name", "BT1-080"],
    ["Titan trait", "BT24-013"],
  ])("inherited effect grants Security Attack +1 for the %s alternative", async (_label, topCard) => {
    const s = setupEngine({ 0: { battleArea: [{ card: topCard, as: "host", under: ["BT24-072"] }] } });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });
});
