/**
 * Special play and digivolution mechanics × the route that brings the card in.
 *
 * Each cell names the real card that takes the route and the card it brings in. "none printed"
 * means the rules allow the cell but no printed card takes that route (card-text scan of
 * packages/shared/src/cards/data/cards.json, 2026-09-23), so there is nothing to test. "n/a"
 * would mean a rule forbids the cell. The special digivolution rules restrict which effects
 * can perform the mechanic, not the zone containing the revealed card.
 *
 * | Mechanic \ route  | Hand (manual)                      | Effect from hand                         | Effect from trash                        | Effect from security                          | Effect from deck reveal                          |
 * | ----------------- | ---------------------------------- | ---------------------------------------- | ---------------------------------------- | --------------------------------------------- | ------------------------------------------------ |
 * | Assembly          | BT26-014 (BT26-013 material)       | EX12-072 [Security] -> EX12-064          | BT26-067 -> BT26-073                     | ST10-06 DNA -> EX12-064                       | EX12-058 -> EX12-064                             |
 * | DigiXros          | BT10-077 (BT10-076 material)       | BT21-021 [End of Attack] -> BT19-014     | BT10-084 -> BT10-077                     | ST10-06 DNA -> BT10-077                       | BT10-105 [Security] -> BT10-061                  |
 * | DNA digivolve     | EX13-045 over EX13-041 + EX13-021  | EX3-020 [End of Your Turn] -> EX3-074    | BT17-101 [Trash] -> itself             | none printed                                  | none printed                                     |
 * | App Fusion        | BT23-016 + BT23-039 -> BT23-021    | BT21-084 -> BT21-073                     | BT24-087 -> BT24-038                     | none printed                                  | none printed                                     |
 * | Burst digivolve   | BT13-018 -> BT13-020               | none printed                             | none printed                             | none printed                                  | none printed                                     |
 * | Alternate dv cost | BT10-024 -> EX4-051                | BT19-077 [Main] BT10-024 -> EX4-051      | BT13-085 -> BT26-082                     | BT16-024 -> EX6-028                           | BT24-060 -> BT20-080 (requirement, cost waived)  |
 *
 * DNA digivolution (§8-2-2-4), burst digivolve (§8-3-2-2) and App Fusion (§8-4-2-2)
 * can be performed by an effect only when that effect specifically performs that mechanic. Every
 * printed DNA effect targets a card in hand or trash. Every printed App Fusion effect targets
 * a card in hand, except BT24-087 (trash). No printed effect performs burst digivolve.
 */
import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../testkit/advance.js";
import { settle, setupEngine } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import { cite } from "./_kb.js";
import "../../cards/index.js";

type Setup = ReturnType<typeof setupEngine>;

function fieldPermanent(s: Setup, cardId: string) {
  return s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === cardId);
}

function stackOf(s: Setup, cardId: string): string[] | undefined {
  return fieldPermanent(s, cardId)?.stack.map(({ instanceId }) => instanceId);
}

function topInstanceId(s: Setup, cardId: string): string | undefined {
  return fieldPermanent(s, cardId)?.topCard?.instanceId;
}

function isOnField(s: Setup, cardId: string): boolean {
  return fieldPermanent(s, cardId) !== undefined;
}

function idle(s: Setup): boolean {
  return s.state.pendingDecision === undefined && !observe(s.engine).isAttacking();
}

async function attackPlayer(s: Setup, alias: string): Promise<void> {
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm(alias).permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
}

