import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX3-068.js";

describe("EX3-068 God Flame", () => {
  it("matches the official errata identity and complete Main/Security text", () => {
    const definition = getCardDefinition("EX3-068")!;
    expect(definition).toMatchObject({
      cardId: "EX3-068",
      nameEn: "God Flame",
      colors: ["Yellow"],
      kinds: ["Option"],
      playCost: 5,
      rarity: "C",
      imageId: "EX3-068-Errata",
    });
    expect(definition.effectText).toContain("gets -6000 DP for the turn");
    expect(definition.effectText).toContain("you may return 1 card with the [Four Great Dragons] trait");
    expect(definition.securityEffectText).toBe("[Security] Activate this card's [Main] effect.");
  });

  it("reduces only the chosen opposing Digimon by 6000 DP and leaves the other untouched", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-034", as: "yellowSource" }],
          hand: [{ card: "EX3-068", as: "godFlame" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", dp: 7000, as: "chosen" },
            { card: "BT1-011", dp: 8000, as: "untouched" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").permanentId);
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("godFlame").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("chosen").currentDP === 1000);

    expect(s.perm("chosen").currentDP).toBe(1000);
    expect(s.perm("untouched").currentDP).toBe(8000);
    assertNoLoudGap(s);
  });

  it("deletes a Digimon whose DP reaches zero, then still offers the errata recovery", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-034", as: "yellowSource" }],
          hand: [{ card: "EX3-068", as: "godFlame" }],
          trash: [{ card: "EX3-036", as: "magnadramon" }],
        },
        1: { battleArea: [{ card: "BT1-010", dp: 6000, as: "doomed" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("doomed").permanentId, s.inst("magnadramon").instanceId);
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("godFlame").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("magnadramon").instanceId) &&
        s.state.players[1]!.battleArea.length === 0,
    );

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-010");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("magnadramon").instanceId);
    assertNoLoudGap(s);
  });

  it("Four Great Dragons family: offers Digimon and Trial, returns exactly one, and excludes unrelated trash", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-034", as: "yellowSource" }],
        hand: [{ card: "EX3-068", as: "godFlame" }],
        trash: [
          { card: "EX3-025", as: "azulongmon" },
          { card: "EX3-069", as: "trial" },
          { card: "BT1-010", as: "unrelated" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-011", dp: 7000, as: "target" },
          { card: "BT1-010", dp: 8000, as: "untouched" },
        ],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("godFlame").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const dpDecision = s.decisions.at(-1)!.req;
    expect(dpDecision).toMatchObject({
      sourceCardId: "EX3-068",
      kind: "chooseTargets",
      options: {
        candidateInstanceIds: [s.perm("target").permanentId, s.perm("untouched").permanentId],
        min: 1,
        max: 1,
        timing: "Main",
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: dpDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("target").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional" && s.decisions.length >= 2);
    const optional = s.decisions.at(-1)!.req;
    expect(optional).toMatchObject({ sourceCardId: "EX3-068", kind: "optional", options: { timing: "Main" } });
    expect(optional.options?.effectText).toContain("you may return 1 card with the [Four Great Dragons] trait");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards" && s.decisions.length >= 3);
    const selection = s.decisions.at(-1)!.req;
    expect(selection).toMatchObject({
      sourceCardId: "EX3-068",
      kind: "selectCards",
      options: {
        candidateInstanceIds: [s.inst("azulongmon").instanceId, s.inst("trial").instanceId],
        visibleInstanceIds: [
          s.inst("azulongmon").instanceId,
          s.inst("trial").instanceId,
          s.inst("unrelated").instanceId,
        ],
        min: 1,
        max: 1,
        timing: "Main",
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("trial").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("trial").instanceId));

    expect(s.perm("target").currentDP).toBe(1000);
    expect(s.perm("untouched").currentDP).toBe(8000);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("azulongmon").instanceId, s.inst("unrelated").instanceId]),
    );
    assertNoLoudGap(s);
  });

  it("honors the errata's may and leaves the Four Great Dragons card in trash when declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-034", as: "yellowSource" }],
          hand: [{ card: "EX3-068", as: "godFlame" }],
          trash: [{ card: "EX3-036", as: "magnadramon" }],
        },
        1: { battleArea: [{ card: "BT1-010", dp: 7000, as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("godFlame").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some(({ req }) => req.sourceCardId === "EX3-068" && req.kind === "optional"));

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("magnadramon").instanceId);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-068" && req.kind === "selectCards")).toHaveLength(
      0,
    );
    assertNoLoudGap(s);
  });

  it("skips the optional recovery cleanly when trash has no Four Great Dragons card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-034", as: "yellowSource" }],
          hand: [{ card: "EX3-068", as: "godFlame" }],
          trash: [{ card: "BT1-010", as: "unrelated" }],
        },
        1: { battleArea: [{ card: "BT1-011", dp: 7000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("godFlame").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 1000);

    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-068" && req.kind === "optional")).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("unrelated").instanceId);
    assertNoLoudGap(s);
  });

  it("does not satisfy its yellow color requirement without an own yellow Digimon or Tamer", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX3-068", as: "godFlame" }] } });
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("godFlame").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });

  it("Security activates the same Main sequence without paying cost or meeting color", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          security: [{ card: "EX3-068", faceUp: true, as: "securityGodFlame" }],
          trash: [{ card: "EX3-064", as: "megidramon" }],
        },
        1: { battleArea: [{ card: "BT1-010", dp: 7000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId, s.inst("megidramon").instanceId);
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityGodFlame"));

    expect(s.perm("target").currentDP).toBe(1000);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("megidramon").instanceId);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });
});
