import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("P-171 Pukumon", () => {
  it("reduces its play cost by 4 only with face-up Deep Savers in security", async () => {
    const reduced = setupEngine({
      0: {
        hand: [{ card: "P-171", as: "pukumon" }],
        security: [{ card: "EX8-068", faceUp: true }],
      },
    });
    reduced.state.memory = 11;
    await reduced.ready();

    expect(reduced.engine.applyIntent(0, {
      type: "playCard",
      instanceId: reduced.inst("pukumon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => reduced.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "P-171"));

    expect(reduced.state.memory).toBe(4);
    assertNoLoudGap(reduced);

    const faceDown = setupEngine({
      0: {
        hand: [{ card: "P-171", as: "pukumon" }],
        security: [{ card: "EX8-068", faceUp: false }],
      },
    });
    faceDown.state.memory = 11;
    await faceDown.ready();

    expect(faceDown.engine.applyIntent(0, {
      type: "playCard",
      instanceId: faceDown.inst("pukumon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => faceDown.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "P-171"));

    expect(faceDown.state.memory).toBe(0);
    assertNoLoudGap(faceDown);
  });

  it("has Blocker, trashes the top 2 sources from every opposing Digimon, then deletes an empty one", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-171", as: "pukumon" }] },
        1: {
          battleArea: [
            {
              card: "BT1-020",
              as: "threeSources",
              under: [
                { card: "BT1-009", as: "bottomKept" },
                { card: "BT1-010", as: "middleTrashed" },
                { card: "BT1-011", as: "topTrashed" },
              ],
            },
            { card: "BT1-020", as: "twoSources", under: ["BT1-009", "BT1-010"] },
            { card: "BT1-020", as: "alreadyEmpty" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    const twoSourcesId = s.perm("twoSources").permanentId;
    const alreadyEmptyId = s.perm("alreadyEmpty").permanentId;
    preferred.push(twoSourcesId);
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("pukumon"), "Blocker")).toBe(true);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("pukumon"));
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === twoSourcesId));

    expect(s.perm("threeSources").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("bottomKept").instanceId]);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === alreadyEmptyId)).toBe(true);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("middleTrashed").instanceId, s.inst("topTrashed").instanceId]),
    );
    assertNoLoudGap(s);
  });

  it("performs the same all-stacks source trash and empty-stack deletion when digivolving", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-171", as: "pukumon" }] },
        1: {
          battleArea: [
            { card: "BT1-020", as: "oneSource", under: [{ card: "BT1-009", as: "source" }] },
            { card: "BT1-020", as: "empty" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    const oneSourceId = s.perm("oneSource").permanentId;
    preferred.push(oneSourceId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("pukumon"));
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === oneSourceId));

    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("source").instanceId);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-020"]);
    assertNoLoudGap(s);
  });
});