describe("Assembly on every play route", () => {
  function citeAssembly(): void {
    cite(
      "comprehensive-0121",
      "§7-3-2-10: Assembly can be performed when an effect plays the card",
      "c597a8c0118cfeec9e9828b395a1c4be2a2e491efa4424da50a5eb338f219449",
    );
  }

  it("hand (manual): BT26-014 places its TB material from trash", async () => {
    citeAssembly();
    const s = setupEngine({
      0: {
        hand: [{ card: "BT26-014", as: "assembled" }],
        trash: [{ card: "BT26-013", as: "material" }],
      },
    });
    s.state.memory = 15;
    await s.ready();
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("assembled").instanceId,
        assembly: { materialInstanceIds: [s.inst("material").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => isOnField(s, "BT26-014"));

    expect(topInstanceId(s, "BT26-014")).toBe(s.inst("assembled").instanceId);
    expect(stackOf(s, "BT26-014")).toEqual([s.inst("material").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("material").instanceId);
    expect(s.state.memory).toBe(memoryBefore - 5);
  });

  it("effect from hand: EX12-072 Metal Empire's Security effect plays EX12-064 Megadramon with Assembly", async () => {
    // Seed: Metal Empire filters by level 5 or lower, not by play cost. Megadramon costs 7.
    citeAssembly();
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX12-064", as: "megadramon" },
            { card: "EX12-017", as: "levelSix" },
          ],
          trash: [{ card: "EX12-054", as: "material" }],
          security: [{ card: "EX12-072", as: "security", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
    await settle(() => isOnField(s, "EX12-064") && idle(s));

    expect(topInstanceId(s, "EX12-064")).toBe(s.inst("megadramon").instanceId);
    expect(stackOf(s, "EX12-064")).toEqual([s.inst("material").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("levelSix").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("material").instanceId);
  });

  it("effect from trash: BT26-067 Wizardmon plays BT26-073 Aegiochusmon: Dark with Assembly", async () => {
    citeAssembly();
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-067", as: "wizardmon" },
            { card: "BT1-045", as: "yellowDigimon" },
          ],
          trash: [
            { card: "BT26-073", as: "dark" },
            { card: "BT26-069", as: "material" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("dark").instanceId, s.inst("material").instanceId);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 2;
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => (stackOf(s, "BT26-073")?.length ?? 0) > 0);

    expect(topInstanceId(s, "BT26-073")).toBe(s.inst("dark").instanceId);
    expect(stackOf(s, "BT26-073")).toEqual([s.inst("material").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("dark").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("material").instanceId);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("effect from security: ST10-06 Mastemon plays EX12-064 Megadramon with Assembly", async () => {
    citeAssembly();
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST10-05", as: "yellow" },
            { card: "ST10-12", as: "purple" },
          ],
          hand: [{ card: "ST10-06", as: "mastemon" }],
          security: [{ card: "EX12-064", as: "megadramon" }],
          trash: [{ card: "EX12-054", as: "material" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("yellow").permanentId, s.perm("purple").permanentId],
        instanceId: s.inst("mastemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => topInstanceId(s, "EX12-064") === s.inst("megadramon").instanceId && idle(s));

    expect(stackOf(s, "EX12-064")).toEqual([s.inst("material").instanceId]);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).not.toContain(
      s.inst("megadramon").instanceId,
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("material").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("effect from deck reveal: EX12-058 HiAndromon reveals and plays EX12-064 Megadramon with Assembly", async () => {
    citeAssembly();
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-058", as: "hiandromon" }],
          deck: [{ card: "EX12-064", as: "megadramon" }, "BT1-009", "BT1-014"],
          trash: [{ card: "EX12-054", as: "material" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 11;
    preferred.push(s.inst("megadramon").instanceId, s.inst("material").instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hiandromon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => isOnField(s, "EX12-064"));

    expect(topInstanceId(s, "EX12-064")).toBe(s.inst("megadramon").instanceId);
    expect(stackOf(s, "EX12-064")).toEqual([s.inst("material").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).not.toContain(s.inst("megadramon").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("material").instanceId);
  });
});

describe("DigiXros on every play route", () => {
  function citeDigiXros(): void {
    cite(
      "comprehensive-0117",
      "§7-2-2-13 and §7-2-3: DigiXros is declared inside the play procedure",
      "67165b0c3ecf3d8d9371fcdb391814b960e2c51e470f58b8781f9db01b889d08",
    );
  }

  it("hand (manual): BT10-077 MadLeomon places a Bagra Army card from hand", async () => {
    citeDigiXros();
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT10-077", as: "madleomon" },
          { card: "BT10-076", as: "material" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("madleomon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => isOnField(s, "BT10-077"));

    expect(topInstanceId(s, "BT10-077")).toBe(s.inst("madleomon").instanceId);
    expect(stackOf(s, "BT10-077")).toEqual([s.inst("material").instanceId]);
    expect(s.state.memory).toBe(7);
  });

  it("effect from hand: BT21-021 OmniShoutmon's End of Attack plays BT19-014 with DigiXros (Q4727)", async () => {
    citeDigiXros();
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-021", as: "omni" }],
          hand: [
            { card: "BT19-014", as: "ex6" },
            { card: "BT19-026", as: "zeig" },
            { card: "BT19-051", as: "atlur" },
            { card: "BT19-038", as: "jaeger" },
            { card: "BT19-061", as: "raptor" },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    await attackPlayer(s, "omni");
    await settle(() => isOnField(s, "BT19-014") && idle(s));

    expect(topInstanceId(s, "BT19-014")).toBe(s.inst("ex6").instanceId);
    expect(stackOf(s, "BT19-014")).toEqual([
      s.inst("raptor").instanceId,
      s.inst("jaeger").instanceId,
      s.inst("atlur").instanceId,
      s.inst("zeig").instanceId,
      s.inst("omni").instanceId,
    ]);
    expect(s.state.memory).toBe(6);
  });

  // KB Q5397, Q2104 and Q2352: DigiXros may be declared for any play by an effect.
  it("effect from trash: BT10-084 Tactimon plays BT10-077 MadLeomon with DigiXros", async () => {
    citeDigiXros();
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT10-084", as: "tactimon" },
            { card: "BT10-076", as: "material" },
          ],
          trash: [{ card: "BT10-077", as: "madleomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tactimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => isOnField(s, "BT10-077") && idle(s));

    // Tactimon is a [Bagra Army] Digimon on the field, so it is a legal material too.
    expect(topInstanceId(s, "BT10-077")).toBe(s.inst("madleomon").instanceId);
    expect(stackOf(s, "BT10-077")).toEqual(expect.arrayContaining([s.inst("material").instanceId]));
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("madleomon").instanceId);
  });

  it("effect from security: ST10-06 Mastemon plays BT10-077 MadLeomon with DigiXros", async () => {
    citeDigiXros();
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST10-05", as: "yellow" },
            { card: "ST10-12", as: "purple" },
          ],
          hand: [
            { card: "ST10-06", as: "mastemon" },
            { card: "BT10-076", as: "material" },
          ],
          security: [{ card: "BT10-077", as: "madleomon" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("yellow").permanentId, s.perm("purple").permanentId],
        instanceId: s.inst("mastemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => topInstanceId(s, "BT10-077") === s.inst("madleomon").instanceId && idle(s));

    expect(stackOf(s, "BT10-077")).toEqual([s.inst("material").instanceId]);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).not.toContain(
      s.inst("madleomon").instanceId,
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("material").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("effect from deck reveal: BT10-105's Security effect plays BT10-061 with DigiXros", async () => {
    citeDigiXros();
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-058", as: "skull" },
            { card: "BT19-059", as: "axe" },
          ],
          deck: [{ card: "BT10-061", as: "mightyAxe" }, "BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          security: [{ card: "BT10-105", as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
    await settle(() => isOnField(s, "BT10-061") && idle(s));

    expect(topInstanceId(s, "BT10-061")).toBe(s.inst("mightyAxe").instanceId);
    expect(stackOf(s, "BT10-061")).toEqual(
      expect.arrayContaining([s.inst("skull").instanceId, s.inst("axe").instanceId]),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).not.toContain(s.inst("mightyAxe").instanceId);
  });
});

describe("DNA digivolution routes", () => {
  it("hand (manual): EX13-045 Examon DNA digivolves over two level 5 Digimon treated as level 6", async () => {
    // Seed. EX13-041 and EX13-021 read "also treated as Lv.6 [...] for [Examon]'s DNA digivolution".
    cite(
      "comprehensive-0127",
      "§8-2-1: DNA digivolution stacks cards that meet the DNA requirement",
      "16f155f174f8ed3b55d73d8d50c8ff030a82fd738e795b530fbcea25265711b9",
    );
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX13-041", as: "green" },
            { card: "EX13-021", as: "blue" },
          ],
          hand: [{ card: "EX13-045", as: "examon" }],
          deck: ["BT1-009"],
        },
        1: { security: ["BT1-011", "BT1-012", "BT1-013"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("green").permanentId, s.perm("blue").permanentId],
        instanceId: s.inst("examon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => isOnField(s, "EX13-045") && idle(s));

    expect(topInstanceId(s, "EX13-045")).toBe(s.inst("examon").instanceId);
    expect(fieldPermanent(s, "EX13-045")?.stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX13-041", "EX13-021"]),
    );
    expect(s.state.memory).toBe(2);
  });

  it("effect from hand: EX3-020 Wingdramon's End of Your Turn DNA digivolves into EX3-074 Examon", async () => {
    cite(
      "comprehensive-0129",
      "§8-2-2-4: an effect that specifically performs DNA digivolution",
      "2aebd5f185f85ef41b8bd673c2d6d35f3705415efd7d305df461440214eaf69d",
    );
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-020", as: "wingdramon" },
            { card: "BT20-044", as: "breakdramon" },
          ],
          hand: [{ card: "EX3-074", as: "examon" }],
          deck: ["BT1-030"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("breakdramon").permanentId, s.inst("examon").instanceId);
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => isOnField(s, "EX3-074"));
    await turn;

    expect(topInstanceId(s, "EX3-074")).toBe(s.inst("examon").instanceId);
    expect(fieldPermanent(s, "EX3-074")?.stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX3-020", "BT20-044"]),
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("examon").instanceId);
  });

  it("effect from trash: BT17-101 DNA digivolves two Digimon when a level 6 with Pulsemon in text is played", async () => {
    cite(
      "comprehensive-0129",
      "§8-2-2-4: an effect that specifically performs DNA digivolution",
      "2aebd5f185f85ef41b8bd673c2d6d35f3705415efd7d305df461440214eaf69d",
    );
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-069", as: "purple" },
            { card: "BT17-040", as: "yellow" },
          ],
          hand: [{ card: "BT16-080", as: "played" }],
          trash: [{ card: "BT17-101", as: "dna" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("purple").permanentId, s.perm("yellow").permanentId, s.inst("dna").instanceId);
    s.state.memory = 15;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => topInstanceId(s, "BT17-101") === s.inst("dna").instanceId && idle(s));

    expect(fieldPermanent(s, "BT17-101")?.stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("purple").instanceId, s.inst("yellow").instanceId]),
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("dna").instanceId);
  });
});

describe("App Fusion routes", () => {
  it("hand (manual): BT23-016 with BT23-039 linked app fuses into BT23-021", async () => {
    cite(
      "comprehensive-0134",
      "§8-4-1: App Fusion stacks a linked pair into the revealed card",
      "c9dac276f5a3ab224e8f3782cbc0618394ca5ae077859faf8b5887df2985c4c6",
    );
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-016", as: "host", linked: [{ card: "BT23-039", as: "linked" }] }],
          hand: [{ card: "BT23-021", as: "fusion" }],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "appFusion",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("fusion").instanceId,
        linkedInstanceId: s.inst("linked").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("fusion").instanceId);

    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("host").instanceId,
      s.inst("linked").instanceId,
    ]);
    expect(s.state.memory).toBe(0);
  });

  it("effect from hand: BT21-084 Haru Shinkai app fuses the linked Digimon into BT21-073", async () => {
    cite(
      "comprehensive-0135",
      "§8-4-2-2: an effect that specifically performs App Fusion",
      "22e9fe21c59600a8e87cb4238f47e87f5628694ddf7cc313daa3037a02708511",
    );
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-084", as: "haru" },
            { card: "BT21-043", as: "host" },
          ],
          hand: [
            { card: "BT21-070", as: "link" },
            { card: "BT21-073", as: "fusion" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("fusion").instanceId);

    expect(s.perm("host").topCard.cardId).toBe("BT21-073");
    // Charismon's [When Digivolving] then links Sociamon from its digivolution cards.
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("link").instanceId]);
    expect(s.perm("host").linked.map(({ instanceId }) => instanceId)).toContain(s.inst("host").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("fusion").instanceId);
  });

  it("effect from trash: BT24-087 Rei Katsura app fuses the linked Digimon into BT24-038 in trash", async () => {
    cite(
      "comprehensive-0135",
      "§8-4-2-2: an effect that specifically performs App Fusion",
      "22e9fe21c59600a8e87cb4238f47e87f5628694ddf7cc313daa3037a02708511",
    );
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-087", as: "rei" },
            { card: "BT24-057", as: "host" },
          ],
          hand: [
            { card: "BT24-036", as: "link" },
            { card: "BT1-009", as: "discard" },
          ],
          deck: ["BT1-010", "BT4-022"],
          trash: [{ card: "BT24-038", as: "fusion" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("fusion").instanceId);

    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("link").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("fusion").instanceId);
  });
});

describe("Burst digivolve routes", () => {
  it("hand (manual): BT13-018 ShineGreymon burst digivolves into BT13-020 by returning Marcus Damon", async () => {
    cite(
      "comprehensive-0131",
      "§8-3-1: burst digivolve returns the specified Tamer to the hand",
      "6b9537bcc18dbf610f66b192871987c8d64ebd3d667f6d7c4cd508a77d952f01",
    );
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-018", as: "shine" },
            { card: "BT12-092", as: "marcus" },
          ],
          hand: [{ card: "BT13-020", as: "burst" }],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("shine").permanentId,
        instanceId: s.inst("burst").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("shine").topCard.cardId === "BT13-020" && idle(s));

    expect(s.perm("shine").topCard.instanceId).toBe(s.inst("burst").instanceId);
    expect(s.perm("shine").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("shine").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("marcus").instanceId);
    expect(
      Array.from(s.state.players[0]!.battleArea).flatMap((permanent) =>
        Array.from(permanent.stack, ({ instanceId }) => instanceId),
      ),
    ).not.toContain(s.inst("marcus").instanceId);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await turn;
  });
});

describe("Alternate digivolution requirement routes", () => {
  function citeAlternate(): void {
    cite(
      "comprehensive-0037",
      "§2-3-5-3: a [Digivolve] line is also a digivolution requirement",
      "1109d6a323d257054e93be58c5ea8d408ae67cb68bf99fc3645719486e912b76",
    );
    cite(
      "comprehensive-0125",
      "§8-1-2-1: the player chooses the requirement on the revealed card",
      "4cdd2dda108de613160aa4c381701f2f6da2861655f93b6dab87d5ab87c827c9",
    );
  }

  it("hand (manual): blue BT10-024 MetalGreymon digivolves into EX4-051 only through 'from [MetalGreymon]: 3'", async () => {
    citeAlternate();
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-024", as: "metal" }],
          hand: [{ card: "EX4-051", as: "blitz" }],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("metal").permanentId,
        instanceId: s.inst("blitz").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("metal").topCard.cardId === "EX4-051" && idle(s));

    expect(s.state.memory).toBe(2);
    expect(s.perm("metal").topCard.instanceId).toBe(s.inst("blitz").instanceId);
  });

  it("effect from hand: BT19-077 Calumon digivolves blue MetalGreymon into EX4-051 for the alternate cost minus 2", async () => {
    citeAlternate();
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-077", as: "calumon" },
            { card: "BT10-024", as: "metal" },
          ],
          hand: [{ card: "EX4-051", as: "blitz" }],
          deck: ["BT1-009"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: 1,
        preferInstanceIds: preferred,
      },
    );
    s.state.memory = 3;
    await s.ready();
    preferred.push(s.perm("metal").topCard.instanceId, s.inst("blitz").instanceId);

    const entries = JSON.parse(s.perm("calumon").activatableEffectsJson ?? "[]") as { effectKey: string }[];
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("calumon").topCard.instanceId,
        effectKey: entries[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("metal").topCard.cardId === "EX4-051" && idle(s));

    expect(s.state.memory).toBe(2);
    expect(s.perm("metal").topCard.instanceId).toBe(s.inst("blitz").instanceId);
  });

  it("effect from trash: BT13-085 Crowmon digivolves into BT26-082 Ravemon for its [Crowmon] cost 3", async () => {
    citeAlternate();
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-085", as: "crow" },
            { card: "BT13-100", as: "tamer" },
          ],
          trash: [{ card: "BT26-082", as: "ravemon" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    s.state.memory = 4;
    await s.ready();

    await attackPlayer(s, "crow");
    // Ravemon's own optional When Digivolving effect can then delete it as a cost, so observe
    // the exact card as it enters before that unrelated effect finishes.
    await settle(() => s.perm("crow").topCard.instanceId === s.inst("ravemon").instanceId);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("ravemon").instanceId);
  });

  it("effect from security: BT16-024 MagnaAngemon digivolves into EX6-028 Seraphimon for its [MagnaAngemon] cost 3 minus 2", async () => {
    citeAlternate();
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-024", as: "magna" }],
          security: [
            { card: "EX6-028", as: "seraphimon" },
            { card: "BT1-001", as: "other" },
          ],
          deck: ["BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("magna").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("magna").topCard.cardId === "EX6-028" && idle(s));

    expect(s.state.memory).toBe(3);
    expect(s.perm("magna").topCard.instanceId).toBe(s.inst("seraphimon").instanceId);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).not.toContain(
      s.inst("seraphimon").instanceId,
    );
  });

  it("effect from deck reveal: BT24-060 Hisyaryumon may digivolve into BT20-080 only through its [SEEKERS] requirement", async () => {
    // Fenriloogamon's color requirement is red or yellow; Hisyaryumon is black and green. Only the
    // "Lv.5 w/[SEEKERS] trait" line makes the digivolution legal. The cost is waived by the effect.
    citeAlternate();
    cite(
      "comprehensive-0037",
      "§2-3-5-3: the [Digivolve] line is an additional requirement",
      "1109d6a323d257054e93be58c5ea8d408ae67cb68bf99fc3645719486e912b76",
    );
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-060", as: "hisyaryumon" }],
          deck: [{ card: "BT20-080", as: "fenriloogamon" }, "BT1-013", "BT1-015", "BT1-016"],
        },
        1: { security: ["BT1-013", "BT1-015"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    await attackPlayer(s, "hisyaryumon");
    await settle(() => s.perm("hisyaryumon").topCard.instanceId === s.inst("fenriloogamon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("hisyaryumon").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("hisyaryumon").instanceId);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).not.toContain(
      s.inst("fenriloogamon").instanceId,
    );
  });
});

describe("Seed: a play by an effect opens another effect's play window", () => {
  it("EX5-069 Biting Crush's Delay plays EX5-063 Leviamon from trash when the opponent's effect plays a Digimon", async () => {
    // KB Q3678 / Q4735: the Delay window opens when an effect plays the opponent's Digimon.
    // KB Q3675: trashing Biting Crush is the optional activation cost.
    cite(
      "comprehensive-0235",
      "§16-17-1: trashing the Delay card activates the specified effect",
      "866991fdeb6c896a2840c30399a87d353e8cbd33d30f706e6729ba46bd4428d2",
    );
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-069", as: "bitingCrush" }],
          trash: [{ card: "EX5-063", as: "leviamon" }],
          deck: Array.from({ length: 12 }, () => "BT1-010"),
          security: 3,
        },
        1: {
          battleArea: ["BT2-069"],
          hand: [{ card: "BT2-108", as: "revival" }],
          trash: [{ card: "BT2-067", as: "demidevimon" }],
          deck: Array.from({ length: 12 }, () => "BT1-011"),
          security: 3,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    const drive = advance(s.engine);
    await drive.waitForMainPhase(0);
    drive.endMainPhaseIfOpen(0);
    await drive.waitForMainPhase(1);
    s.state.memory = -8;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("revival").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => isOnField(s, "EX5-063"));

    expect(topInstanceId(s, "EX5-063")).toBe(s.inst("leviamon").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("bitingCrush").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("leviamon").instanceId);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
