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

  it("pays the hand-trash cost to grant Blocker and Retaliation to the same eligible Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-072", as: "skullgreymon" },
            { card: "BT24-013", as: "eligible" },
          ],
          hand: [{ card: "BT1-001", as: "cost" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("skullgreymon"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Retaliation")).toBe(true);
  });

  it("grants neither keyword when the hand-trash cost cannot be paid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-072", as: "skullgreymon" },
            { card: "BT24-013", as: "eligible" },
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

  it("plays a level 4 Demon from trash on deletion", async () => {
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

    await advance(s.engine).fire(EffectTiming.OnDeletion, s.perm("skullgreymon"));
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
