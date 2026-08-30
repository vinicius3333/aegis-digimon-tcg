import { EffectDuration, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-017.js";

describe("BT5-017 ZeigGreymon", () => {
  it("matches the catalog and complete compiled contract", () => {
    expect(getCardDefinition("BT5-017")).toMatchObject({
      cardId: "BT5-017",
      nameEn: "ZeigGreymon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 11000,
      evoCosts: [{ color: "Red", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Cyborg"],
      effectText: "[When Digivolving] ＜Blitz＞ (This Digimon can attack when your opponent has 1 or more memory.)",
      inheritedEffectText:
        "[Your Turn] When this Digimon attacks with ＜Blitz＞, it can also attack your opponent's unsuspended Digimon.",
    });
  });

  it("gains Blitz when digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-002", as: "base" }], hand: [{ card: "BT5-017", as: "evolving" }] },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Blitz"));

    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blitz")).toBe(true);
  });

  it("lets a Blitz host attack an opposing unsuspended Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-084", as: "host", under: ["BT5-017"] }] },
      1: { battleArea: [{ card: "BT5-071", as: "unsuspended" }] },
    });
    (s.engine as any).primitives.grantKeyword(s.perm("host").permanentId, "Blitz", EffectDuration.UntilEachTurnEnd);
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("unsuspended").permanentId },
      }),
    ).toEqual({ ok: true });
  });

  it("does not allow an unsuspended-target attack without Blitz", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-084", as: "host", under: ["BT5-017"] }] },
      1: { battleArea: [{ card: "BT5-071", as: "unsuspended" }] },
    });
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("unsuspended").permanentId },
      }).ok,
    ).toBe(false);
  });

  it("uses the actual digivolution-granted Blitz while the opponent has memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-015", as: "base" }], hand: [{ card: "BT5-017", as: "evolving" }] },
      1: { battleArea: [{ card: "BT5-071", as: "target" }] },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Blitz"));
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("cannot use Blitz when digivolution leaves memory at exactly 0", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-015", as: "base" }], hand: [{ card: "BT5-017", as: "evolving" }] },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT5-017");
    expect(s.state.memory).toBe(0);
    // At exactly 0 the opponent has no memory, so the optional Blitz window must not open.
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("only allows the inherited unsuspended-target attack during your turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-084", as: "host", under: ["BT5-017"] }] },
      1: { battleArea: [{ card: "BT5-071", as: "unsuspended" }] },
    });
    s.state.turnSeat = 1;
    (s.engine as any).primitives.grantKeyword(s.perm("host").permanentId, "Blitz", EffectDuration.UntilEachTurnEnd);
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("unsuspended").permanentId },
      }).ok,
    ).toBe(false);
  });
});
