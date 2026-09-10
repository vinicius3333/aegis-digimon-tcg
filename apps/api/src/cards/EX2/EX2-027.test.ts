import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX2-027.js";
import "./EX2-027.js";
import "./EX2-029.js";
import "../ST4/ST4-15.js";

const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const INERT_SECURITY = ["BT1-009", "BT1-013"];

describe("EX2-027 Rapidmon", () => {
  it("matches the catalog and typed IR for both printed clauses", () => {
    expect(getCardDefinition("EX2-027")).toMatchObject({
      cardId: "EX2-027",
      nameEn: "Rapidmon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 7000,
      evoCosts: [{ color: "Green", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Cyborg"],
      effectText: "[When Digivolving] If you have a green Tamer in play, suspend 1 of your opponent's Digimon.",
      inheritedEffectText:
        "[Your Turn][Once Per Turn] When an opponent's Digimon becomes suspended, this Digimon gains ＜Security Attack +1＞ for the turn. (This Digimon checks 1 additional security card.)",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            {
              kind: "Suspend",
              condition: {
                kind: "youHave",
                filter: {
                  zone: "battleArea",
                  controllerDefault: "mine",
                  kind: ["Tamer"],
                  colors: ["Green"],
                },
              },
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            },
          ],
        },
        {
          trigger: "YourTurn",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenSuspended",
              sourceFilter: { controller: "opponent", kind: ["Digimon"] },
              actions: [
                {
                  kind: "GainKeyword",
                  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                  keyword: { keyword: "SecurityAttack", amount: 1 },
                  duration: "forTheTurn",
                },
              ],
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("pays 3 to digivolve and suspends one opposing Digimon with a green Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          // Use an inert green Lv.4 source: EX2-026 has its own printed green-Tamer
          // evolution reduction, which would make this Rapidmon cost proof depend on
          // whether the full collection has loaded EX2-026's module yet.
          battleArea: [{ card: "BT1-071", as: "base" }, "EX2-061"],
          hand: [{ card: "EX2-027", as: "evolution" }],
          deck: [{ card: "BT1-009", as: "drawn" }, ...FILLER],
          security: INERT_SECURITY,
        },
        1: { battleArea: [{ card: "EX2-014", as: "target" }], deck: FILLER, security: INERT_SECURITY },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    const baseInstanceId = s.perm("base").topCard.instanceId;
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended && s.perm("base").topCard.cardId === "EX2-027");
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("does not suspend an opposing Digimon without a green Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-026", as: "base" }],
          hand: [{ card: "EX2-027", as: "evolution" }],
          deck: FILLER,
          security: INERT_SECURITY,
        },
        1: { battleArea: [{ card: "EX2-014", as: "target" }], deck: FILLER, security: INERT_SECURITY },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX2-027");
    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("gains inherited Security Attack +1 when an opponent's Digimon becomes suspended", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-029", as: "host", under: ["EX2-027"] }],
          hand: [
            { card: "ST4-15", as: "option1" },
            { card: "ST4-15", as: "option2" },
            { card: "ST4-15", as: "option3" },
          ],
          deck: FILLER,
          security: INERT_SECURITY,
        },
        1: {
          battleArea: [
            { card: "EX2-014", as: "target1" },
            { card: "EX2-014", as: "target2" },
            { card: "EX2-014", as: "target3" },
          ],
          deck: FILLER,
          security: INERT_SECURITY,
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    s.state.memory = 5;
    await s.ready();
    preferred.push(s.perm("target1").topCard.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option1").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack") === 1);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    preferred.length = 0;
    preferred.push(s.perm("target2").topCard.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target2").isSuspended);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
    preferred.length = 0;
    preferred.push(s.perm("target3").topCard.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option3").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.perm("target3").isSuspended && observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack") === 1,
    );
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("rejects evolution from a non-green source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-014", as: "blueSource" }],
        hand: [{ card: "EX2-027", as: "evolution" }],
        deck: FILLER,
        security: INERT_SECURITY,
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueSource").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toMatchObject({ ok: false });
  });
});
