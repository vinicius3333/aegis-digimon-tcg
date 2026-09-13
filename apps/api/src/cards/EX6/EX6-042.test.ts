import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-042.js";
import "./EX6-007.js";
import "../ST13/ST13-16.js";
import "../ST1/ST1-16.js";
import "./EX6-044.js";

describe("EX6-042 RaijiLudomon", () => {
  it("pays 2 and places itself under a level 5 or Legend-Arms Digimon to grant the opponent an attack aura", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "GrantAuraToOpponents",
      duration: "untilOpponentTurnEnd",
      effectText: "[Start of Your Main Phase] This Digimon attacks.",
      cost: {
        kind: "compound",
        costs: [
          { kind: "payMemory", memory: 2 },
          {
            kind: "place",
            destination: "digivolutionStack",
            position: "bottom",
            target: { filter: { isSelfRef: true } },
          },
        ],
      },
    }));
  it("only grants Blocker/Reboot for effect-driven placement and inherits Legend-Arms protection", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { isSelfRef: true, byEffect: true },
      actions: [
        { kind: "GainKeyword", keyword: { keyword: "Blocker" } },
        { kind: "GainKeyword", keyword: { keyword: "Reboot" } },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          leaveCause: "otherThanYourEffect",
          actions: [
            {
              kind: "Prevent",
              optional: true,
              cost: {
                target: {
                  filter: { zone: "digivolutionCards", hostFilter: { isSelfRef: true } },
                },
              },
            },
          ],
        },
      ],
    });
  });

  it("publicly pays 2 and places RaijiLudomon under an eligible level 5 host", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-009", as: "host" }], hand: [{ card: "EX6-042", as: "raiji" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const effect = JSON.parse(s.inst("raiji").activatableEffectsJson || "[]")[0];
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("raiji").instanceId,
        effectKey: effect.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === s.inst("raiji").instanceId));
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("raiji").instanceId)).toBe(true);
    expect(s.state.memory).toBe(3);
  });
  it("does not expose the hand Main effect without a level 5 or Legend-Arms host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-053", as: "ineligible" }], hand: [{ card: "EX6-042", as: "raiji" }] },
    });
    await s.ready();
    expect(JSON.parse(s.inst("raiji").activatableEffectsJson || "[]")).toHaveLength(0);
  });

  it("publicly evolves onto a legal Legend-Arms stack without granting keywords", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-040", as: "host" }],
          hand: [{ card: "EX6-042", as: "raiji" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("raiji").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.instanceId === s.inst("raiji").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(false);
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("host").instanceId)).toBe(true);
  });

  it("grants both keywords when EX6-007 publicly places itself under RaijiLudomon", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-042", as: "raiji" }], hand: [{ card: "EX6-007", as: "zubamon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const effect = JSON.parse(s.inst("zubamon").activatableEffectsJson || "[]")[0];
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("zubamon").instanceId,
        effectKey: effect.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("raiji").stack.some((card) => card.instanceId === s.inst("zubamon").instanceId));
    expect(observe(s.engine).hasKeyword(s.perm("raiji"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("raiji"), "Reboot")).toBe(true);
  });

  it("uses an Option with the Legend-Arms trait to prevent opponent Gaia Force once", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-044", as: "host", under: [{ card: "ST13-16", as: "option" }, "EX6-042"] }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "redSource" }],
          hand: [
            { card: "ST1-16", as: "gaiaForce" },
            { card: "ST1-16", as: "gaiaForce2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    preferred.push(s.inst("option").instanceId);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaiaForce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.perm("host").stack.length === 1);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("host").permanentId)).toBe(true);
    expect(s.state.players[0]!.trash).toContainEqual(expect.objectContaining({ cardId: "ST13-16" }));
    expect(s.perm("host").stack.some((c) => c.cardId === "ST13-16")).toBe(false);
    expect(s.state.players[1]!.trash.some((c) => c.cardId === "ST1-16")).toBe(true);
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaiaForce2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("host").permanentId));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("host").permanentId)).toBe(false);
  });
});
