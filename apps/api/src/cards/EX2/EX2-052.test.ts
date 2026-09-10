import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX2-052.js";
import "./EX2-052.js";
import "./EX2-007.js";

const inertDeck = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const inertSecurity = ["BT1-009", "BT1-013", "BT1-009"];

describe("EX2-052 ADR-06 Horn Striker", () => {
  it("matches the catalog and compiled conditional Rush aura", () => {
    expect(getCardDefinition("EX2-052")).toMatchObject({
      cardId: "EX2-052",
      nameEn: "ADR-06 Horn Striker",
      colors: ["White"],
      kinds: ["Digimon"],
      playCost: 7,
      dp: 7000,
      evoCosts: [],
      forms: ["D-Reaper"],
      types: ["Commander Agent"],
      rarity: "C",
      maxCountInDeck: 4,
      effectText:
        "[Your Turn] While you have a [Mother D-Reaper] in play, this Digimon gains ＜Rush＞. (This Digimon can attack the turn it comes into play.)",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "Aura",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              effect: { kind: "keyword", keyword: { keyword: "Rush", raw: "＜Rush＞" } },
              while: {
                kind: "youHave",
                filter: {
                  zone: "battleArea",
                  controllerDefault: "mine",
                  nameOrTrait: [{ tokens: ["Mother D-Reaper"], match: "name" }],
                },
              },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("has Rush during its turn while Mother D-Reaper is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-052", as: "striker" }, "EX2-007"],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("striker"), "Rush")).toBe(true);
  });

  it("can attack the player on the same turn it is played with Mother D-Reaper", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["EX2-007"],
        hand: [{ card: "EX2-052", as: "striker" }],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("striker").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("striker").instanceId),
    );
    expect(observe(s.engine).hasKeyword(s.perm("striker"), "Rush")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("striker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("does not gain Rush without Mother D-Reaper and cannot attack that turn", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX2-052", as: "striker" }],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("striker").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("striker").instanceId),
    );
    expect(observe(s.engine).hasKeyword(s.perm("striker"), "Rush")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("striker").permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
  });

  it("does not gain Rush during the opponent's turn even while Mother D-Reaper is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["EX2-007", { card: "EX2-052", as: "striker" }],
        deck: inertDeck,
        security: inertSecurity,
      },
      1: { deck: inertDeck, security: inertSecurity },
    });
    s.state.memory = 10;
    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasKeyword(s.perm("striker"), "Rush")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });
});
