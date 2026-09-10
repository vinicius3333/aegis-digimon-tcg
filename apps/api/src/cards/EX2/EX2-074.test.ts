import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX2-074.js";
import "./EX2-039.js";
import "./EX2-074.js";
import "./EX2-044.js";

const inertDeck = ["BT1-009", "BT1-010", "BT1-011", "BT1-012"];
const inertSecurity = ["BT1-013", "BT1-014"];

describe("EX2-074 Beelzemon: Blast Mode", () => {
  it("matches the catalog, Q3368, and typed IR", () => {
    expect(getCardDefinition("EX2-074")).toMatchObject({
      cardId: "EX2-074",
      nameEn: "Beelzemon: Blast Mode",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 15,
      dp: 15000,
      evoCosts: [{ color: "Purple", level: 6, memoryCost: 6 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Demon Lord"],
      rarity: "SEC",
      maxCountInDeck: 4,
      effectText:
        "When this card is trashed from your deck, delete 1 of your opponent's level 4 or lower Digimon.[When Digivolving] Delete all of your opponent's Digimon with the highest level.[Your Turn] For every 10 cards in your trash, this Digimon gains ＜Security Attack +1＞. (This Digimon checks 1 additional security card.)",
    });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "AllTurns",
          actions: [
            expect.objectContaining({
              kind: "SubTrigger",
              event: "whenTrashedFromDeck",
              sourceFilter: { isSelfRef: true },
              actions: [
                {
                  kind: "Delete",
                  target: {
                    filter: {
                      controller: "opponent",
                      kind: ["Digimon"],
                      levelComparison: { op: "lte", value: 4 },
                    },
                    count: 1,
                  },
                },
              ],
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "WhenDigivolving",
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestLevel" },
                count: "all",
              },
            },
          ],
        }),
        expect.objectContaining({
          trigger: "YourTurn",
          actions: [
            {
              kind: "GainKeyword",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
              duration: "permanent",
              scaling: { per: 10, filter: { zone: "trash", controller: "mine" }, unit: "trash" },
            },
          ],
        }),
      ]),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("deletes every opposing Digimon tied for highest level when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-044", as: "base" }], hand: [{ card: "EX2-074", as: "evolution" }] },
        1: { battleArea: ["EX2-029", "EX2-043", "EX2-019"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["EX2-019"]);
    expect(s.state.memory).toBe(4);
  });

  it("deletes 1 opposing level 4 or lower Digimon when directly trashed from the deck", async () => {
    const preferredTargets: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-044", as: "miller" }],
          deck: [{ card: "EX2-074", as: "trashedBlastMode" }, "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "EX2-021", as: "level4" },
            { card: "EX2-023", as: "level5" },
          ],
          security: ["BT1-013"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferredTargets,
      },
    );
    const preferredTarget = s.perm("level4").topCard.instanceId;
    preferredTargets.push(preferredTarget);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("miller").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).not.toContain(
      preferredTarget,
    );
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("EX2-023");
  });

  it("does not delete when EX2-074 is only revealed from the deck (Q3368)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-039", as: "revealer" }],
          deck: [
            { card: "EX2-074", as: "revealed" },
            { card: "BT1-009", as: "bottomOne" },
            { card: "BT1-010", as: "bottomTwo" },
            { card: "BT1-011", as: "bottomThree" },
            { card: "BT1-012", as: "tail" },
          ],
          security: inertSecurity,
        },
        1: { battleArea: [{ card: "EX2-021", as: "target" }], deck: inertDeck, security: inertSecurity },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("revealer").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX2-039") &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("revealed").instanceId),
    );
    expect(s.state.memory).toBe(7);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("EX2-021");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("revealed").instanceId);
  });

  it("gains Security Attack +1 for each complete 10 cards in its trash", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-074", as: "blastMode" }],
        trash: Array.from({ length: 20 }, () => "BT1-009"),
      },
    });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("blastMode"), "SecurityAttack")).toBe(2);
  });

  it("uses the ten-card floor and does not apply the bonus during the opponent's turn", async () => {
    const below = setupEngine({
      0: { battleArea: [{ card: "EX2-074", as: "nine" }], trash: Array.from({ length: 9 }, () => "BT1-009") },
    });
    await below.ready();
    expect(observe(below.engine).keywordAmount(below.perm("nine"), "SecurityAttack")).toBe(0);

    const at = setupEngine({
      0: { battleArea: [{ card: "EX2-074", as: "ten" }], trash: Array.from({ length: 10 }, () => "BT1-009") },
    });
    await at.ready();
    expect(observe(at.engine).keywordAmount(at.perm("ten"), "SecurityAttack")).toBe(1);

    const opponentTurn = setupEngine({
      0: { battleArea: [{ card: "EX2-074", as: "opponentTurn" }], trash: Array.from({ length: 20 }, () => "BT1-009") },
      1: { deck: ["BT1-010"] },
    });
    opponentTurn.state.turnSeat = 1;
    await opponentTurn.ready();
    expect(observe(opponentTurn.engine).keywordAmount(opponentTurn.perm("opponentTurn"), "SecurityAttack")).toBe(0);
  });
});
