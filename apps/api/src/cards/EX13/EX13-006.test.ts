import { EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX13-006.js";

describe("EX13-006 Dorimon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition("EX13-006")).toMatchObject({
      cardId: "EX13-006",
      nameEn: "Dorimon",
      colors: ["Black"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      types: ["Lesser", "X Antibody", "Chronicle"],
      inheritedEffectText:
        "[End of Your Turn] [Once Per Turn] By paying 1 cost, 1 of your Digimon with the [X Antibody] or [Chronicle] trait may unsuspend.",
    });
    expect(getCardDefinition("EX13-006")?.effectText ?? "").toBe("");
  });

  it("compiles the inherited clause as an optional once-per-turn board unsuspend", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toHaveLength(1);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "EndOfYourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
    });
    expect(compiled.effects[0]?.actions?.[0]).toMatchObject({
      kind: "Unsuspend",
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["X Antibody", "Chronicle"], match: "trait" }],
        },
        count: 1,
      },
      cost: { kind: "payMemory", memory: 1 },
      optional: true,
      abortOnDecline: true,
    });
  });

  it("pays 1 to unsuspend its own [X Antibody] host at the end of the turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-063", as: "host", under: ["EX13-006"], suspended: true }] },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("host"));

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.memory).toBe(1);
  });

  it("unsuspends another of your Digimon rather than only the host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "host", under: ["EX13-006"] },
            { card: "BT20-048", as: "chronicle", suspended: true },
          ],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("host"));

    expect(s.perm("chronicle").isSuspended).toBe(false);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.memory).toBe(1);
  });

  it("refuses plain Digimon and a [Chronicle] Tamer, leaving the board untouched and memory unpaid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "host", under: ["EX13-006"], suspended: true },
            { card: "BT1-010", as: "plain", suspended: true },
            { card: "EX13-072", as: "chronicleTamer", suspended: true },
          ],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("host"));

    expect(s.perm("plain").isSuspended).toBe(true);
    expect(s.perm("chronicleTamer").isSuspended).toBe(true);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("treats the catalog's hyphenated [X-Antibody] spelling as the same trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "host", under: ["EX13-006"] },
            { card: "BT20-073", as: "hyphenTrait", suspended: true },
          ],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("host"));

    // The engine normalizes whitespace and hyphens in trait refs (matching/definition.ts
    // `normalizeTrait`), so "X-Antibody" and "X Antibody" are one trait, as in the real game.
    expect(s.perm("hyphenTrait").isSuspended).toBe(false);
    expect(s.state.memory).toBe(1);
  });

  it("never reaches across to the opponent's [X Antibody] Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX13-006"], suspended: true }] },
        1: {
          battleArea: [{ card: "BT13-063", as: "theirs", suspended: true }],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("host"));

    expect(s.perm("theirs").isSuspended).toBe(true);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("keeps the Digimon suspended and pays nothing when the optional effect is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-063", as: "host", under: ["EX13-006"], suspended: true }] },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 2;

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("host"));

    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("enters a legal host through public egg digivolution and unsuspends it at the natural end of turn", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX13-006", as: "egg" },
          hand: [
            { card: "BT13-063", as: "host" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [{ card: "BT1-010", as: "evolutionDraw" }, "BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === s.inst("host").instanceId);
    // Digi-Egg digivolution in breeding costs no memory and still draws 1.
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evolutionDraw").instanceId)).toBe(true);
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["EX13-006"]);

    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("egg").permanentId })).toEqual({
      ok: true,
    });
    await advance(s.engine).waitForMainPhase(0);
    // Keep the Lv.3 host alive through the security check; inert Lv.3 fixtures need 20,000 DP.
    s.perm("egg").baseDP = 20_000;
    s.perm("egg").currentDP = 20_000;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("egg").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").isSuspended);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.perm("egg").isSuspended).toBe(false);
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["EX13-006"]);
    expect(s.perm("egg").topCard.cardId).toBe("BT13-063");
  });

  it("rejects an illegal source: a Lv.2 Digi-Egg cannot digivolve into a Lv.4 Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX13-006", as: "egg" },
          hand: [{ card: "BT1-014", as: "tooHigh" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("tooHigh").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.perm("egg").topCard.cardId).toBe("EX13-006");
    expect(s.state.memory).toBe(3);
  });

  it("fires once per turn and resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-063", as: "host", under: ["EX13-006"], suspended: true }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          security: ["BT1-009", "BT1-010", "BT1-011"],
          hand: [{ card: "BT1-010", as: "spareOpponent" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("host"));
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.memory).toBe(2);

    s.perm("host").isSuspended = true;
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("host"));
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 3;
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("host"));
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.memory).toBe(2);
  });
});
