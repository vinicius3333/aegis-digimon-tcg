import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("P-172 Magnadramon", () => {
  it("reduces its play cost by 4 only with face-up Nature Spirits in security", async () => {
    const reduced = setupEngine({
      0: {
        hand: [{ card: "P-172", as: "magnadramon" }],
        security: [{ card: "EX8-069", faceUp: true }],
      },
    });
    reduced.state.memory = 11;
    await reduced.ready();

    expect(
      reduced.engine.applyIntent(0, {
        type: "playCard",
        instanceId: reduced.inst("magnadramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => reduced.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "P-172"));

    expect(reduced.state.memory).toBe(4);
    assertNoLoudGap(reduced);

    const faceDown = setupEngine({
      0: {
        hand: [{ card: "P-172", as: "magnadramon" }],
        security: [{ card: "EX8-069", faceUp: false }],
      },
    });
    faceDown.state.memory = 11;
    await faceDown.ready();

    expect(
      faceDown.engine.applyIntent(0, {
        type: "playCard",
        instanceId: faceDown.inst("magnadramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => faceDown.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "P-172"));

    expect(faceDown.state.memory).toBe(0);
    assertNoLoudGap(faceDown);
  });

  it("has Blocker and can apply -5000 DP before deleting a now-eligible Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-172", as: "magnadramon" }] },
        1: { battleArea: [{ card: "BT1-020", as: "target", dp: 6000 }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    const targetId = s.perm("target").permanentId;
    preferred.push(targetId);
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("magnadramon"), "Blocker")).toBe(true);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("magnadramon"));
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === targetId));

    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-020");
    assertNoLoudGap(s);
  });

  it("keeps a 0-DP Digimon present until the explicit delete finishes resolving (Q4421)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-172", as: "magnadramon" }] },
        1: {
          battleArea: [
            { card: "BT1-034", as: "reducedAndDeleted", dp: 5000 },
            { card: "BT1-035", as: "mustRemain", dp: 5000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    const firstId = s.perm("reducedAndDeleted").permanentId;
    const secondId = s.perm("mustRemain").permanentId;
    preferred.push(firstId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("magnadramon"));
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === firstId));

    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === secondId)).toBe(true);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-034");
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).not.toContain("BT1-035");
    assertNoLoudGap(s);
  });

  it("runs the same DP reduction and deletion sequence on deletion", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-172", as: "magnadramon" }] },
        1: { battleArea: [{ card: "BT1-020", as: "target", dp: 6000 }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    const targetId = s.perm("target").permanentId;
    preferred.push(targetId);
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("magnadramon").permanentId]);
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === targetId));

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("P-172");
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-020");
    assertNoLoudGap(s);
  });
});
