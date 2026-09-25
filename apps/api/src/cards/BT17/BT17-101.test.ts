import {
  dnaDigivolutionRequirementsFor as dnaRequirementsFor,
  getCardDefinition as cardDefinition,
} from "@aegis/shared";
import { dnaDigivolveCostFor } from "../../engine/effects/primitives.js";
import { compiled as compiledDna } from "./BT17-101.js";
import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { compiled } from "./BT17-101.js";
import "./index.js";

const FENRILOOGAMON = "BT17-101";

describe("BT17-101 Fenriloogamon: Takemikazuchi — [When Attacking] security trash", () => {
  it("models the Trash trigger for a played level 6 Pulsemon-text Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(effect).toMatchObject({ isFromTrash: true });
    expect(effect?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        levels: [6],
        nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }],
      },
      actions: [
        {
          kind: "DnaDigivolve",
          materials: { count: 2 },
          into: { controllerDefault: "mine", zone: "trash", isSelfRef: true },
          optional: true,
        },
      ],
    });
  });

  it("keeps the Tamer recovery branch independent from the DNA condition", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions[1]).toMatchObject({
      kind: "SetMemory",
      controller: "opponent",
      condition: { kind: "isDnaDigivolving" },
    });
    expect(effect?.actions[2]).toMatchObject({
      kind: "GainMemory",
      condition: { kind: "selfDigivolutionStackMatchesFilter", filter: { kind: ["Tamer"] } },
    });
    expect(effect?.actions[3]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Recovery", amount: 1 } });
  });

  it("retains the opponent-seat memory assignment", () => {
    const runtime = runtimeCompiledCard(FENRILOOGAMON)!;
    const whenDigivolving = runtime.effects.find((effect) => effect.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions[1]).toMatchObject({ kind: "SetMemory", value: 3, controller: "opponent" });
  });

  it("naturally DNA digivolves the Trash copy and sets the opponent's memory to 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT17-069", "BT17-040"],
          hand: [{ card: "BT17-040", as: "playedPulsemonDigimon" }],
          trash: [{ card: FENRILOOGAMON, as: "trashFenri" }],
        },
        1: { battleArea: ["BT17-019"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 0;
    s.state.memory = 20;

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedPulsemonDigimon").instanceId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === FENRILOOGAMON));

    const result = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === FENRILOOGAMON);
    expect(result?.stack.some((card) => card.cardId === "BT17-069")).toBe(true);
    expect(result?.stack.some((card) => card.cardId === "BT17-040")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("trashFenri").instanceId)).toBe(false);
    expect(s.state.memory).toBe(-3);
  });

  it("[When Attacking] trashes own top security to trash opponent's top security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: FENRILOOGAMON, dp: 12000, as: "fenri" }],
          security: ["AD1-001"],
        },
        1: { security: [{ card: "AD1-001", as: "oppSecurity" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const p0 = s.state.players[0];
    const p1 = s.state.players[1];
    s.state.turnSeat = 0;
    const fenriId = s.perm("fenri").permanentId;
    const oppSecId = s.inst("oppSecurity").instanceId;

    s.state.memory = 10;

    const res = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: fenriId,
      target: { kind: "player" },
    });
    expect(res.ok).toBe(true);

    await settle(() => p1?.security.length === 0, 800);

    expect(p1?.security.some((c) => c.instanceId === oppSecId)).toBe(false);
    expect(p1?.trash.some((c) => c.instanceId === oppSecId)).toBe(true);
    expect(p0?.security.length).toBe(0);
  });

  it("[When Digivolving] on a normal digivolve applies -16000 DP and, with a Tamer in the stack, gains 1 memory and recovers 1 security (Q4712)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-069", as: "purpleLv6", under: ["BT1-085"] }],
          hand: [{ card: FENRILOOGAMON, as: "fenri" }],
          deck: [
            { card: "BT1-010", as: "digivolveDraw" },
            { card: "BT1-011", as: "recovered" },
          ],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-014", dp: 20_000, as: "oppDigimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 0;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("purpleLv6").permanentId,
        instanceId: s.inst("fenri").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2, 1500);

    const host = s.perm("purpleLv6");
    expect(host.topCard?.cardId).toBe(FENRILOOGAMON);
    expect(s.perm("oppDigimon").currentDP).toBe(4000);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovered").instanceId)).toBe(true);
    expect(host.stack.some((card) => card.cardId === "BT1-085")).toBe(true);
  });

  it("stays in the trash when the opponent plays the same level 6 Pulsemon-text Digimon on their turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT17-069", "BT17-040"],
          trash: [{ card: FENRILOOGAMON, as: "trashFenri" }],
        },
        1: {
          battleArea: [{ card: "BT17-030", as: "colorSource" }],
          hand: [{ card: "BT17-040", as: "opponentPulsemonDigimon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 20;

    expect(
      s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentPulsemonDigimon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-040"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("trashFenri").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === FENRILOOGAMON)).toBe(false);
  });

  it("[When Attacking] leaves the opponent's security alone when its security cost cannot be paid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: FENRILOOGAMON, dp: 12000, as: "fenri" }],
          security: [],
        },
        1: {
          security: [
            { card: "AD1-001", as: "oppSecurityTop" },
            { card: "AD1-001", as: "oppSecurityBottom" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("fenri").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(true);
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security[0]!.instanceId).toBe(s.inst("oppSecurityBottom").instanceId);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("does not offer the Trash DNA digivolve for a played level 6 Digimon lacking [Pulsemon] in its text (Q2900)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT1-013", "BT1-014"],
          hand: [{ card: "BT1-080", as: "nonPulsemonLv6" }],
          trash: [{ card: FENRILOOGAMON, as: "trashFenri" }],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 0;
    s.state.memory = 20;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nonPulsemonLv6").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-080"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("trashFenri").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === FENRILOOGAMON)).toBe(false);
  });
});

describe("BT17-101 DNA requirement", () => {
  it("DNA digivolves only from exact [Fenriloogamon] + [Kazuchimon] for 0", () => {
    expect(dnaRequirementsFor("BT17-101")).toEqual(compiledDna.dnaDigivolveRequirement);
    const evolving = cardDefinition("BT17-101")!;
    const fenriloogamon = cardDefinition("BT17-069")!;
    const kazuchimon = cardDefinition("BT17-040")!;
    expect(dnaDigivolveCostFor(evolving, [fenriloogamon, kazuchimon])).toBe(0);
    expect(dnaDigivolveCostFor(evolving, [cardDefinition("BT20-081")!, kazuchimon])).toBeUndefined();
  });
});
