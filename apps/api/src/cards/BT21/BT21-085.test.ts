import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-085.js";
import "../index.js";

const mainEffectKey = `BT21-085/ir-${EffectTiming.OnDeclaration}-0`;

describe("BT21-085 Davis Motomiya", () => {
  it("encodes the conditional memory, paid optional Main effect, and Security play", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main?.actions).toMatchObject([
      {
        kind: "Draw",
        amount: 1,
        optional: true,
        abortOnDecline: true,
        cost: { kind: "suspend", target: { filter: { isSelfRef: true } } },
        additionalCost: {
          kind: "trash",
          target: {
            filter: {
              zone: "digivolutionCards",
              position: "top",
              hostFilter: { nameOrTrait: [{ tokens: ["Armor Form"], match: "trait" }] },
            },
          },
        },
      },
      { kind: "GainMemory", amount: 1 },
    ]);
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "opponentHas", filter: { kind: ["Digimon"] } },
    });
    expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it.each([
    ["without an opposing Digimon", false, 0],
    ["with an opposing Digimon", true, 1],
  ])("start of main %s gains %i memory", async (_label, hasOpponent, expectedGain) => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-085", as: "davis" }] },
      1: hasOpponent ? { battleArea: [{ card: "BT1-009", as: "opponent" }] } : {},
    });
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("davis"));
    expect(s.state.memory).toBe(expectedGain);
  });

  it("gains the conditional memory through the public start-of-main lifecycle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-085", as: "davis" }],
        hand: [{ card: "BT1-009", as: "playable" }],
        deck: ["BT1-009", "BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }], deck: ["BT1-009", "BT1-009"] },
    });
    await s.ready();
    s.state.memory = 0;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("suspends, trashes only the top Armor Form source, draws, and gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-085", as: "davis" },
            {
              card: "BT21-036",
              as: "armor",
              under: [
                { card: "BT1-009", as: "bottom" },
                { card: "BT1-010", as: "top" },
              ],
            },
          ],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("davis").instanceId,
        effectKey: mainEffectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.perm("davis").isSuspended).toBe(true);
    expect(s.perm("armor").stack.map((card) => card.instanceId)).toEqual([s.inst("bottom").instanceId]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("top").instanceId)).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("declining pays neither cost and resolves neither reward", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-085", as: "davis" },
            { card: "BT21-036", as: "armor", under: [{ card: "BT1-009", as: "source" }] },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("davis").instanceId,
        effectKey: mainEffectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("davis").isSuspended).toBe(false);
    expect(s.perm("armor").stack).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.memory).toBe(0);
  });

  it("cannot pay the Main effect without a stacked Armor Form Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-085", as: "davis" },
            { card: "BT1-009", as: "nonArmor", under: ["BT1-010"] },
          ],
          deck: ["BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("davis").instanceId,
        effectKey: mainEffectKey,
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });

    expect(s.perm("davis").isSuspended).toBe(false);
    expect(s.perm("nonArmor").stack).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.memory).toBe(0);
  });

  it("plays itself from Security without paying cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT21-085", as: "davis" }] } });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("davis"));
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(0);
  });
});
