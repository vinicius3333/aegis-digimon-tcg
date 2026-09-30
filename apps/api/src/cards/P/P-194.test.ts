import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import "./P-194.js";
import "../BT24/BT24-003.js";
import "../BT24/BT24-014.js";
import "../BT24/BT24-084.js";
import type { EngineSetup } from "../../engine/testkit/harness.js";

describe("P-194 Aegiomon", () => {
  it("requires a level 3 TS Digimon for evolution", () => {
    expect(runtimeCompiledCard("P-194")!.digivolutionRequirement).toEqual([
      { level: 3, traits: ["TS"], cost: 2, isAlternate: true },
    ]);
  });

  it("has Blocker and Barrier, with inherited Barrier preserved", () => {
    const card = runtimeCompiledCard("P-194")!;
    expect(card.effects.filter((effect) => !effect.isInherited).flatMap((effect) => effect.keywords ?? [])).toEqual([
      { keyword: "Blocker", raw: "＜Blocker＞" },
      { keyword: "Barrier", raw: "＜Barrier＞" },
    ]);
    expect(card.effects.find((effect) => effect.isInherited)).toMatchObject({
      keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
    });
  });

  it("exposes Blocker and Barrier on the live Aegiomon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-194", as: "aegio" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("aegio"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("aegio"), "Barrier")).toBe(true);
  });

  it("passes inherited Barrier through a real evolution stack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["P-194"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
  });

  it("uses inherited Barrier to survive a battle deletion after the stack evolves", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-009", as: "host" }],
        hand: [
          { card: "P-194", as: "aegio" },
          { card: "BT1-057", as: "higher" },
        ],
        security: ["BT1-009", "BT1-009"],
      },
    });
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("aegio").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "P-194");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("higher").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT1-057");
    expect(s.perm("host").stack.some((card) => card.cardId === "P-194")).toBe(true);
    const hostId = s.perm("host").permanentId;
    const deletion = advance(s.engine).verb.deletePermanent([hostId], "byBattle");
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: hostId, accept: true })).toEqual({
      ok: true,
    });
    expect(await deletion).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});

describe("P-194 Aegiomon — KB Q&A rulings", () => {
  async function attackAndBarrier(s: EngineSetup, digivolved: string): Promise<string> {
    await s.ready();
    const hostId = s.perm("host").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: hostId, accept: true })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.instanceId === s.inst(digivolved).instanceId);
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    return hostId;
  }

  function tsunomonBoard() {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-194", as: "host", under: ["BT24-003", "BT24-033"] }],
          hand: [{ card: "BT24-014", as: "shaman" }],
          security: [{ card: "BT1-009", as: "barrierCost" }],
        },
        1: {
          security: [
            { card: "ST1-10", as: "strong" },
            { card: "BT1-009", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("shaman").instanceId);
    s.state.memory = 5;
    return s;
  }

  it("lets Tsunomon's inherited effect digivolve Aegiomon after Barrier saves it from a Security Digimon (Q5576)", async () => {
    const s = tsunomonBoard();
    const hostId = await attackAndBarrier(s, "shaman");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("barrierCost").instanceId);
    expect(s.perm("host").permanentId).toBe(hostId);
    expect(s.perm("host").topCard.cardId).toBe("BT24-014");
    expect(s.perm("host").stack.map((card) => card.cardId)).toContain("P-194");
  });

  it("performs the extra check from the new Digimon's Security Attack +1 after digivolving mid-check (Q5585)", async () => {
    const s = tsunomonBoard();
    await attackAndBarrier(s, "shaman");
    expect(s.events.filter((event) => event.kind === "securityChecked").map((event) => event.revealedCardId)).toEqual([
      "ST1-10",
      "BT1-009",
    ]);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("lets Inori digivolve the Barrier-saved Aegiomon into Aegiochusmon for free (Q5670)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-084", as: "inori" },
            { card: "P-194", as: "host" },
          ],
          hand: [{ card: "BT24-014", as: "aegiochusmon" }],
          security: [{ card: "BT1-009", as: "barrierCost" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          security: [
            { card: "ST1-10", as: "strong" },
            { card: "BT1-014", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("aegiochusmon").instanceId);
    s.state.memory = 3;
    await attackAndBarrier(s, "aegiochusmon");
    expect(s.perm("inori").isSuspended).toBe(true);
    expect(s.perm("host").topCard.cardId).toBe("BT24-014");
    expect(s.state.memory).toBe(3);
  });
});
