import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-082.js";

describe("BT11-082 Tuwarmon", () => {
  it("maps catalog facts and every printed effect to IR", () => {
    expect(getCardDefinition("BT11-082")).toMatchObject({
      cardId: "BT11-082", colors: ["Purple", "Black"], level: 4, playCost: 7, dp: 6000, types: ["Mutant", "Bagra Army", "Twilight"],
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Decoy" }] },
      { trigger: "AllTurns", actions: [{ kind: "Restrict", restriction: "beDeleted" }] },
      { trigger: "OnDeletion", actions: [{ kind: "PlayWithoutCost", suspended: true }] },
      { trigger: "OpponentsTurn", isInherited: true, actions: [{ kind: "SubTrigger" }] },
    ]);
  });

  it("has Decoy and prevents own Yuu Amano from being deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-082", as: "tuwarmon" },
          { card: "BT12-094", as: "yuu" },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("tuwarmon"), "Decoy")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("yuu"), "beDeleted")).toBe(true);
  });

  it("digivolves from Damemon for the printed alternate cost of 1", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-075", as: "damemon" }],
        hand: [{ card: "BT11-082", as: "tuwarmon" }],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("damemon").permanentId,
        instanceId: s.inst("tuwarmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("damemon").topCard.cardId === "BT11-082");

    expect(s.state.memory).toBe(4);
  });

  it("uses Decoy to protect another Bagra Army Digimon from an opponent's deletion effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-082", as: "tuwarmon" },
            { card: "BT10-070", as: "bagra-army" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const tuwarmonId = s.perm("tuwarmon").permanentId;
    const protectedId = s.perm("bagra-army").permanentId;

    await advance(s.engine).verb.deletePermanent([protectedId], "byEffect");

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === protectedId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === tuwarmonId)).toBe(false);
  });

  it("plays Damemon from trash suspended on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-082", as: "tuwarmon" }],
          trash: [{ card: "BT10-075", as: "damemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("tuwarmon").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT10-075"));

    const playedDamemon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "BT10-075");
    expect(playedDamemon?.isSuspended).toBe(true);
  });

  it("gains 1 memory when inherited and trashed by an effect on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-081", as: "host", under: [{ card: "BT11-082", as: "source" }] }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.trashDigivolutionCards(s.perm("host").permanentId, [s.inst("source").instanceId], 1);
    await settle(() => s.state.memory === -1);

    expect(s.state.memory).toBe(-1);
  });
});
