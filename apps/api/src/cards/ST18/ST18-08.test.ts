import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./ST18-08.js";

describe("ST18-08 Galemon", () => {
  it("applies its inherited Your Turn DP bonus through a real evolution stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST18-09", dp: 7000, as: "host", under: ["ST18-08"] }] },
    });
    await s.ready();
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["ST18-08"]);
    expect(s.perm("host").currentDP).toBe(9000);
  });

  it("publishes Vortex and the inherited +2000 DP clause", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        keywords: [expect.objectContaining({ keyword: "Vortex" })],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        isInherited: true,
        trigger: "YourTurn",
        actions: [expect.objectContaining({ kind: "ModifyDP", amount: 2000, duration: "permanent" })],
      }),
    );
  });

  it("may play a LIBERATOR card costing four or less from hand when revealed in security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "ST18-08", as: "galemon" }, "BT1-090"], hand: [{ card: "ST18-14", as: "shoto" }] },
        1: { battleArea: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.state.players[1]!.battleArea[0]!.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST18-14"));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST18-14")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "ST18-14")).toBe(false);
  });

  it("may play the qualifying card from trash while leaving a card above the cost boundary", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "ST18-08", as: "galemon" }],
          trash: [{ card: "ST18-14", as: "shoto" }],
          hand: [{ card: "ST18-12", as: "tooExpensive" }],
        },
        1: { battleArea: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("galemon"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("shoto").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("shoto").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "ST18-14")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "ST18-12")).toBe(true);
  });

  it("may decline the optional Security play", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "ST18-08", as: "galemon" }], hand: [{ card: "ST18-14", as: "shoto" }] },
        1: { battleArea: ["BT1-009"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.state.players[1]!.battleArea[0]!.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "combatResolved") &&
        s.state.players[0]!.hand.some((card) => card.cardId === "ST18-14"),
    );
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "ST18-14")).toBe(true);
  });

  it("rejects a forged Main-phase Vortex intent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST18-08", as: "galemon", dp: 7000 }], deck: ["BT1-001", "BT1-002"] },
        1: {
          battleArea: [{ card: "BT1-010", as: "target", dp: 3000 }],
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).canAttackUnsuspended(s.perm("galemon"))).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("galemon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
        vortex: true,
      }),
    ).toEqual({ ok: false, reason: "wrong-phase" });
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("accepts the optional Vortex attack at end of turn", async () => {
    const s = setupEngine(
      {
        0: { hand: ["AD1-001"], deck: ["AD1-001"], battleArea: [{ card: "ST18-08", as: "galemon", dp: 7000 }] },
        1: {
          hand: ["AD1-001"],
          deck: ["AD1-001"],
          battleArea: [{ card: "BT1-010", as: "target", dp: 3000 }],
          security: ["BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.isFirstPlayersFirstTurn = true;
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen, 500);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
