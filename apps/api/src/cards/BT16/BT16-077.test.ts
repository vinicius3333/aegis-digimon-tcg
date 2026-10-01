import { describe, expect, it } from "vitest";
import { setupEngine, settle, type EngineSetup, type SetupEngineOptions } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-077.js";
import "../index.js";

describe("BT16-077", () => {
  it("models Raid and Partition", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Raid" }, { keyword: "Partition" }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Partition" }],
    });
  });

  it("during DNA digivolution plays a Free level 5 or lower from trash and grants Rush", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving" });
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      condition: { kind: "isDnaDigivolving" },
    });
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({
      kind: "SelectBind",
      target: { bindAs: "rushAttacker" },
      optional: true,
      abortOnDecline: true,
    });
    expect(compiled.effects?.[1]?.actions?.[2]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Rush" },
      duration: "forTheTurn",
      optional: false,
      target: { fromSelectionRef: "rushAttacker" },
    });
    expect(compiled.effects?.[1]?.actions?.[3]).toMatchObject({
      kind: "Attack",
      target: { fromSelectionRef: "rushAttacker" },
      attackPlayer: true,
      withoutSuspending: false,
    });
  });

  it("DNA digivolves, plays a Free card, and completes the resulting player attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-068", as: "purpleMaterial" },
            { card: "BT16-008", as: "redMaterial" },
          ],
          hand: [{ card: "BT16-077", as: "dinobeemon" }],
          trash: [{ card: "BT16-008", as: "played" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("purpleMaterial").permanentId, s.perm("redMaterial").permanentId],
        instanceId: s.inst("dinobeemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-077")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-008")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
  });
});

