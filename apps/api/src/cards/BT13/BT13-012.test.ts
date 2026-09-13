import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT13-012.js";
import "../BT12/BT12-092.js";
import "./BT13-015.js";

describe("BT13-012 GeoGreymon", () => {
  it("uses its alternate requirement, plays a red/yellow Tamer from security, then recovers from deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-008", as: "agumon" }],
          hand: [{ card: "BT13-012", as: "geogreymon" }],
          security: [{ card: "BT12-092", as: "marcus" }, "BT1-010"],
          deck: ["BT1-009", "BT1-010", "BT1-015"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: s.inst("geogreymon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT12-092"));
    await settle();

    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not recover when no eligible Tamer is played from security (Q2271)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT13-008", as: "agumon" }],
        hand: [{ card: "BT13-012", as: "geogreymon" }],
        security: ["BT1-010", "BT1-009"],
        deck: ["BT1-010", "BT1-009"],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: s.inst("geogreymon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agumon").topCard.cardId === "BT13-012");
    await settle();
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("may decline an eligible security Tamer and therefore does not recover", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-008", as: "agumon" }],
          hand: [{ card: "BT13-012", as: "geogreymon" }],
          security: [{ card: "BT12-092", as: "marcus" }, "BT1-010"],
          deck: ["BT1-010", "BT1-009"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: s.inst("geogreymon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agumon").topCard.cardId === "BT13-012");
    await settle();

    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("marcus").instanceId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(2);
  });

  it("once per turn may delete a 3000-or-less opposing Digimon when an allied red/yellow Tamer suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-015", as: "host", under: ["BT13-012"] },
            { card: "BT12-092", as: "marcus" },
            { card: "BT12-092", as: "otherMarcus" },
          ],
          hand: ["BT1-009"],
          deck: Array.from({ length: 8 }, () => "BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-012", as: "smallA" },
            { card: "BT1-012", as: "smallB" },
            { card: "BT1-015", as: "large" },
          ],
          security: ["BT1-010", "BT1-010", "BT1-010"],
          hand: ["BT1-009"],
          deck: Array.from({ length: 8 }, () => "BT1-010"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("otherMarcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT1-012")).toHaveLength(
      1,
    );
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-015")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT1-012")).toHaveLength(
      1,
    );
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle();
    expect(s.perm("marcus").currentDP).toBe(3000);
    expect(s.perm("marcus").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[1]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT1-012").length === 0,
    );
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("large").permanentId,
    ]);
    expect(s.state.players[1]!.trash.map((instance) => instance.instanceId)).toContain(s.inst("smallA").instanceId);
    expect(s.state.players[1]!.trash.map((instance) => instance.instanceId)).toContain(s.inst("smallB").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });
});
