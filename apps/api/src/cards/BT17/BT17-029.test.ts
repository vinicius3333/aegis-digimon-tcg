import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-029.js";
import "./index.js";

const YELLOW_TAMER = "ST3-12";
const RED_TAMER = "BT12-088";
const INERT_SECURITY_DIGIMON = "BT1-012";

describe("BT17-029 Agumon", () => {
  it("matches the catalog and the complete IR contract", () => {
    expect(getCardDefinition("BT17-029")).toMatchObject({
      cardId: "BT17-029",
      nameEn: "Agumon",
      colors: ["Yellow"],
      level: 3,
      dp: 1000,
      evoCosts: [{ color: "Yellow", level: 2, memoryCost: 0 }],
      effectText: "[When Attacking] By suspending 1 of your yellow Tamers, ＜Draw 1＞.",
      inheritedEffectText: "[Your Turn] All of your opponent's security Digimon get -3000 DP.",
    });
    expect(compiled.effects).toEqual([
      {
        trigger: "WhenAttacking",
        actions: [
          {
            kind: "Draw",
            controller: "mine",
            amount: 1,
            cost: {
              kind: "suspend",
              target: {
                filter: { controller: "mine", kind: ["Tamer"], colors: ["Yellow"] },
                count: 1,
              },
              raw: "By suspending 1 of your yellow Tamers",
            },
            optional: true,
            abortOnDecline: true,
          },
        ],
      },
      {
        trigger: "YourTurn",
        actions: [{ kind: "ModifySecurityDP", controller: "opponent", amount: -3000, duration: "permanent" }],
        isInherited: true,
      },
    ]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("suspends a yellow Tamer to draw exactly 1 card when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-029", as: "agumon" },
            { card: YELLOW_TAMER, as: "tamer" },
          ],
          deck: [
            { card: "BT1-011", as: "drawn" },
            { card: "BT1-009", as: "kept" },
          ],
        },
        1: { security: [{ card: INERT_SECURITY_DIGIMON, as: "security" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const agumonId = s.perm("agumon").permanentId;
    const agumonInstanceId = s.perm("agumon").topCard!.instanceId;
    const drawnId = s.inst("drawn").instanceId;
    const keptId = s.inst("kept").instanceId;

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: agumonId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drawnId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([keptId]);
    // The 1000 DP attacker loses to the 2000 DP security Digimon it revealed.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([agumonInstanceId]);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("does not draw when the only Tamer is not yellow", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-029", as: "agumon" },
            { card: RED_TAMER, as: "tamer" },
          ],
          deck: [{ card: "BT1-011", as: "kept" }],
        },
        1: { security: [{ card: INERT_SECURITY_DIGIMON, as: "security" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const keptId = s.inst("kept").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("agumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([keptId]);
  });

  it("draws nothing when the optional cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-029", as: "agumon" },
            { card: YELLOW_TAMER, as: "tamer" },
          ],
          deck: [{ card: "BT1-011", as: "kept" }],
        },
        1: { security: [{ card: INERT_SECURITY_DIGIMON, as: "security" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("agumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.decisions.some((decision) => decision.req.kind === "optional")).toBe(true);
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("kept").instanceId]);
  });

  it("gives the opponent's security Digimon -3000 DP as an inherited effect on your turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-025", dp: 5000, under: ["BT17-029"], as: "host" }] },
      1: { security: [{ card: "BT1-020", as: "security" }] },
    });
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const securityId = s.inst("security").instanceId;
    expect(observe(s.engine).securityDp(1)).toBe(-3000);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    // 6000 DP security Digimon reduced to 3000 loses to the 5000 DP attacker.
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([securityId]);
  });

  it("does not reduce security DP on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-025", dp: 5000, under: ["BT17-029"], as: "host" }] },
      1: { security: [{ card: "BT1-020", as: "security" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).securityDp(1)).toBe(0);
  });
});
