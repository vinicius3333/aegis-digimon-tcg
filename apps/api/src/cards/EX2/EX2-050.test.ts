import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX2-050.js";

const INERT_DECK = ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"];
const INERT_SECURITY = ["BT1-009", "BT1-013", "BT1-014"];

describe("EX2-050 ADR-05 Creep Hands", () => {
  it("matches the catalog and compiles the conditional Blocker aura", () => {
    expect(getCardDefinition("EX2-050")).toMatchObject({
      cardId: "EX2-050",
      nameEn: "ADR-05 Creep Hands",
      colors: ["White"],
      kinds: ["Digimon"],
      playCost: 5,
      dp: 6000,
      evoCosts: [],
      forms: ["D-Reaper"],
      types: ["Grappling Agent"],
      effectText:
        "[Opponent's Turn] While you have a [Mother D-Reaper] in play, this Digimon gains ＜Blocker＞. (When an opponent's Digimon attacks, you may suspend this Digimon to force the opponent to attack it instead.)",
    });
    const card = runtimeCompiledCard("EX2-050");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled).toEqual(card);
    expect(card?.effects).toMatchObject([
      {
        trigger: "OpponentsTurn",
        actions: [
          {
            kind: "Aura",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            effect: { kind: "keyword", keyword: { keyword: "Blocker", raw: "＜Blocker＞" } },
            while: {
              kind: "youHave",
              filter: {
                zone: "battleArea",
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["Mother D-Reaper"], match: "nameExact" }],
              },
            },
          },
        ],
      },
    ]);
  });

  it("gains Blocker during the opponent's turn while Mother D-Reaper is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-050", as: "creepHands" },
          { card: "EX2-007", as: "mother" },
        ],
        deck: INERT_DECK,
        security: INERT_SECURITY,
      },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }], deck: INERT_DECK, security: INERT_SECURITY },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("creepHands"), "Blocker")).toBe(false);

    const turnLoop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      advance(s.engine).endMainPhaseIfOpen(0);
      await advance(s.engine).waitForMainPhase(1);
      await settle(() => observe(s.engine).hasKeyword(s.perm("creepHands"), "Blocker"));
      expect(observe(s.engine).hasKeyword(s.perm("creepHands"), "Blocker")).toBe(true);
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
      expect(
        s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("creepHands").permanentId }),
      ).toEqual({
        ok: true,
      });
      await settle(() => !observe(s.engine).isAttacking());
      expect(s.perm("creepHands").isSuspended).toBe(true);
      expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(INERT_SECURITY);
    } finally {
      if (!s.state.gameOver) s.engine.applyIntent(1, { type: "surrender" });
      await turnLoop;
    }
  });

  it("does not gain Blocker without a Mother D-Reaper", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-050", as: "creepHands" }], deck: INERT_DECK, security: INERT_SECURITY },
      1: { deck: INERT_DECK, security: INERT_SECURITY },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("creepHands"), "Blocker")).toBe(false);
  });

  it("does not treat an opponent's Mother D-Reaper as yours", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-050", as: "creepHands" }], deck: INERT_DECK, security: INERT_SECURITY },
      1: { battleArea: [{ card: "EX2-007", as: "opponentMother" }], deck: INERT_DECK, security: INERT_SECURITY },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("creepHands"), "Blocker")).toBe(false);
  });

  it("loses the conditional Blocker during its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-050", as: "creepHands" },
          { card: "EX2-007", as: "mother" },
        ],
        deck: INERT_DECK,
        security: INERT_SECURITY,
      },
      1: { deck: INERT_DECK, security: INERT_SECURITY },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("creepHands"), "Blocker")).toBe(false);
  });
});
