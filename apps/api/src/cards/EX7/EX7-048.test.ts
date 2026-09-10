import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-048.js";
import "../index.js";

describe("EX7-048 Gundramon", () => {
  it("matches the catalog, Q4585, complete IR, alternate route, and registration", () => {
    expect(getCardDefinition("EX7-048")).toMatchObject({
      cardId: "EX7-048",
      nameEn: "Gundramon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Black", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Machine", "Three Musketeers"],
      effectText:
        "[Digivolve]Lv.5 w/[Three Musketeers]\u00a0in its text: Cost 4 \n\n＜Blocker＞ \n[On Play] [When Digivolving] Reveal the top 6 cards of your deck. You may use 1 Option card with the [Three Musketeers]\u00a0trait among them without paying the cost. Return the rest to the top or bottom of the deck.\n[All Turns] When your Digimon with the [Three Musketeers]\u00a0trait would leave the battle area other than by your effects, by trashing 1 Option card in this Digimon's digivolution cards, prevent it.",
    });
    expect(digivolutionRequirementsFor("EX7-048")).toContainEqual({
      level: 5,
      texts: ["Three Musketeers"],
      cost: 4,
      isAlternate: true,
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "RevealAdd",
        revealCount: 6,
        add: [{ count: 1, to: "useOption", payCost: false, optional: true }],
        rest: "deckTopOrBottom",
      });
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanYourEffect",
      mode: "prevent",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }],
      },
      cost: {
        kind: "trash",
        target: { count: 1, filter: { zone: "digivolutionCards", kind: ["Option"], hostFilter: { isSelfRef: true } } },
      },
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(hasRegisteredCompiledCard("EX7-048")).toBe(true);
  });

  it("publicly reveals and uses a Three Musketeers Option for free on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-048", as: "gundra" }],
          deck: ["EX7-066", "BT1-009", "BT1-010", "BT1-014", "BT1-038", "BT1-040"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gundra").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[0]!.deck.length === 5);
    const gundra = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX7-048")!;
    expect(s.state.memory).toBe(-2);
    expect(gundra.stack.map((card) => card.cardId)).toContain("EX7-066");
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("victim").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual([
      "BT1-009",
      "BT1-010",
      "BT1-014",
      "BT1-038",
      "BT1-040",
    ]);
  });

  it("alternate-evolves from an off-color text peer and uses the Option after the bonus draw", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-011", as: "base" }],
          hand: [{ card: "EX7-048", as: "gundra" }],
          deck: [
            { card: "BT1-011", as: "drawn" },
            "EX7-066",
            "BT1-009",
            "BT1-010",
            "BT1-014",
            "BT1-038",
            "BT1-040",
            { card: "BT1-045", as: "tail" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 8;
    await s.ready();
    const gundraId = s.inst("gundra").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: gundraId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.memory).toBe(4);
    expect(s.perm("base").topCard.instanceId).toBe(gundraId);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX7-066", "EX7-011"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("does not use an Option or affect the opponent when the reveal has no match", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-048", as: "gundra" }],
          deck: ["BT1-009", "BT1-010", "BT1-014", "BT1-038", "BT1-040", "BT1-045", "BT1-046"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gundra").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX7-048"));
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual([
      "BT1-009",
      "BT1-010",
      "BT1-014",
      "BT1-038",
      "BT1-040",
      "BT1-045",
      "BT1-046",
    ]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("pays the replacement publicly against an opponent's deletion effect", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-048", as: "gundra", under: [{ card: "EX7-066", as: "cost" }] },
            { card: "EX7-059", as: "protected", dp: 5000 },
          ],
        },
        1: { hand: [{ card: "EX7-012", as: "deletor" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    preferred.push(s.perm("protected").permanentId);
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("deletor").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX7-059")).toBe(true);
    expect(s.perm("gundra").stack).toHaveLength(0);
  });

  it("does not spend Gundramon's Option to protect a non-Three-Musketeers Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-048", as: "gundra", under: [{ card: "EX7-066", as: "cost" }] },
            { card: "BT1-009", as: "ordinary", dp: 5000 },
          ],
        },
        1: { hand: [{ card: "EX7-012", as: "deletor" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    preferred.push(s.perm("ordinary").permanentId);
    await s.ready();
    const ordinaryId = s.perm("ordinary").permanentId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("deletor").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === ordinaryId));
    expect(s.perm("gundra").stack.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
  });

  it("trashes Shotmon when evolution invalidates its link requirement (Q4585)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-073", as: "base", linked: [{ card: "BT21-054", as: "shotmon" }] }],
        hand: [{ card: "EX7-048", as: "gundra" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 8;
    await s.ready();
    const linkId = s.inst("shotmon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gundra").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX7-048");
    expect(s.perm("base").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(linkId);
  });

  it("uses Blocker publicly to redirect and survive an opponent's player attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX7-048", as: "gundra" }], security: ["BT1-009"] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("gundra").permanentId })).toEqual(
      { ok: true },
    );
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === attackerId));
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
