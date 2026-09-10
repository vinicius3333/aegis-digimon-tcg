import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/EX7/EX7-014.js";
import "../../cards/EX3/EX3-014.js";
import "../../cards/P/P-143.js";
import "../../cards/BT10/BT10-061.js";
import "../../cards/BT7/BT7-058.js";

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

  it("restores the cost reduction when leave prevention keeps a field material in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT7-058", as: "material" }],
        hand: [{ card: "BT10-061", as: "skullKnightmon" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    const material = s.perm("material");

    // Isolate the failed-relocation boundary: the production dependency returns false when a
    // leave-play replacement prevents the selected permanent from becoming DigiXros material.
    Reflect.set(s.engine, "consultLeavePrevention", async () => new Set([material.permanentId]));

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("skullKnightmon").instanceId,
        digiXros: { materialInstanceIds: [material.topCard.instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT10-061"));

    const xros = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT10-061")!;
    expect(s.state.players[0]!.battleArea).toContain(material);
    expect(xros.stack).toHaveLength(0);
    // BT10-061 costs 4 and reduces by 1 for each card actually placed. Prevention means the
    // declared card was not placed, so the engine must charge the unreduced play cost.
    expect(s.state.memory).toBe(6);
  });
});
