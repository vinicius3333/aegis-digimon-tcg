import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle } from "../../engine/testkit/harness.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT25-077.js";

const LOW = "BT1-009";
const HIGH = "BT1-019";
const TARGET = "BT25-078";
const CEILING_TS = "BT25-071";
const OVER_CEILING_TS = "BT25-073";
const CARD_ID = "BT25-077";

describe("BT25-077 Bacchusmon", () => {
  it("matches every printed catalog field and alternate TS evolution requirement", () => {
    const card = getCardDefinition("BT25-077");
    expect(card).toBeDefined();
    if (card === undefined) return;
    expect(card).toMatchObject({
      nameEn: "Bacchusmon",
      colors: ["Black", "Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Black", level: 5, memoryCost: 4 },
        { color: "Green", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Shaman", "Olympos XII", "Iliad", "TS"],
      maxCountInDeck: 4,
    });
    expect(card.effectText).toBeDefined();
    if (card.effectText === undefined) return;
    expect(card.effectText.replace(/\u00a0/g, " ")).toContain("[Digivolve] Lv.5 w/[TS] trait: Cost 3");
  });

  it.each([
    ["black", "BT10-064"],
    ["green", "BT1-075"],
  ] as const)("uses the ordinary %s Lv5 evolution at exact cost 4", async (_color, source) => {
    const s = setupEngine({
      0: { battleArea: [{ card: source, as: "base" }], hand: [{ card: CARD_ID, as: "bacchusmon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("bacchusmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === CARD_ID);
    expect(s.state.memory).toBe(1);
    expect(s.perm("base").topCard?.cardId).toBe(CARD_ID);
  });

  it("rejects a red Lv5 source on the ordinary route", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-002", as: "base" }], hand: [{ card: CARD_ID, as: "bacchusmon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("bacchusmon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain(CARD_ID);
  });

  it("uses the TS Lv5 alternate for cost 3 and rejects a non-TS explicit route", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-073", as: "tsBase" }], hand: [{ card: CARD_ID, as: "bacchusmon" }] },
    });
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsBase").permanentId,
        instanceId: s.inst("bacchusmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 2,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tsBase").topCard.cardId === CARD_ID);
    expect(s.state.memory).toBe(1);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT10-064", as: "nonTsBase" }], hand: [{ card: CARD_ID, as: "bacchusmon" }] },
    });
    invalid.state.memory = 4;
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("nonTsBase").permanentId,
        instanceId: invalid.inst("bacchusmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 2,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(invalid.state.memory).toBe(4);
  });

  it("suspends one Digimon when any Digimon is manually played, including while Bacchusmon is suspended", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: TARGET, as: "played" }],
          battleArea: [{ card: "BT25-077", as: "bacchusmon", suspended: true }],
        },
        1: { battleArea: [{ card: HIGH, as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const playedId = s.inst("played").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: playedId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === playedId));
    await settle();

    expect(s.state.players[0]!.battleArea.some((p) => p.isSuspended)).toBe(true);
    expect(s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === playedId)?.isSuspended).toBe(false);
    expect(s.perm("opponent").isSuspended).toBe(false);
  });

  it("must delete the opponent's lowest-DP Digimon after an effect-play even when suspend is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: TARGET, as: "played" }],
          battleArea: [{ card: "BT25-077", as: "bacchusmon" }],
        },
        1: {
          battleArea: [
            { card: LOW, as: "lowest", dp: 3000 },
            { card: HIGH, as: "higher", dp: 7000 },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.playInstances([s.inst("played").instanceId], "BT25-077");

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === LOW)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === HIGH)).toBe(true);
    expect(s.perm("bacchusmon").isSuspended).toBe(false);
  });

  it("plays exactly one TS Digimon at the 6000-DP ceiling and excludes near-matches", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-077", as: "bacchusmon" },
            { card: CEILING_TS, as: "validTs" },
            { card: OVER_CEILING_TS, as: "overDpTs" },
            { card: LOW, as: "nonTs" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.playInstances([s.inst("bacchusmon").instanceId], "BT25-077");

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("validTs").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("overDpTs").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("nonTs").instanceId)).toBe(true);
  });

  it("reduces the hard-play cost by 5 at the exact 12-level threshold", async () => {
    const qualifying = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-077", as: "toPlay" }],
          battleArea: ["BT25-077", "BT25-077"],
        },
      },
      { autoDeclineOptional: true },
    );
    await qualifying.ready();
    qualifying.state.memory = -2;
    expect(
      qualifying.engine.applyIntent(0, { type: "playCard", instanceId: qualifying.inst("toPlay").instanceId }),
    ).toEqual({ ok: true });
    await settle(() =>
      qualifying.state.players[0]!.battleArea.some(
        (p) => p.topCard?.instanceId === qualifying.inst("toPlay").instanceId,
      ),
    );
    expect(qualifying.state.memory).toBe(-9);
  });

  it("shares the once-per-turn activation across play and digivolve events", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: TARGET, as: "manual" },
            { card: TARGET, as: "effect" },
          ],
          battleArea: [{ card: "BT25-077", as: "bacchusmon" }],
        },
        1: { battleArea: [{ card: LOW, as: "lowest", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("manual").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("manual").instanceId),
    );
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.isSuspended)).toBe(true);

    await advance(s.engine).verb.playInstances([s.inst("effect").instanceId], "BT25-077");
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === LOW)).toBe(true);
  });

  it("does not consume the once-per-turn limit when a non-effect event is declined, then deletes on an effect event", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: TARGET, as: "declined" },
            { card: TARGET, as: "effect" },
          ],
          battleArea: [{ card: "BT25-077", as: "bacchusmon" }],
        },
        1: { battleArea: [{ card: LOW, as: "lowest", dp: 3000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("declined").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("declined").instanceId),
    );
    await settle();
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === LOW)).toBe(true);

    await advance(s.engine).verb.playInstances([s.inst("effect").instanceId], "BT25-077");
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === LOW)).toBe(false);
  });

  it("fires on an effect digivolution into Bacchusmon, plays a TS Digimon, and deletes lowest DP", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-077", as: "bacchusmon" },
            { card: TARGET, as: "tsTarget" },
          ],
          battleArea: [{ card: "BT25-071", as: "base" }],
        },
        1: { battleArea: [{ card: LOW, as: "lowest", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.digivolveFromInstance(s.perm("base").permanentId, s.inst("bacchusmon").instanceId);
    await settle(() => s.perm("base").topCard?.cardId === "BT25-077");

    expect(s.perm("base").topCard?.cardId).toBe("BT25-077");
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("BT25-071");
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === TARGET)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === LOW)).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Rush")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Reboot")).toBe(false);
  });
});
