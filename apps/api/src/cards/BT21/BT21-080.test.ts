import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-080.js";
import "../index.js";

describe("BT21-080 Hiro Amanokawa", () => {
  it("implements the main-phase memory, digivolution-card trigger, and security play", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "StartOfYourMainPhase",
        actions: [expect.objectContaining({ kind: "GainMemory", amount: 1 })],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "onAddDigivolutionCards",
            triggerFilter: expect.objectContaining({
              nameOrTrait: [
                { tokens: ["Gammamon"], match: "text" },
                { tokens: ["Hero"], match: "trait", orPrevious: true },
              ],
            }),
            cost: expect.objectContaining({ kind: "suspend", target: expect.objectContaining({ isSelf: true }) }),
            optional: true,
            abortOnDecline: true,
          }),
        ],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        isSecurity: true,
        actions: [expect.objectContaining({ kind: "PlayWithoutCost", payCost: false })],
      }),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it.each([
    ["without an opposing Digimon", false, 0],
    ["with an opposing Digimon", true, 1],
  ])("start of main %s gains %i memory", async (_label, hasOpponent, expectedGain) => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-080", as: "hiro" }] },
      1: hasOpponent ? { battleArea: [{ card: "BT1-009", as: "opponent" }] } : {},
    });
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("hiro"));
    expect(s.state.memory).toBe(expectedGain);
  });

  it.each([
    ["Gammamon text", "BT21-069"],
    ["Hero trait", "BT21-066"],
  ])("suspends to draw and gain memory for a %s host", async (_label, host) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-080", as: "hiro" },
            { card: host, as: "host", under: [{ card: "BT1-009", as: "added" }] },
          ],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("added").instanceId],
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.perm("hiro").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("does not trigger for a nonmatching host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-080", as: "hiro" },
            { card: "BT1-009", as: "host", under: [{ card: "BT1-010", as: "added" }] },
          ],
          deck: ["BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("added").instanceId],
    });
    expect(s.perm("hiro").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("declining does not suspend, draw, or gain memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-080", as: "hiro" },
            { card: "BT21-069", as: "host", under: [{ card: "BT1-009", as: "added" }] },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("added").instanceId],
    });
    expect(s.perm("hiro").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.memory).toBe(0);
  });

  it("plays itself from security without paying cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT21-080", as: "hiro" }] } });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("hiro"));
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(0);
  });
});
