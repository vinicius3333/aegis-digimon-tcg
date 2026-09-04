import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-019.js";

describe("EX8-019", () => {
  it("reduces Ice-Snow digivolution cost by 1 during your turn and gains Ice-Snow as a trait", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "Replacement",
      actions: [{ mode: "reduceCost", amount: 1 }],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      tokens: ["Ice-Snow"],
    });
  });
  it("inherits giving an opposing Digimon Security Attack -1 when attacking", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: -1 },
      duration: "untilOpponentTurnEnd",
    }));
  it("exposes the Ice-Snow trait on live state", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-019", as: "penguinmon" }] } });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("penguinmon"), "Ice-Snow")).toBe(true);
  });
  it("reduces an opposing Digimon's Security Attack during a real host attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-037", as: "host", under: [{ card: "EX8-019", as: "penguinmon" }] }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }], security: ["BT1-045"], deck: ["BT1-046"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack") === -1);
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-1);
    await settle(() => !observe(s.engine).isAttacking());

    s.state.memory = 0;
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(0);
  });

  it("reduces an Ice-Snow evolution by 1 in the battle area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX8-019", as: "penguinmon" }],
        hand: [{ card: "BT1-032", as: "frigimon" }],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("penguinmon").permanentId,
        instanceId: s.inst("frigimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("penguinmon").topCard.instanceId === s.inst("frigimon").instanceId);
    expect(s.state.memory).toBe(1);
  });

  it("does not reduce an Ice-Snow evolution in breeding (Q3881)", async () => {
    const s = setupEngine({
      0: { breeding: { card: "EX8-019", as: "penguinmon" }, hand: [{ card: "BT1-032", as: "frigimon" }] },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("penguinmon").permanentId,
        instanceId: s.inst("frigimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("penguinmon").topCard.instanceId === s.inst("frigimon").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("uses the Hiyarimon alternate route for 0 and rejects another off-color egg", async () => {
    expect(digivolutionRequirementsFor("EX8-019")).toContainEqual({
      names: ["Hiyarimon"],
      cost: 0,
      isAlternate: true,
    });
    const eligible = setupEngine({
      0: { breeding: { card: "BT8-002", as: "hiyarimon" }, hand: [{ card: "EX8-019", as: "penguinmon" }] },
    });
    await eligible.ready();
    expect(
      eligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eligible.perm("hiyarimon").permanentId,
        instanceId: eligible.inst("penguinmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => eligible.perm("hiyarimon").topCard.instanceId === eligible.inst("penguinmon").instanceId);
    expect(eligible.state.memory).toBe(0);

    const ineligible = setupEngine({
      0: { breeding: { card: "BT2-005", as: "kapurimon" }, hand: [{ card: "EX8-019", as: "penguinmon" }] },
    });
    await ineligible.ready();
    expect(
      ineligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ineligible.perm("kapurimon").permanentId,
        instanceId: ineligible.inst("penguinmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
