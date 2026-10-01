import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type SeatSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-085.js";
import "../BT1/BT1-107.js";
import "../BT2/BT2-020.js";
import "./BT4-088.js";

describe("BT4-088 DanDevimon", () => {
  it("once per opponent turn trashes their top security when one of yours is removed", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-088", as: "dan", under: ["BT4-085"] }], security: ["BT1-001", "BT1-002"] },
      1: { security: ["BT1-009", "BT1-010"] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("makes the opponent trash 2 cards from hand when deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-088", as: "dan", under: ["BT4-085"] }] },
        1: { hand: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("dan").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.trash.length === 2);

    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(2);
  });
});

describe("BT4-088 DanDevimon — KB Q&A rulings", () => {
  const setupOpponentAttack = (defender: SeatSpec, attacker: SeatSpec) => {
    const s = setupEngine({
      0: defender,
      1: { battleArea: [{ card: "BT1-024", as: "attacker" }], ...attacker },
    });
    s.state.turnSeat = 1;
    return s;
  };

  const attackPlayer = async (s: ReturnType<typeof setupOpponentAttack>) => {
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking(), 5000);
  };

  it("does not activate the [Security] effect of the opponent's security card it trashes (Q1235)", async () => {
    const s = setupOpponentAttack(
      { battleArea: [{ card: "BT4-088", as: "dan" }], security: ["BT1-009"] },
      { security: [{ card: "BT1-085", as: "tai" }, "BT1-009"] },
    );
    const taiInstanceId = s.inst("tai").instanceId;

    await attackPlayer(s);

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(taiInstanceId);
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-085")).toBe(false);

    const checkedTai = setupOpponentAttack(
      { battleArea: [{ card: "BT4-088", as: "dan" }], security: ["BT1-085"] },
      { security: ["BT1-009", "BT1-010"] },
    );
    await attackPlayer(checkedTai);
    expect(checkedTai.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-085")).toBe(true);
  });

  it("makes the opponent choose the 2 hand cards they trash (Q1236)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-088", as: "dan" }] },
      1: {
        hand: [
          { card: "BT1-009", as: "kept" },
          { card: "BT1-010", as: "first" },
          { card: "BT1-011", as: "second" },
        ],
      },
    });
    const chosen = [s.inst("first").instanceId, s.inst("second").instanceId];

    void advance(s.engine).verb.deletePermanent([s.perm("dan").permanentId]);
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));

    const selections = s.decisions.filter(({ req }) => req.kind === "selectCards");
    expect(selections).toHaveLength(1);
    const { seat, req } = selections[0]!;
    expect(seat).toBe(1);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: req.decisionId,
        response: { kind: "selectCards", instanceIds: chosen },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.length === 2);

    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual([...chosen].sort());
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("kept").instanceId]);
  });

  it("activates when a security card is removed even if [Holy Wave] restores the security count (Q1237)", async () => {
    const s = setupOpponentAttack(
      { battleArea: [{ card: "BT4-088", as: "dan" }], security: ["BT1-107"], deck: ["BT1-009", "BT1-010"] },
      { security: ["BT1-009", "BT1-010"] },
    );

    await attackPlayer(s);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("activates on each copy, trashing 2 opponent security cards for one removal (Q1238)", async () => {
    const twoCopies = setupOpponentAttack(
      {
        battleArea: [
          { card: "BT4-088", as: "firstDan" },
          { card: "BT4-088", as: "secondDan" },
        ],
        security: ["BT1-009", "BT1-009"],
      },
      { security: ["BT1-009", "BT1-010", "BT1-011"] },
    );
    await attackPlayer(twoCopies);
    expect(twoCopies.state.players[0]!.security).toHaveLength(1);
    expect(twoCopies.state.players[1]!.security).toHaveLength(1);

    const oneCopy = setupOpponentAttack(
      { battleArea: [{ card: "BT4-088", as: "dan" }], security: ["BT1-009", "BT1-009"] },
      { security: ["BT1-009", "BT1-010", "BT1-011"] },
    );
    await attackPlayer(oneCopy);
    expect(oneCopy.state.players[1]!.security).toHaveLength(2);
  });

  it("activates when an opponent's [Gallantmon] trashes a security card directly (Q1239)", async () => {
    const setupGallantmonAttack = (trashCount: number) => {
      const s = setupEngine({
        0: {
          battleArea: [
            { card: "BT4-088", as: "dan" },
            { card: "BT1-009", as: "target", suspended: true },
          ],
          security: ["BT1-009", "BT1-010"],
          trash: Array.from({ length: trashCount }, () => "BT1-009"),
        },
        1: { battleArea: [{ card: "BT2-020", as: "gallantmon" }], security: ["BT1-009", "BT1-010"] },
      });
      s.state.turnSeat = 1;
      return s;
    };
    const attackDigimon = async (s: ReturnType<typeof setupGallantmonAttack>) => {
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("gallantmon").permanentId,
          target: { kind: "permanent", permanentId: s.perm("target").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking(), 5000);
    };

    const s = setupGallantmonAttack(10);
    await attackDigimon(s);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);

    const control = setupGallantmonAttack(9);
    await attackDigimon(control);
    expect(control.state.players[0]!.security).toHaveLength(2);
    expect(control.state.players[1]!.security).toHaveLength(2);
  });
});
