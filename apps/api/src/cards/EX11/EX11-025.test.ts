import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const cardId = "EX11-025";

describe("EX11-025 FunBeemon", () => {
  it("legally evolves from a Royal Base level 2", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX11-003", as: "base", dp: 0 }], hand: [{ card: "EX11-025", as: "funbeemon" }] } },
      { autoAcceptOptional: true },
    );
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("funbeemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX11-025", 600);
    expect(s.perm("base").topCard?.cardId).toBe("EX11-025");
  });

  it("encodes Security Reboot, face-up bottom placement, and inherited DP", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "FunBeemon",
      colors: ["Green", "Black"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Green", level: 2, memoryCost: 1 },
        { color: "Black", level: 2, memoryCost: 1 },
      ],
      types: ["Insectoid", "X Antibody", "Royal Base", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 2, traits: ["Royal Base"], cost: 0, isAlternate: true },
    ]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OpponentsTurn",
      isSecurity: true,
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Reboot", raw: "＜Reboot＞" }, target: { count: "all" } }],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        { kind: "SecurityManipulation", op: "toHand", amount: 1, toTop: true, faceDownOnly: true },
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          from: ["hand"],
          toTop: false,
          faceUp: true,
          optional: true,
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    });
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
  });

  it("moves the top security to hand, then may place only a Royal Base Digimon face up at the bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          security: [
            { card: "BT1-001", as: "top" },
            { card: "BT1-002", as: "bottom" },
          ],
          hand: [
            { card: "EX11-030", as: "royalBase" },
            { card: "BT1-009", as: "plain" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("source"));
    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toEqual(
      expect.arrayContaining(["BT1-001", "BT1-009"]),
    );
    expect(s.state.players[0]!.security.map(({ cardId: id }) => id)).toEqual(["BT1-002", "EX11-030"]);
    expect(s.state.players[0]!.security[1]).toMatchObject({ cardId: "EX11-030", faceUp: true });
    assertNoLoudGap(s);
  });

  // "Add your top FACE-DOWN security card to the hand": a face-up security card (which this very
  // card creates, and which KB Q5812/Q5813 keep revealed in the stack) is skipped. Drop
  // `faceDownOnly` from the module and BT1-001 is taken instead, failing both assertions.
  it("skips a face-up security card and takes the top face-down one", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          security: [
            { card: "BT1-001", as: "faceUpTop", faceUp: true },
            { card: "BT1-002", as: "faceDown" },
          ],
          hand: [{ card: "EX11-030", as: "royalBase" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("source"));
    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toEqual(["BT1-002"]);
    expect(s.state.players[0]!.security.map(({ cardId: id }) => id)).toEqual(["BT1-001", "EX11-030"]);
    expect(s.state.players[0]!.security[0]).toMatchObject({ cardId: "BT1-001", faceUp: true });
    assertNoLoudGap(s);
  });

  it("may decline the replacement after the mandatory top-security pickup", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          security: [{ card: "BT1-001", as: "top" }],
          hand: [{ card: "EX11-030", as: "royalBase" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("source"));
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toEqual(
      expect.arrayContaining(["BT1-001", "EX11-030"]),
    );
    assertNoLoudGap(s);
  });

  it("grants Reboot only to own Royal Base Digimon from security on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: cardId, as: "security", faceUp: true }],
        battleArea: [
          { card: "EX11-030", as: "royalBase" },
          { card: "BT1-009", as: "plain" },
        ],
      },
      1: { battleArea: [{ card: "EX11-030", as: "opposingRoyalBase" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("royalBase"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plain"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("opposingRoyalBase"), "Reboot")).toBe(false);
    assertNoLoudGap(s);
  });

  it("applies the inherited +1000 DP in a realistic evolution stack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-030", as: "host", under: [cardId], dp: 5000 }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
    assertNoLoudGap(s);
  });
});
