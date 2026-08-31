import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-027.js";

describe("BT23-027 Angemon", () => {
  it("draws first, then DNA evolves itself and another Digimon into an unsuspended Shakkoumon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-027", as: "angemon" },
            { card: "BT23-050", as: "other", suspended: true },
          ],
          hand: [{ card: "BT23-032", as: "shakkoumon" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const drawnId = s.inst("drawn").instanceId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("angemon"));

    const result = s.state.players[0]!.battleArea.find((card) => card.topCard?.cardId === "BT23-032");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === drawnId)).toBe(true);
    expect(result).toBeDefined();
    expect(result?.isSuspended).toBe(false);
    expect(result?.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT23-027", "BT23-050"]));
  });

  it("does not DNA digivolve an Angemon played under a digivolution restriction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-018", as: "host", under: ["BT23-017"] }],
          hand: [
            { card: "BT23-027", as: "angemon" },
            { card: "BT23-032", as: "shakkoumon" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle();
    const angemon = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === s.inst("angemon").instanceId,
    );
    expect(angemon).toBeDefined();
    expect(observe(s.engine).isRestricted(angemon!, "digivolve")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("shakkoumon").instanceId);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("shakkoumon").instanceId,
      ),
    ).toBe(false);
  });

  it("declares Barrier", () => {
    expect(getCardDefinition("BT23-027")).toMatchObject({
      cardId: "BT23-027",
      nameEn: "Angemon",
      colors: ["Yellow", "Blue"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [
        { color: "Yellow", level: 3, memoryCost: 3 },
        { color: "Black", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Angel", "Hudie", "CS"],
    });
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static") as any;
    expect(staticEffect.keywords).toEqual([{ keyword: "Barrier", raw: "＜Barrier＞" }]);
  });

  it("draws one, then may DNA digivolve two of your Digimon into Shakkoumon on your turn", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions;
      expect(actions[0]).toEqual({ kind: "Draw", controller: "mine", amount: 1 });
      expect(actions[1]).toMatchObject({
        kind: "DnaDigivolve",
        materials: { filter: { controller: "mine", kind: ["Digimon"] }, count: 2 },
        into: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Shakkoumon"], match: "name" }] },
        from: ["hand"],
        payCost: true,
        condition: { kind: "isYourTurn" },
        optional: true,
      });
    }
  });

  it("declares inherited Barrier", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Barrier" }],
    });
  });

  it("exposes Barrier both directly and from a realistic evolution stack", async () => {
    const direct = setupEngine({ 0: { battleArea: [{ card: "BT23-027", as: "angemon" }] } });
    await direct.ready();
    expect(observe(direct.engine).hasKeyword(direct.perm("angemon"), "Barrier")).toBe(true);

    const inherited = setupEngine({ 0: { battleArea: [{ card: "BT23-032", as: "host", under: ["BT23-027"] }] } });
    await inherited.ready();
    expect(observe(inherited.engine).hasKeyword(inherited.perm("host"), "Barrier")).toBe(true);
  });

  it("draws but does not offer DNA digivolution on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-027", as: "angemon" },
            { card: "BT23-050", as: "other" },
          ],
          hand: [{ card: "BT23-032", as: "shakkoumon" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("angemon"));
    await settle();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("shakkoumon").instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });
});
