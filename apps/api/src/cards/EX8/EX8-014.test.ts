import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
import { compiled } from "./EX8-014.js";

describe("EX8-014", () => {
  it("has Fortitude and may suspend a Digimon to delete an opposing Digimon with 8000 DP or less", () => {
    expect(
      compiled.effects?.find((entry) => !entry.isInherited && entry.trigger === "Static")?.keywords,
    ).toContainEqual({ keyword: "Fortitude", raw: "＜Fortitude＞" });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Suspend", optional: true },
      { kind: "Delete", condition: { kind: "selfIsSuspended" } },
    ]);
  });
  it("inherits Security Attack +1", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "SecurityAttack",
      amount: 1,
      raw: "＜Security Attack +1＞",
    }));
  it("suspends a Digimon and deletes an opposing Digimon at the 8000 DP boundary", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-014", as: "master" }] },
        1: { battleArea: [{ card: "EX8-015", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("master").permanentId);
    const targetInstanceId = s.perm("target").topCard!.instanceId;

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("master"));
    await settle(() => s.perm("master").isSuspended);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === targetInstanceId)).toBe(true);
  });
  it("does not delete an opposing Digimon above 8000 DP after suspending", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-014", as: "master" }] },
        1: { battleArea: [{ card: "AD1-004", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("master"));
    await settle(() => s.perm("master").isSuspended);

    expect(s.perm("master").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.perm("target").topCard!.instanceId)).toBe(
      false,
    );
  });
  it("suspends and deletes through the When Digivolving trigger", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-014", as: "master" }] },
        1: { battleArea: [{ card: "EX8-015", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetInstanceId = s.perm("target").topCard!.instanceId;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("master"));
    await settle(() => s.perm("master").isSuspended);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === targetInstanceId)).toBe(true);
  });

  it("may suspend the opponent's Digimon when MasterTyrannomon was already suspended (Q3876)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-014", as: "master", suspended: true }] },
        1: { battleArea: [{ card: "AD1-004", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("target").permanentId);

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("master"));
    await settle(() => s.perm("target").isSuspended);

    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("replays itself through Fortitude only because it has a digivolution card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-014", as: "master", under: [{ card: "EX8-011", as: "source" }] }] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    const masterInstanceId = s.perm("master").topCard.instanceId;
    expect(observe(s.engine).hasKeyword(s.perm("master"), "Fortitude")).toBe(true);

    await advance(s.engine).verb.deletePermanent([s.perm("master").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === masterInstanceId),
    );
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(true);
  });

  it("exposes inherited Security Attack +1 on a live evolution stack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX8-014"] }] } });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("uses the off-color Dinosaur route for 3 and rejects a non-Dinosaur", async () => {
    expect(digivolutionRequirementsFor("EX8-014")).toContainEqual({
      level: 4,
      traits: ["Dinosaur"],
      cost: 3,
      isAlternate: true,
    });
    const eligible = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-019", as: "greymon" }],
          hand: [{ card: "EX8-014", as: "master" }],
        },
      },
      { autoDeclineOptional: true },
    );
    eligible.state.memory = 3;
    expect(
      eligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eligible.perm("greymon").permanentId,
        instanceId: eligible.inst("master").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => eligible.perm("greymon").topCard.instanceId === eligible.inst("master").instanceId);
    expect(eligible.state.memory).toBe(0);

    const ineligible = setupEngine({
      0: {
        battleArea: [{ card: "BT1-037", as: "gorillamon" }],
        hand: [{ card: "EX8-014", as: "master" }],
      },
    });
    await ineligible.ready();
    expect(
      ineligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ineligible.perm("gorillamon").permanentId,
        instanceId: ineligible.inst("master").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
