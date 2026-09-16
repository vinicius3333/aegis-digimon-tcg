import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT15-037 Gatomon", () => {
  it("carries Gatomon's inherited Barrier through a legal evolution and survives battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-045", as: "yellowBase", suspended: true }],
          hand: [
            { card: "BT15-037", as: "gatomon" },
            { card: "ST3-08", as: "levelFive" },
          ],
          security: [{ card: "BT1-010", as: "securityForBarrier" }],
        },
        1: { battleArea: [{ card: "BT15-029", as: "attacker", dp: 8000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yellowBase").permanentId,
        instanceId: s.inst("gatomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yellowBase").topCard?.cardId === "BT15-037");
    expect(s.state.memory).toBe(3);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yellowBase").permanentId,
        instanceId: s.inst("levelFive").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yellowBase").topCard?.cardId === "ST3-08");
    expect(s.perm("yellowBase").stack.map((card) => card.cardId)).toEqual(["BT1-045", "BT15-037"]);
    expect(s.perm("yellowBase").stack[0]?.instanceId).toBe(s.inst("yellowBase").instanceId);
    expect(s.perm("yellowBase").stack[1]?.instanceId).toBe(s.inst("gatomon").instanceId);
    expect(s.state.memory).toBe(0);

    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("yellowBase").permanentId },
      }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { hasOpenBarrierDecision: boolean } }).combat;
    await settle(() => combat.hasOpenBarrierDecision);
    expect(
      s.engine.applyIntent(0, {
        type: "respondBarrier",
        permanentId: s.perm("yellowBase").permanentId,
        accept: true,
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("yellowBase").permanentId)).toBe(true);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("securityForBarrier").instanceId,
    );
  });

  it("registers both printed Barrier clauses and scopes memory gain to own security", async () => {
    const { compiled } = await import("./BT15-037.js");
    expect(
      compiled.effects?.filter((effect) => effect.keywords?.some((keyword) => keyword.keyword === "Barrier")),
    ).toHaveLength(2);
    expect(compiled.effects?.[1]).toMatchObject({ actions: [{ sourceFilter: { controller: "mine" } }] });
  });
  it("plays itself when an effect directly trashes it from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT15-037", as: "gatomon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true },
    );

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT15-037"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT15-037")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT15-037")).toBe(false);
    assertNoLoudGap(s);
  });

  it("counts a card played from security as its same-time security removal", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-045", as: "yellowSource" }],
          hand: [{ card: "BT15-092", as: "revelation" }],
          security: [{ card: "BT15-037", as: "gatomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("revelation").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT15-037"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT15-037")).toBe(true);
    expect(s.state.memory).toBe(-3);
    expect(s.state.players[0]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("gains exactly 1 memory when another effect removes a card from its security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT15-037", as: "gatomon" }],
        security: ["BT1-085"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    s.state.memory = 0;

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("ignores the opponent's security removal", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT15-037", as: "gatomon" }] },
      1: { security: ["BT1-085"] },
    });
    s.state.memory = 0;

    await advance(s.engine).verb.trashFromSecurity(1, 1, { fromTop: true });

    expect(s.state.memory).toBe(0);
  });

  it("gains memory only once in a turn and resets through public turn progression", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT15-037", as: "gatomon" }],
        security: ["BT1-085", "BT1-086", "BT1-087"],
        deck: ["BT1-009", "BT1-009"],
      },
      1: { deck: ["BT1-009"] },
    });
    s.state.memory = 0;

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    expect(s.state.memory).toBe(1);

    s.state.memory = 3;
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });

    expect(s.state.memory).toBe(-1);
  });

  it("uses top-level Barrier to pay top security and survive a real battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-037", as: "gatomon", suspended: true }],
          security: [{ card: "BT1-085", as: "barrierCost" }],
        },
        1: { battleArea: [{ card: "BT15-029", as: "attacker", dp: 8000 }] },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("gatomon").permanentId },
      }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { hasOpenBarrierDecision: boolean } }).combat;
    await settle(() => combat.hasOpenBarrierDecision);
    expect(
      s.engine.applyIntent(0, {
        type: "respondBarrier",
        permanentId: s.perm("gatomon").permanentId,
        accept: true,
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(
      s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("gatomon").permanentId),
    ).toBe(true);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("barrierCost").instanceId);
  });
});
