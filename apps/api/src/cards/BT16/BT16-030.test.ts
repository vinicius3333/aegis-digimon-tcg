import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-030.js";
import "../index.js";

describe("BT16-030", () => {
  it("matches the catalog identity and Nyaromon evolution route", () => {
    expect(getCardDefinition("BT16-030")).toMatchObject({
      nameEn: "Salamon",
      colors: ["Yellow", "Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Purple", level: 2, memoryCost: 1 },
        { color: "Red", level: 2, memoryCost: 1 },
      ],
      forms: ["Rookie"],
      types: ["Mammal"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Nyaromon"], cost: 0, isAlternate: true }]);
  });

  it("digivolves from trash at the start of the main phase or on play", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "Digivolve", from: ["trash"], reduceCost: 1, optional: true }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Digivolve", from: ["trash"], reduceCost: 1, optional: true }],
    });
  });

  it("reduces opposing security DP by 3000 as inherited", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifySecurityDP", amount: -3000, duration: "forTheTurn" }],
    });
  });

  it("digivolves the played Salamon into a legal level 4 from trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-030", as: "salamon" }],
          trash: [{ card: "BT16-031", as: "gatomon" }],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    // 3 to play Salamon, then Gatomon's cost 3 reduced by 1 for the trash digivolve.
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("salamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("salamon").topCard?.cardId === "BT16-031");

    expect(s.perm("salamon").topCard?.cardId).toBe("BT16-031");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT16-031")).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("does not ignore printed evolution requirements for a matching-trait card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-030", as: "salamon" }],
          trash: [{ card: "BT17-024", as: "illegal" }],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("salamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("salamon").topCard?.cardId === "BT16-030");

    expect(s.perm("salamon").topCard?.cardId).toBe("BT16-030");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT17-024")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("naturally digivolves an existing Salamon from trash at the start of the main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-030", as: "salamon" }],
          trash: [{ card: "BT16-031", as: "gatomon" }],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("salamon").topCard?.cardId === "BT16-031");

    expect(s.perm("salamon").topCard?.cardId).toBe("BT16-031");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT16-031")).toBe(false);
    expect(s.state.memory).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("changes opposing Security Digimon DP without changing battle-area DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT16-030", as: "host" },
          { card: "BT16-030", as: "source", under: ["BT16-030"] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).securityDp(1)).toBe(-3000);
    expect(s.perm("source").currentDP).toBe(1000);
  });
});
