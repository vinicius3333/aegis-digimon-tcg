import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-041.js";

describe("EX8-041", () => {
  it("inherits Retaliation", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Retaliation",
      raw: "＜Retaliation＞",
    }));

  it("suspends an opposing Tamer and prevents it from unsuspending on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Suspend", target: { count: 1 } },
      { kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toHaveLength(2);
  });
  it("suspends an opposing Tamer and prevents its unsuspension in a live On Play resolution", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX8-041", as: "dark" }] },
        1: { battleArea: [{ card: "BT1-087", as: "tamer" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dark").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea[0]!.isSuspended && observe(s.engine).isRestricted(s.perm("tamer"), "unsuspend"),
    );
    expect(s.state.players[1]!.battleArea[0]!.isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("tamer"), "unsuspend")).toBe(true);
  });
  it("can suspend one Tamer and restrict a different Tamer when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-041", as: "dark" }] },
        1: {
          battleArea: [
            { card: "BT1-087", as: "suspended" },
            { card: "BT1-087", as: "restricted" },
          ],
        },
      },
      {},
    );

    const resolution = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("dark"));
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const firstDecision = s.state.pendingDecision!;
    const firstSeat = s.decisions.at(-1)!.seat;
    const firstResponse = s.engine.applyIntent(firstSeat, {
      type: "respondDecision",
      decisionId: firstDecision.decisionId,
      response: { kind: "chooseTargets", instanceIds: [s.perm("suspended").permanentId] },
    });
    expect(firstResponse).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const secondDecision = s.state.pendingDecision!;
    const secondSeat = s.decisions.at(-1)!.seat;
    expect(
      s.engine.applyIntent(secondSeat, {
        type: "respondDecision",
        decisionId: secondDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("restricted").permanentId] },
      }),
    ).toEqual({ ok: true });
    await resolution;
    await settle(() => observe(s.engine).isRestricted(s.perm("restricted"), "unsuspend"));

    expect(s.perm("suspended").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("suspended"), "unsuspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "unsuspend")).toBe(true);
  });

  it("uses the Reptile evolution route and resolves the entry effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-038", as: "base" }], hand: [{ card: "EX8-041", as: "dark" }] },
        1: { battleArea: [{ card: "BT1-087", as: "tamer" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dark").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").isSuspended && observe(s.engine).isRestricted(s.perm("tamer"), "unsuspend"));
    expect(s.state.memory).toBe(0);
  });

  it("grants inherited Retaliation to its host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-001", as: "host", under: ["EX8-041"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
  });

  it("uses inherited Retaliation when the evolution host loses a battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-001", as: "host", dp: 1000, under: ["EX8-041"] }] },
        1: { battleArea: [{ card: "AD1-001", as: "target", dp: 3000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