describe("BT16-077 Dinobeemon — KB Q&A rulings", () => {
  const OPPONENT_SECURITY = ["BT1-009", "BT1-009", "BT1-009"];

  function attackDeclarations(s: EngineSetup) {
    return s.events.filter((event) => event.kind === "attackDeclared" && event.redirected !== true);
  }

  function battleAreaCard(s: EngineSetup, cardId: string) {
    return s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === cardId);
  }

  async function dnaDigivolveWithFreeCardInTrash(freeCardId: string, options: SetupEngineOptions) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-068", as: "purpleMaterial" },
            { card: "BT16-008", as: "redMaterial" },
          ],
          hand: [{ card: "BT16-077", as: "dinobeemon" }],
          trash: [{ card: freeCardId, as: "freeCard" }],
        },
        1: { security: [...OPPONENT_SECURITY] },
      },
      options,
    );
    await s.ready();
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("purpleMaterial").permanentId, s.perm("redMaterial").permanentId],
        instanceId: s.inst("dinobeemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length < OPPONENT_SECURITY.length);
    await settle();
    return s;
  }

  it("still grants Rush and attacks a player when it digivolves without DNA (Q2663)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-068", as: "base" }],
          hand: [{ card: "BT16-077", as: "dinobeemon" }],
          trash: [{ card: "BT8-010", as: "freeCard" }],
        },
        1: { security: [...OPPONENT_SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dinobeemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length < OPPONENT_SECURITY.length);
    await settle();

    expect(s.perm("base").topCard?.cardId).toBe("BT16-077");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("freeCard").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Rush")).toBe(true);
    expect(attackDeclarations(s)).toMatchObject([{ attackerCardId: "BT16-077", target: { kind: "player" } }]);
    expect(s.state.players[1]!.security).toHaveLength(OPPONENT_SECURITY.length - 1);
  });

  it("lets a Digimon played during a BT16-091 attack gain Rush but not attack (Q2664)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-070", as: "purpleMaterial" }, { card: "BT8-010", as: "redMaterial" }, "BT1-087"],
          hand: [
            { card: "BT16-091", as: "option" },
            { card: "BT16-077", as: "dinobeemon" },
          ],
          trash: [{ card: "BT16-008", as: "played" }],
        },
        1: { security: [...OPPONENT_SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("played").instanceId);
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length < OPPONENT_SECURITY.length);
    await settle();

    const played = battleAreaCard(s, "BT16-008");
    expect(played?.topCard?.instanceId).toBe(s.inst("played").instanceId);
    expect(observe(s.engine).hasKeyword(played!, "Rush")).toBe(true);
    expect(played!.isSuspended).toBe(false);
    expect(attackDeclarations(s)).toMatchObject([{ attackerCardId: "BT16-077", target: { kind: "player" } }]);
    expect(s.state.players[1]!.security).toHaveLength(OPPONENT_SECURITY.length - 2);
  });

  it("forces the Digimon given Rush to attack instead of offering a choice to skip it (Q4288)", async () => {
    const s = await dnaDigivolveWithFreeCardInTrash("BT8-010", {
      autoAcceptOptional: true,
      autoSelectCards: true,
      declinePrompts: ["Play without paying the cost", "attack", "Attack"],
    });

    const dinobeemon = battleAreaCard(s, "BT16-077")!;
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("freeCard").instanceId);
    expect(observe(s.engine).hasKeyword(dinobeemon, "Rush")).toBe(true);
    expect(attackDeclarations(s)).toMatchObject([{ attackerPermanentId: dinobeemon.permanentId }]);
    expect(dinobeemon.isSuspended).toBe(true);
    const rushAndAttackPrompts = s.decisions
      .filter(({ req }) => req.sourceCardId === "BT16-077" && req.options?.effectTextPart?.startsWith("Then,"))
      .map(({ req }) => ({ kind: req.kind, min: req.options?.min }));
    // The single "may" choice comes before Rush is granted; after it, only the attack target is asked.
    expect(rushAndAttackPrompts).toEqual([
      { kind: "optional", min: undefined },
      { kind: "selectCards", min: 1 },
    ]);
  });

  it("does not let a played Paildramon declare its own attack while Dinobeemon is attacking (Q4298)", async () => {
    // A Paildramon host with BT5-063 inherited gives every other [Paildramon] <Rush>, so the
    // played Paildramon is not summoning sick. Only the attack already in progress stops it.
    const rushHost = { card: "BT20-016", as: "rushHost", under: ["BT5-063"] };
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-068", as: "purpleMaterial" }, { card: "BT16-008", as: "redMaterial" }, rushHost],
          hand: [{ card: "BT16-077", as: "dinobeemon" }],
          trash: [{ card: "BT20-016", as: "freeCard" }],
        },
        1: { security: [...OPPONENT_SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("dinobeemon").instanceId);
    await s.ready();
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("purpleMaterial").permanentId, s.perm("redMaterial").permanentId],
        instanceId: s.inst("dinobeemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length < OPPONENT_SECURITY.length);
    await settle();

    const dinobeemon = battleAreaCard(s, "BT16-077")!;
    const paildramon = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === s.inst("freeCard").instanceId,
    )!;
    expect(observe(s.engine).hasKeyword(dinobeemon, "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(paildramon, "Rush")).toBe(true);
    expect(
      s.decisions.some(
        ({ req }) => req.sourceCardId === "BT20-016" && req.kind === "optional" && req.promptText?.includes("Attack"),
      ),
    ).toBe(true);
    expect(attackDeclarations(s)).toMatchObject([{ attackerPermanentId: dinobeemon.permanentId }]);
    expect(paildramon.isSuspended).toBe(false);

    // Control: outside an attack, the same Rush lets a played Paildramon attack with its [On Play].
    const control = setupEngine(
      {
        0: { battleArea: [rushHost], hand: [{ card: "BT20-016", as: "paildramon" }] },
        1: { security: [...OPPONENT_SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await control.ready();
    control.state.memory = 8;
    expect(
      control.engine.applyIntent(0, { type: "playCard", instanceId: control.inst("paildramon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => control.state.players[1]!.security.length < OPPONENT_SECURITY.length);
    await settle();
    expect(attackDeclarations(control)).toMatchObject([{ attackerCardId: "BT20-016", target: { kind: "player" } }]);
    expect(attackDeclarations(control)[0]).not.toMatchObject({
      attackerPermanentId: control.perm("rushHost").permanentId,
    });
  });

  it("resolves the Rush attack before the played Digimon's [On Play] effect, which still resolves before the security check (Q4710)", async () => {
    const s = await dnaDigivolveWithFreeCardInTrash("BT20-016", { autoAcceptOptional: true, autoSelectCards: true });

    const attackIndex = s.events.findIndex((event) => event.kind === "attackDeclared");
    const onPlayIndex = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT20-016" && event.timing === "OnPlay",
    );
    const securityCheckIndex = s.events.findIndex((event) => event.kind === "securityChecked");
    expect(attackIndex).toBeGreaterThan(-1);
    expect(onPlayIndex).toBeGreaterThan(attackIndex);
    expect(securityCheckIndex).toBeGreaterThan(onPlayIndex);
    expect(observe(s.engine).hasPierce(battleAreaCard(s, "BT16-077")!)).toBe(true);
  });
});
