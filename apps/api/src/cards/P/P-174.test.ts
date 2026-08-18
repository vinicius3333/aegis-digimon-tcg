import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("P-174 Boltmon", () => {
  it("reduces its play cost by 4 only with face-up Nightmare Soldiers in security", async () => {
    const reduced = setupEngine({
      0: {
        hand: [{ card: "P-174", as: "boltmon" }],
        security: [{ card: "EX8-071", as: "nightmareSoldiers", faceUp: true }],
      },
    });
    reduced.state.memory = 11;
    await reduced.ready();

    expect(reduced.engine.applyIntent(0, {
      type: "playCard",
      instanceId: reduced.inst("boltmon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => reduced.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "P-174"));

    expect(reduced.state.memory).toBe(4);
    assertNoLoudGap(reduced);

    const faceDown = setupEngine({
      0: {
        hand: [{ card: "P-174", as: "boltmon" }],
        security: [{ card: "EX8-071", faceUp: false }],
      },
    });
    faceDown.state.memory = 11;
    await faceDown.ready();

    expect(faceDown.engine.applyIntent(0, {
      type: "playCard",
      instanceId: faceDown.inst("boltmon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => faceDown.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "P-174"));

    expect(faceDown.state.memory).toBe(0);
    assertNoLoudGap(faceDown);
  });

  it("does not reduce its cost for a different face-up security card", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "P-174", as: "boltmon" }],
        security: [{ card: "BT1-009", faceUp: true }],
      },
    });
    s.state.memory = 11;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("boltmon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "P-174"));

    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("has Blocker and de-digivolves before deleting the resulting level 4 Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-174", as: "boltmon" }] },
        1: {
          battleArea: [
            { card: "BT1-020", as: "stackedTarget", under: [{ card: "BT1-014", as: "level4" }] },
            { card: "BT1-020", as: "level5" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const stackedTargetId = s.perm("stackedTarget").permanentId;
    const level5Id = s.perm("level5").permanentId;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("boltmon"), "Blocker")).toBe(true);
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("boltmon"));
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === stackedTargetId));

    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === level5Id)).toBe(true);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["BT1-020", "BT1-014"]));
    assertNoLoudGap(s);
  });

  it("runs the same de-digivolve-then-delete sequence on deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-174", as: "boltmon" }] },
        1: { battleArea: [{ card: "BT1-020", as: "target", under: ["BT1-014"] }] },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").permanentId;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("boltmon").permanentId]);
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === targetId));

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("P-174");
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["BT1-020", "BT1-014"]));
    assertNoLoudGap(s);
  });
});
