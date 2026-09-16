import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
import "./BT19-068.js";

const inertDeck = ["BT1-009", "BT1-013", "BT1-012", "BT1-014"];
const inertSecurity = ["BT1-009", "BT1-013", "BT1-012"];

describe("BT19-068 Shademon", () => {
  it("matches the catalog printing, evolution costs and lack of an inherited effect", () => {
    expect(getCardDefinition("BT19-068")).toMatchObject({
      cardId: "BT19-068",
      nameEn: "Shademon",
      colors: ["Purple", "Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 4000,
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Unidentified", "Twilight", "Composite"],
      evoCosts: [
        { color: "Purple", level: 3, memoryCost: 3 },
        { color: "Black", level: 3, memoryCost: 3 },
      ],
    });
    expect(getCardDefinition("BT19-068")!.inheritedEffectText ?? "").toBe("");
    const printed = getCardDefinition("BT19-068")!.effectText!;
    expect(printed).toContain(
      "[On Play] Reveal the top 3 cards of your deck. Add 1 card with the [Twilight]/[Composite]\u00A0trait among them to the hand. Trash the rest.",
    );
    expect(printed).toContain(
      "[On Deletion] You may play 1 [Nene Amano] from your trash without paying the cost. Then, ＜Save＞",
    );
    expect(printed).toContain("[Rule] Trait: Has [Composite] type.");
    expect(printed).toContain("[DigiXros\u00A0-2] [Nene Amano]");
  });

  it("compiles the reveal, the ＜Save＞ keyword, the [Rule] trait and the capped DigiXros recipe", () => {
    const card = runtimeCompiledCard("BT19-068");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 3,
            rest: "trash",
            add: [
              {
                count: 1,
                to: "hand",
                filter: { nameOrTrait: [{ tokens: ["Twilight", "Composite"], match: "trait" }] },
              },
            ],
          },
        ],
      },
      {
        trigger: "OnDeletion",
        keywords: [{ keyword: "Save" }],
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["trash"],
            payCost: false,
            optional: true,
            target: { count: 1, filter: { nameOrTrait: [{ tokens: ["Nene Amano"], match: "nameExact" }] } },
          },
          {
            kind: "PlaceUnder",
            position: "bottom",
            optional: true,
            target: { isSelf: true, filter: { isSelfRef: true } },
            underFilter: { controller: "mine", kind: ["Tamer"], excludeToken: true },
          },
        ],
      },
      { trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Composite"] }] },
    ]);
    expect(card?.digiXrosRequirement).toEqual([{ materials: [{ names: ["Nene Amano"] }], count: 2, maxMaterials: 1 }]);
  });

  it("[On Play] adds the [Composite] card and trashes the other two revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-068", as: "shademon" },
            { card: "BT1-012", as: "spare" },
          ],
          deck: [
            { card: "BT1-009", as: "revealA" },
            { card: "BT19-069", as: "composite" },
            { card: "BT1-013", as: "revealB" },
            { card: "BT1-014", as: "untouched" },
          ],
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shademon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length === 2);
    await settle();

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-068"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("spare").instanceId, s.inst("composite").instanceId].sort(),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("revealA").instanceId, s.inst("revealB").instanceId].sort(),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("untouched").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[On Play] accepts the [Twilight] arm, including a non-Digimon card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-068", as: "shademon" },
            { card: "BT1-012", as: "spare" },
          ],
          deck: [
            { card: "BT1-009", as: "revealA" },
            { card: "BT1-013", as: "revealB" },
            { card: "BT10-092", as: "twilight" },
            { card: "BT1-014", as: "untouched" },
          ],
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shademon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length === 2);
    await settle();

    expect(s.state.players[0]!.hand.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("spare").instanceId, s.inst("twilight").instanceId].sort(),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("revealA").instanceId, s.inst("revealB").instanceId].sort(),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("untouched").instanceId]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[On Play] trashes all 3 when none of them carries [Twilight] or [Composite]", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-068", as: "shademon" },
            { card: "BT1-012", as: "spare" },
          ],
          deck: [
            { card: "BT1-009", as: "revealA" },
            { card: "BT1-013", as: "revealB" },
            { card: "BT1-014", as: "revealC" },
            { card: "BT1-012", as: "untouched" },
          ],
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shademon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length === 3);
    await settle();

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("spare").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("revealA").instanceId, s.inst("revealB").instanceId, s.inst("revealC").instanceId].sort(),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("untouched").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q3130: plays the Tamer from trash and ＜Save＞s itself under that very Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-068", as: "shademon" }],
          trash: [{ card: "BT19-087", as: "nene" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "wall", dp: 20_000, suspended: true }],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    const shademonId = s.inst("shademon").instanceId;
    const neneId = s.inst("nene").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("shademon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-087"));
    await settle();

    const tamer = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === neneId);
    expect(tamer).toBeDefined();
    expect(tamer!.stack.map((card) => card.instanceId)).toEqual([shademonId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("＜Save＞ places the card at the BOTTOM of a Tamer that already has cards under it (CR 4-3-2)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-068", as: "shademon" },
            { card: "BT10-092", as: "tamer", under: [{ card: "BT1-009", as: "existing" }] },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "wall", dp: 20_000, suspended: true }],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    const shademonId = s.inst("shademon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("shademon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length === 2);
    await settle();

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([shademonId, s.inst("existing").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not play the near-miss Tamer whose name merely CONTAINS [Nene Amano]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-068", as: "shademon" },
            { card: "BT19-081", as: "tamer" },
          ],
          trash: [{ card: "EX10-064", as: "yuuAndNene" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "wall", dp: 20_000, suspended: true }],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    const shademonId = s.inst("shademon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("shademon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length === 1);
    await settle();

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("yuuAndNene").instanceId]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-081"]);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([shademonId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("picks the exact [Nene Amano] out of a trash that also holds the near-miss peer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-068", as: "shademon" }],
          trash: [
            { card: "EX10-064", as: "yuuAndNene" },
            { card: "BT19-087", as: "nene" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "wall", dp: 20_000, suspended: true }],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("shademon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await settle();

    expect(s.state.players[0]!.battleArea[0]!.topCard?.instanceId).toBe(s.inst("nene").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("yuuAndNene").instanceId]);
  });

  it("declining both halves leaves Shademon in the trash and the Tamer unplayed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-068", as: "shademon" },
            { card: "BT19-081", as: "tamer" },
          ],
          trash: [{ card: "BT19-087", as: "nene" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "wall", dp: 20_000, suspended: true }],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    const shademonId = s.inst("shademon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("shademon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === shademonId));
    await settle();

    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [shademonId, s.inst("nene").instanceId].sort(),
    );
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("DigiXroses for 3 by placing the exact [Nene Amano] from hand under it", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-068", as: "shademon" },
            { card: "BT19-087", as: "nene" },
          ],
          deck: [
            { card: "BT1-009", as: "revealA" },
            { card: "BT19-069", as: "composite" },
            { card: "BT1-013", as: "revealB" },
            { card: "BT1-014", as: "untouched" },
          ],
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;
    const neneId = s.inst("nene").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("shademon").instanceId,
        digiXros: { materialInstanceIds: [neneId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 2);
    await settle();

    expect(s.state.memory).toBe(5);
    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT19-068");
    expect(played?.stack.map((card) => card.instanceId)).toEqual([neneId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("composite").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("untouched").instanceId]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("refuses the near-miss Tamer as a DigiXros material and refuses a second [Nene Amano]", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-068", as: "shademon" },
            { card: "BT19-087", as: "nene" },
            { card: "BT10-092", as: "otherNene" },
            { card: "EX10-064", as: "yuuAndNene" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("shademon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("yuuAndNene").instanceId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("shademon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("nene").instanceId, s.inst("otherNene").instanceId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });

    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(4);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("digivolves from a Purple/Black Lv.3 for 3 and refuses a Red Lv.3 source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-066", as: "gizamon" },
            { card: "BT1-009", as: "monodramon" },
          ],
          hand: [{ card: "BT19-068", as: "shademon" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("monodramon").permanentId,
        instanceId: s.inst("shademon").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.perm("monodramon").topCard?.cardId).toBe("BT1-009");
    expect(s.state.memory).toBe(10);

    const gizamonId = s.inst("gizamon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gizamon").permanentId,
        instanceId: s.inst("shademon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gizamon").topCard?.cardId === "BT19-068");
    await settle();

    expect(s.state.memory).toBe(7);
    expect(s.perm("gizamon").stack.map((card) => card.instanceId)).toEqual([gizamonId]);
  });

  it("[Rule] [Composite] is real to another card: Kimeramon takes its Lv.4 [Composite] route for 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-068", as: "shademon" },
            { card: "BT1-014", as: "plainLv4" },
          ],
          hand: [
            { card: "BT19-070", as: "kimeramonA" },
            { card: "BT19-070", as: "kimeramonB" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("shademon").permanentId,
        instanceId: s.inst("kimeramonA").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("shademon").topCard?.cardId === "BT19-070");
    await settle();
    expect(s.state.memory).toBe(7);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("plainLv4").permanentId,
        instanceId: s.inst("kimeramonB").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("plainLv4").topCard?.cardId === "BT19-070");
    await settle();
    expect(s.state.memory).toBe(3);
  });
});
