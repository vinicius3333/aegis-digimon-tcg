import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-085.js";
import "../BT14/BT14-062.js";
import "../BT19/BT19-077.js";
import "./BT17-010.js";
import "./BT17-080.js";
import { compiled } from "./BT17-008.js";

const guilmonHost = () => ({ card: "BT17-008", as: "guilmon", under: ["BT17-001"] });

describe("BT17-008", () => {
  it("matches the catalog printed text, stats and evolution costs", () => {
    const definition = getCardDefinition("BT17-008")!;
    expect(definition).toMatchObject({
      cardId: "BT17-008",
      nameEn: "Guilmon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      types: ["Reptile"],
      evoCosts: [{ color: "Red", level: 2, memoryCost: 0 }],
    });
    expect(definition.effectText).toBe(
      "[Your Turn] [Once Per Turn] When one of your [Calumon] or Tamers with [Takato Matsuki] in their name is played, delete 1 of your opponent's Digimon with 3000 DP or less. If this effect didn't delete, gain 1 memory.",
    );
    expect(definition.inheritedEffectText).toBe(
      "[All Turns] While you have 0 or less memory, add 2000 to this Digimon's DP-based deletion effects' maximums.",
    );
    expect(compiled.digivolutionRequirement).toBeUndefined();
  });

  it("compiles the played-trigger deletion and the inherited DP-maximum bonus", () => {
    // `[Calumon]` is a bracketed name with no "in name", so it is literal equality
    // (nameExact); "Tamers with [Takato Matsuki] in their name" stays substring (name).
    // "While YOU have 0 or less memory" is owner-relative, so the memory condition
    // carries controller "mine" rather than reading the raw turn-relative gauge.
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "YourTurn",
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenPlayed",
              sourceFilter: {
                controller: "mine",
                or: [
                  { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Calumon"], match: "nameExact" }] },
                  { kind: ["Tamer"], nameOrTrait: [{ tokens: ["Takato Matsuki"], match: "name" }] },
                ],
              },
              actions: [
                {
                  kind: "Delete",
                  target: {
                    filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } },
                    count: 1,
                  },
                },
                { kind: "GainMemory", amount: 1, condition: { kind: "ifThisEffectDidNotDelete" } },
              ],
            },
          ],
        },
        {
          trigger: "AllTurns",
          isInherited: true,
          actions: [
            {
              kind: "DeletionMaxDpModifier",
              amount: 2000,
              scope: "self",
              duration: "permanent",
              condition: { kind: "memoryAtMost", controller: "mine", value: 0 },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("deletes a 3000 DP Digimon when a Takato Matsuki Tamer is played, without gaining memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [guilmonHost()],
          hand: [
            { card: "BT17-080", as: "takato" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "boundaryTarget" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    const targetId = s.perm("boundaryTarget").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("takato").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    // Q2710: with a legal target the deletion is mandatory, so the "didn't delete"
    // memory gain never fires; 10 - 3 (Takato's play cost) = 7 and no +1.
    expect(s.state.memory).toBe(7);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([s.inst("boundaryTarget").instanceId]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual([
      "BT17-008",
      "BT17-080",
    ]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("spare").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
  });

  it("deletes when a Calumon Digimon is played and matches the exact printed name", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [guilmonHost()],
          hand: [
            { card: "BT19-077", as: "calumon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "boundaryTarget" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("calumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.memory).toBe(7);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual([
      "BT17-008",
      "BT19-077",
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("ignores a Tamer whose name is not Takato Matsuki", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [guilmonHost()],
          hand: [
            { card: "BT1-085", as: "tai" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "boundaryTarget" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tai").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    // Neither branch of the sourceFilter matches, so there is no deletion AND no memory
    // gain: 10 - 4 (Tai's play cost) = 6.
    expect(s.state.memory).toBe(6);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("gains 1 memory when the opponent has no Digimon at or below 3000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [guilmonHost()],
          hand: [
            { card: "BT17-080", as: "takato" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-014", as: "fourKTarget" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("takato").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 8);

    expect(s.state.memory).toBe(8);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.currentDP).toBe(4000);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("gains 1 memory when the only legal target cannot be deleted by opponent effects", async () => {
    // Q2711: a Digimon with "can't be deleted by your opponent's effects" is still a legal
    // choice, and choosing it leaves the effect having deleted nothing, so the memory
    // clause fires. BT14-062 carries that restriction; its DP is trimmed under the cap.
    const s = setupEngine(
      {
        0: {
          battleArea: [guilmonHost()],
          hand: [
            { card: "BT17-080", as: "takato" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT14-062", as: "immuneTarget", dp: 2000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("takato").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 8);

    expect(s.state.memory).toBe(8);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT14-062"]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("fires once per turn and resets on the next own turn through the real turn loop", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [guilmonHost()],
          hand: [
            { card: "BT17-080", as: "takato1" },
            { card: "BT17-080", as: "takato2" },
            { card: "BT17-080", as: "takato3" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstTarget" },
            { card: "BT1-009", as: "secondTarget" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    void s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("takato1").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    const memoryAfterFirst = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("takato2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === memoryAfterFirst - 3);

    // Second play in the same turn: the once-per-turn effect is spent, so neither the
    // deletion nor the "didn't delete" memory gain happens.
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(memoryAfterFirst - 3);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("takato3").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("raises Growlmon's 4000 DP deletion maximum to 6000 while its owner has 0 memory", async () => {
    // Q2712/Q2713: the inherited bonus reads the OWNER's gauge, and it lifts the printed
    // numeric maximum of the carrier's own DP-based deletion.
    const s = setupEngine(
      {
        0: {
          battleArea: [guilmonHost()],
          hand: [
            { card: "BT17-010", as: "growlmon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-011", "BT1-012"],
        },
        1: { battleArea: [{ card: "BT1-013", as: "fiveKTarget" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(s.perm("fiveKTarget").currentDP).toBe(5000);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("guilmon").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.memory).toBe(0);
    expect(s.perm("guilmon").topCard.cardId).toBe("BT17-010");
    expect(s.perm("guilmon").stack.map((card) => card.cardId)).toEqual(["BT17-001", "BT17-008"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-013"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("leaves Growlmon's maximum at 4000 while its owner still has positive memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [guilmonHost()],
          hand: [
            { card: "BT17-010", as: "growlmon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-011", "BT1-012"],
        },
        1: { battleArea: [{ card: "BT1-013", as: "fiveKTarget" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("guilmon").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("guilmon").topCard.cardId === "BT17-010");
    await settle(() => s.perm("guilmon").currentDP === 8000);

    // Memory 2 (> 0) keeps the maximum at the printed 4000, so the 5000 DP Digimon
    // survives and Growlmon takes its "didn't delete" +3000 DP instead.
    expect(s.state.memory).toBe(2);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("fiveKTarget").currentDP).toBe(5000);
    expect(s.perm("guilmon").currentDP).toBe(8000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves publicly from a red Lv2 egg for 0 memory and refuses an off-color Lv2 source", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT1-001", as: "yokomon" }, hand: [{ card: "BT17-008", as: "guilmonCard" }] },
    });
    s.state.memory = 0;
    await s.ready();
    const yokomonId = s.inst("yokomon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yokomon").permanentId,
        instanceId: s.inst("guilmonCard").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT17-008");

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.breeding?.stack.map((card) => card.instanceId)).toEqual([yokomonId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);

    const offColor = setupEngine({
      0: { breeding: { card: "BT1-003", as: "upamon" }, hand: [{ card: "BT17-008", as: "guilmonCard" }] },
    });
    offColor.state.memory = 0;
    await offColor.ready();

    expect(
      offColor.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: offColor.perm("upamon").permanentId,
        instanceId: offColor.inst("guilmonCard").instanceId,
      }).ok,
    ).toBe(false);
    expect(offColor.state.players[0]!.breeding?.topCard?.cardId).toBe("BT1-003");
    expect(offColor.state.players[0]!.hand).toHaveLength(1);
  });
});
