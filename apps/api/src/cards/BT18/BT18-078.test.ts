import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-078.js";

describe("BT18-078 Duskmon", () => {
  it("matches the catalog and full IR color-change, attack, inherited, and alternate-route contract", () => {
    expect(getCardDefinition("BT18-078")).toMatchObject({
      cardId: "BT18-078",
      nameEn: "Duskmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 6000,
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 3 }],
      forms: ["Hybrid"],
      attributes: ["Variable"],
      types: ["Wizard"],
      inheritedEffectText:
        "[On Deletion] You may play 1 Tamer card with a play cost of 4 or less from your trash without paying the cost.",
    });
    expect(compiled).toMatchObject({
      effects: [
        ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
          trigger,
          actions: [
            {
              kind: "GrantStatic",
              target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
              grant: { color: "otherThanWhite" },
              duration: "untilOpponentTurnEnd",
            },
          ],
        })),
        {
          trigger: "WhenAttacking",
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { controller: "mine", kind: ["Digimon", "Tamer"] }, count: 1 },
              into: { controllerDefault: "mine", levels: [4], nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] },
              from: ["trash"],
              payCost: true,
              reduceCost: 1,
              optional: true,
            },
          ],
        },
        {
          trigger: "OnDeletion",
          isInherited: true,
          actions: [
            {
              kind: "PlayWithoutCost",
              target: { filter: { controller: "mine", kind: ["Tamer"], playCostLte: 4 }, count: 1 },
              from: ["trash"],
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
      digivolutionRequirement: [
        { names: ["Koichi Kimura"], cost: 2, isAlternate: true },
        { names: ["Velgrmon"], cost: 1, isAlternate: true },
      ],
    });
  });

  it("naturally changes one opposing Digimon's original color on play until the opponent's turn ends", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-078", as: "duskmon" }] },
        1: { battleArea: [{ card: "BT1-032", as: "target" }] },
      },
      { autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("duskmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).effectiveColors(s.perm("target")).includes("Red"));
    const target = s.perm("target");

    expect(observe(s.engine).effectiveColors(target)).toEqual(["Red"]);
    expect(observe(s.engine).effectiveColors(target)).not.toContain("Blue");

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).effectiveColors(target)).toEqual(["Blue"]);
    expect(s.state.memory).toBe(-3);
    assertNoLoudGap(s);
  });

  it("naturally changes one opposing Tamer's original color on When Digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-075", as: "base" }], hand: [{ card: "BT18-078", as: "duskmon" }] },
        1: { battleArea: [{ card: "BT1-086", as: "target" }] },
      },
      { autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("duskmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT18-078");

    expect(observe(s.engine).effectiveColors(s.perm("target"))).toEqual(["Red"]);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("naturally digivolves a chosen own Tamer into a level-4 Hybrid from trash for one less memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-094", as: "koichi" },
            { card: "BT18-078", as: "duskmon" },
          ],
          trash: ["BT18-077"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("duskmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("koichi").topCard?.cardId === "BT18-077");

    expect(s.state.memory).toBe(8);
    expect(s.perm("koichi").stack.map(({ cardId }) => cardId)).toContain("BT18-094");
    expect(s.state.players[0]!.trash).not.toContainEqual(expect.objectContaining({ cardId: "BT18-077" }));
    assertNoLoudGap(s);
  });

  it("naturally plays an inherited-effect Tamer from trash when its host is deleted in battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-076", dp: 5000, suspended: true, under: ["BT18-078"], as: "host" }],
          trash: ["BT18-094"],
        },
        1: { battleArea: [{ card: "BT1-010", dp: 7000, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const hostId = s.perm("host").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-094"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-094")).toBe(true);
    expect(s.state.players[0]!.trash).not.toContainEqual(expect.objectContaining({ cardId: "BT18-094" }));
    assertNoLoudGap(s);
  });
});
