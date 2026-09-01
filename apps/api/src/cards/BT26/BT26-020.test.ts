import { digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-020.js";
import "../index.js";
describe("BT26-020 ShellNumemon", () => {
  it("compiles draw and same-target attack/block restriction plus inherited Evade", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]?.actions).toMatchObject([
      { kind: "Draw" },
      { kind: "Restrict", restriction: "attackOrBlock" },
    ]);
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      actions: [],
      keywords: [{ keyword: "Evade" }],
    });
  });
  it("draws and restricts exactly one opposing Digimon from attacking or blocking", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-020", as: "shell" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
          security: ["BT1-002"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId);
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shell").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("drawn").instanceId));
    await settle(
      () =>
        observe(s.engine).isRestricted(s.perm("first"), "attack") ||
        observe(s.engine).isRestricted(s.perm("second"), "attack"),
    );
    const locked = [s.perm("first"), s.perm("second")].filter((p) => observe(s.engine).isRestricted(p, "attack"));
    expect(locked).toHaveLength(1);
    expect(observe(s.engine).isRestricted(locked[0]!, "block")).toBe(true);

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: locked[0]!.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(locked[0]!.isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);

    advance(s.engine).ledgers.continuous.sweep(s.state, "eachTurnEnd", 0);
    expect(observe(s.engine).isRestricted(locked[0]!, "attack")).toBe(true);
    advance(s.engine).ledgers.continuous.sweep(s.state, "eachTurnEnd", 1);
    expect(observe(s.engine).isRestricted(locked[0]!, "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(locked[0]!, "block")).toBe(false);
  });

  it("still applies the Then restriction when Draw 1 cannot draw from an empty deck", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT26-020", as: "shell" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shell").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "attack"));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("target"), "block")).toBe(true);
  });

  it("uses the exact level-3 DS cost-2 evolution path and rejects a near-match", async () => {
    expect(digivolutionRequirementsFor("BT26-020")).toContainEqual({
      level: 3,
      traits: ["DS"],
      cost: 2,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT26-018", as: "dsBase", under: ["EX8-002"] }],
        hand: [{ card: "BT26-020", as: "shell" }],
        deck: ["BT1-009"],
      },
    });
    legal.state.memory = 2;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("dsBase").permanentId,
        instanceId: legal.inst("shell").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("dsBase").topCard.cardId === "BT26-020");
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("dsBase").stack.map(({ cardId }) => cardId)).toEqual(["EX8-002", "BT26-018"]);

    const invalid = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "plainBase" }],
        hand: [{ card: "BT26-020", as: "shell" }],
      },
    });
    invalid.state.memory = 2;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("plainBase").permanentId,
        instanceId: invalid.inst("shell").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(invalid.state.memory).toBe(2);
  });

  it("grants inherited Evade only while ShellNumemon is in a host's evolution stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-020", as: "top" },
          { card: "BT1-038", as: "host", under: [{ card: "BT26-020", as: "source" }] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Evade")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("top"), "Evade")).toBe(false);
  });

  it("uses inherited Evade to suspend the host and prevent effect deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-038", as: "host", under: [{ card: "BT26-020" }] }] },
    });
    const hostId = s.perm("host").permanentId;
    const deletion = advance(s.engine).verb.deletePermanent([hostId], "byEffect");
    await settle(() => s.events.some((event) => event.kind === "evadePrompt"));

    expect(s.engine.applyIntent(0, { type: "respondEvade", permanentId: hostId, accept: true })).toEqual({ ok: true });
    expect(await deletion).toBe(0);
    await settle(() => s.perm("host").isSuspended);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.events).toContainEqual({ kind: "evadeResolved", permanentId: hostId, accepted: true });
  });
});
