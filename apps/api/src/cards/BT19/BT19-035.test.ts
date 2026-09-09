import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

// Inert main-deck Digimon (no printed or inherited text): no Digi-Egg may sit in the deck
// or security, and the numeric `security: n` form is forbidden.
const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-013", "BT1-009"];

describe("BT19-035 ShootingStarmon", () => {
  it("matches the catalog print", () => {
    expect(getCardDefinition("BT19-035")).toMatchObject({
      cardId: "BT19-035",
      nameEn: "ShootingStarmon",
      colors: ["Yellow", "Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Super Major", "Xros Heart"],
      evoCosts: [
        { color: "Yellow", level: 3, memoryCost: 3 },
        { color: "Red", level: 3, memoryCost: 3 },
      ],
    });
    expect(digivolutionRequirementsFor("BT19-035")).toContainEqual({
      level: 3,
      traits: ["Xros Heart"],
      cost: 2,
      isAlternate: true,
    });
  });

  it("takes the Cost 2 alternate route only from a Lv3 with the [Xros Heart] trait", async () => {
    const xros = setupEngine({
      0: {
        battleArea: [{ card: "BT10-029", as: "base" }],
        hand: [{ card: "BT19-035", as: "shooting" }],
        deck: [{ card: "BT1-009", as: "drawn" }, ...FILLER],
        security: [...SECURITY],
      },
      1: { battleArea: [{ card: "BT9-035", as: "peer" }], security: [...SECURITY], deck: [...FILLER] },
    });
    xros.state.memory = 6;
    await xros.ready();
    expect(
      xros.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: xros.perm("base").permanentId,
        instanceId: xros.inst("shooting").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => xros.perm("base").topCard?.cardId === "BT19-035");
    // Only the memory delta discriminates the route: 2, not the printed Yellow Lv3 cost of 3.
    expect(xros.state.memory).toBe(4);
    expect(xros.perm("base").stack.map((card) => card.cardId)).toEqual(["BT10-029"]);
    expect(xros.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([xros.inst("drawn").instanceId]);
    // Digivolving is not "played": the [All Turns] watcher stays quiet.
    expect(xros.perm("peer").currentDP).toBe(6000);
    expect(observe(xros.engine).keywordAmount(xros.perm("peer"), "SecurityAttack")).toBe(0);

    // A yellow Lv3 WITHOUT the trait falls back to the normal route and pays 3.
    const plain = setupEngine({
      0: {
        battleArea: [{ card: "BT1-050", as: "base" }],
        hand: [{ card: "BT19-035", as: "shooting" }],
        deck: [{ card: "BT1-009", as: "drawn" }, ...FILLER],
        security: [...SECURITY],
      },
      1: { security: [...SECURITY], deck: [...FILLER] },
    });
    plain.state.memory = 6;
    await plain.ready();
    expect(
      plain.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: plain.perm("base").permanentId,
        instanceId: plain.inst("shooting").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => plain.perm("base").topCard?.cardId === "BT19-035");
    expect(plain.state.memory).toBe(3);
  });

  it("refuses an illegal evolution source (a Lv4 and a blue Lv3)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT9-035", as: "lv4" },
          { card: "BT1-030", as: "blueLv3" },
        ],
        hand: [{ card: "BT19-035", as: "shooting" }],
        deck: [...FILLER],
        security: [...SECURITY],
      },
      1: { security: [...SECURITY], deck: [...FILLER] },
    });
    s.state.memory = 6;
    await s.ready();
    for (const alias of ["lv4", "blueLv3"]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm(alias).permanentId,
          instanceId: s.inst("shooting").instanceId,
        }),
      ).toEqual({ ok: false, reason: "invalid-evolution" });
    }
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("triggers on its own play, hits one opponent, and is once per turn (Q3090)", async () => {
    const pinned: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-035", as: "shooting" },
            { card: "BT19-033", as: "secondXros" },
          ],
          deck: [...FILLER, ...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [
            { card: "BT9-035", as: "target" },
            { card: "BT1-013", as: "bystander" },
          ],
          security: [...SECURITY],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: pinned },
    );
    pinned.push(s.perm("target").topCard!.instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shooting").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 3000);
    await settle();
    expect(s.perm("target").currentDP).toBe(3000);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
    expect(s.perm("bystander").currentDP).toBe(5000);
    expect(observe(s.engine).keywordAmount(s.perm("bystander"), "SecurityAttack")).toBe(0);

    // [Once Per Turn]: a second [Xros Heart] Digimon played this turn adds nothing.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondXros").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-033"));
    await settle();
    expect(s.perm("target").currentDP).toBe(3000);
    expect(s.perm("bystander").currentDP).toBe(5000);
    expect(observe(s.engine).keywordAmount(s.perm("bystander"), "SecurityAttack")).toBe(0);
  });

  it("ignores a played Digimon without the exact [Xros Heart] trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-035", as: "watcher" }],
          // BT9-035 Starmon is the near miss: a yellow Digimon whose name looks the part but
          // whose only trait is [Mutant].
          hand: [{ card: "BT9-035", as: "nearMiss" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { battleArea: [{ card: "BT1-013", as: "target" }], security: [...SECURITY], deck: [...FILLER] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nearMiss").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT9-035"));
    await settle();
    expect(s.perm("target").currentDP).toBe(5000);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
  });

  it("keeps the debuff through the whole opponent turn and drops it afterwards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-035", as: "watcher" }],
          hand: [
            { card: "BT19-033", as: "xros" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [...FILLER, ...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT9-035", as: "target" }],
          security: [...SECURITY],
          deck: [...FILLER, ...FILLER],
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("xros").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    // Still in force for the whole of the opponent's turn.
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.perm("target").currentDP).toBe(3000);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    // Gone once that turn ended.
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.perm("target").currentDP).toBe(6000);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("On Deletion places the chosen [Xros Heart] card from hand under a Tamer, not the near miss", async () => {
    const pinned: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-035", as: "shooting" },
            { card: "BT19-083", as: "tamer" },
          ],
          hand: [
            { card: "BT9-035", as: "nearMiss" },
            { card: "BT19-033", as: "candidate" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT9-035", as: "blocker", dp: 7000, suspended: true }],
          security: [...SECURITY],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: pinned },
    );
    pinned.push(s.inst("candidate").instanceId);
    s.state.memory = 5;
    await s.ready();

    // A real battle deletes ShootingStarmon: 5000 DP into a 7000 DP suspended defender.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("shooting").permanentId,
        target: { kind: "permanent", permanentId: s.perm("blocker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length === 1);
    await settle();

    // Pinned by instance id: ShootingStarmon itself is now in the trash and also carries the
    // [Xros Heart] trait, so an unpinned assertion would prove nothing.
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("candidate").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("nearMiss").instanceId]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT19-035")).toBe(true);
  });

  it("On Deletion can take the card from the trash instead", async () => {
    const pinned: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-035", as: "shooting" },
            { card: "BT19-083", as: "tamer" },
          ],
          trash: [
            { card: "BT9-035", as: "nearMiss" },
            { card: "BT19-025", as: "blueFlare" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT9-035", as: "blocker", dp: 7000, suspended: true }],
          security: [...SECURITY],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: pinned },
    );
    pinned.push(s.inst("blueFlare").instanceId);
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("shooting").permanentId,
        target: { kind: "permanent", permanentId: s.perm("blocker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length === 1);
    await settle();

    // The [Blue Flare] half of the printed filter, chosen over the [Mutant] near miss.
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("blueFlare").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("nearMiss").instanceId);
  });

  it("counts as [Starmons] for a DigiXros, while a real [Starmon] does not (Q3089)", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT10-013", as: "x5" },
          { card: "BT19-035", as: "shooting" },
          { card: "BT10-008", as: "shoutmon" },
          { card: "BT9-035", as: "nearMiss" },
        ],
        deck: [...FILLER, ...FILLER],
        security: [...SECURITY],
      },
      1: { security: [...SECURITY], deck: [...FILLER] },
    });
    s.state.memory = 10;
    await s.ready();

    // The near miss: [Starmon] is not [Starmons], so it fills no slot.
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("x5").instanceId,
        digiXros: { materialInstanceIds: [s.inst("nearMiss").instanceId, s.inst("shoutmon").instanceId] },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("x5").instanceId,
        digiXros: { materialInstanceIds: [s.inst("shooting").instanceId, s.inst("shoutmon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT10-013"));

    expect(s.state.memory).toBe(4); // 10 printed, -2 per placed material
    expect(
      s
        .perm("x5")
        .stack.map((card) => card.instanceId)
        .sort(),
    ).toEqual([s.inst("shooting").instanceId, s.inst("shoutmon").instanceId].sort());
  });

  it("cannot be saved by ＜Material Save＞ from its DigiXros host's stack (Q3089)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-013", as: "x5", under: ["BT19-035", "BT10-008"] },
            { card: "BT19-083", as: "tamer" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
          hand: [{ card: "BT1-009", as: "spare" }],
        },
        1: {
          battleArea: [{ card: "BT9-035", as: "blocker", dp: 15_000, suspended: true }],
          security: [...SECURITY],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("x5").permanentId,
        target: { kind: "permanent", permanentId: s.perm("blocker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT10-013"));
    await settle();

    // Only the real [Shoutmon] is one of the host's specified DigiXros cards; ShootingStarmon
    // is treated as [Starmons] for a DigiXros ONLY, so it goes to the trash.
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT10-008"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT19-035");
  });

  it("inherited attack reduction needs an [Xros Heart] host and fires on a real attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-038", as: "host", under: ["BT19-035"] }],
          deck: [...FILLER],
          security: [...SECURITY],
          hand: [{ card: "BT1-009", as: "spare" }],
        },
        1: { battleArea: [{ card: "BT9-035", as: "target" }], security: [...SECURITY], deck: [...FILLER] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4000);
    expect(s.perm("target").currentDP).toBe(4000);

    // A host without the [Xros Heart] trait leaves the opponent alone.
    const negative = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-057", as: "host", under: ["BT19-035"] }],
          deck: [...FILLER],
          security: [...SECURITY],
          hand: [{ card: "BT1-009", as: "spare" }],
        },
        1: { battleArea: [{ card: "BT9-035", as: "target" }], security: [...SECURITY], deck: [...FILLER] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    negative.state.memory = 5;
    await negative.ready();
    expect(
      negative.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: negative.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => negative.perm("host").isSuspended);
    await settle();
    expect(negative.perm("target").currentDP).toBe(6000);
  });
});
