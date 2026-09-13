import { describe, expect, it } from "vitest";
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

    expect(
      reduced.engine.applyIntent(0, {
        type: "playCard",
        instanceId: reduced.inst("pukumon").instanceId,
      }),
    ).toEqual({ ok: true });
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

    expect(
      faceDown.engine.applyIntent(0, {
        type: "playCard",
        instanceId: faceDown.inst("pukumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => faceDown.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "P-171"));

    expect(faceDown.state.memory).toBe(0);
    assertNoLoudGap(faceDown);
  });

  it("has Blocker, trashes the top 2 sources from every opposing Digimon, then deletes an empty one", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-171", as: "pukumon" }],
        },
        1: {
          battleArea: [
            {
              card: "BT1-020",
              as: "threeSources",
              under: [
                { card: "BT1-001", as: "bottomKept" },
                { card: "BT1-009", as: "middleTrashed" },
                { card: "BT1-014", as: "topTrashed" },
              ],
            },
            { card: "BT1-020", as: "twoSources", under: ["BT1-009", "BT1-014"] },
            { card: "BT1-020", as: "alreadyEmpty" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    const twoSourcesId = s.perm("twoSources").permanentId;
    const alreadyEmptyId = s.perm("alreadyEmpty").permanentId;
    const middleTrashedId = s.inst("middleTrashed").instanceId;
    const bottomKeptId = s.inst("bottomKept").instanceId;
    const pukumonId = s.inst("pukumon").instanceId;
    preferred.push(twoSourcesId);
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: pukumonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === pukumonId));
    expect(observe(s.engine).hasKeyword(s.perm("pukumon"), "Blocker")).toBe(true);
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === twoSourcesId));

    expect(s.perm("threeSources").stack.map(({ instanceId }) => instanceId)).toEqual([bottomKeptId]);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === alreadyEmptyId)).toBe(true);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(middleTrashedId);
    assertNoLoudGap(s);
  });

  it("performs the same all-stacks source trash and empty-stack deletion when digivolving", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-038", as: "base" }], hand: [{ card: "P-171", as: "pukumon" }] },
        1: {
          battleArea: [
            { card: "BT1-020", as: "oneSource", under: [{ card: "BT1-014", as: "source" }] },
            { card: "BT1-020", as: "empty" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    const oneSourceId = s.perm("oneSource").permanentId;
    const baseSourceId = s.perm("base").topCard.instanceId;
    preferred.push(oneSourceId);
    s.state.memory = 10;
    const pukumonId = s.inst("pukumon").instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: pukumonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === pukumonId && s.state.pendingDecision === undefined);
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === oneSourceId));

    expect(s.state.memory).toBe(7);
    expect(s.perm("base").stack.some((card) => card.instanceId === baseSourceId)).toBe(true);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("source").instanceId);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-020"]);
    assertNoLoudGap(s);
  });
});
