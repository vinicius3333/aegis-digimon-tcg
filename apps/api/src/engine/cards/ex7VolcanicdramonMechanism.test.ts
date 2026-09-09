import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/EX7/EX7-014.js";
import "../../cards/EX3/EX3-014.js";
import "../../cards/P/P-143.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>) {
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("EX7-014 shared movement and DigiXros replacement seams", () => {
  it("applies playOrMove restrictions to effect-driven battle-to-breeding moves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-024", as: "source" }],
          hand: [{ card: "EX7-014", as: "volcanic" }],
          deck: ["BT1-013", "BT1-014"],
        },
        1: { battleArea: [{ card: "P-143", as: "drimogemon" }], deck: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("volcanic").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX7-014");
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);

    // FAILS-WHEN-REVERTED: removing the generic isPlayBlocked(move) gate from
    // movePermanentZone lets P-143 enter breeding despite EX7-014's restriction.
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "P-143")).toBe(true);
    expect(s.state.players[1]!.breeding).toBeUndefined();
    await stopLoop(s, loop);
  });

  it("consults leave replacements before consuming a battle-area DigiXros material", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-014", as: "volcanic" }],
          hand: [
            { card: "EX3-014", as: "dorbickmon" },
            { card: "EX3-005", as: "vorvomon" },
            { card: "EX3-006", as: "flare" },
            { card: "EX3-008", as: "flamedramon" },
            { card: "EX3-009", as: "volcdramon" },
            { card: "EX3-011", as: "lavogaritamon" },
            { card: "ST5-07", as: "replacement" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 13;
    await s.ready();
    const materials = ["volcanic", "vorvomon", "flare", "flamedramon", "volcdramon"].map((alias) =>
      alias === "volcanic" ? s.perm(alias).topCard.instanceId : s.inst(alias).instanceId,
    );

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dorbickmon").instanceId,
        digiXros: { materialInstanceIds: materials },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX3-014"));

    // FAILS-WHEN-REVERTED: bypassing the leave-replacement consultation leaves
    // EX7-014's replacement in hand and fails this identity boundary.
    const xros = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "EX3-014")!;
    expect(xros.stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining(materials));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "ST5-07")).toBe(true);
    expect(xros.stack.map((card) => card.cardId)).not.toContain("ST5-07");
  });
});
