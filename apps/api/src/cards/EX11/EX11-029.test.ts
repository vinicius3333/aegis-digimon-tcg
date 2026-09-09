import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import "./EX11-070.js";

const cardId = "EX11-029";

describe("EX11-029 Turbomon", () => {
  it("preserves requirements, public link sources, and self-scoped watcher", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Turbomon",
      colors: ["Green"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Green", level: 3, memoryCost: 2 }],
      types: ["Beast", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Maquinamon"], cost: 2, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    for (const trigger of ["WhenMoving", "WhenDigivolving"]) {
      expect(compiled.effects).toContainEqual(
        expect.objectContaining({
          trigger,
          actions: [
            expect.objectContaining({
              kind: "Link",
              from: ["hand", "digivolutionCards"],
              payCost: false,
              optional: true,
              target: {
                filter: {
                  controller: "mine",
                  nameOrTrait: [{ tokens: ["Maquinamon"], match: "nameExact" }],
                  hostFilter: { isSelfRef: true },
                },
                count: 1,
              },
              recipient: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
            }),
          ],
        }),
      );
    }
    const linked = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(linked).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenLinked", sourceFilter: { isSelfRef: true } }],
    });
    expect(linked.actions[0]).toMatchObject({
      actions: [{ kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false }],
    });
  });

  it("links Maquinamon for free through the public When Moving path", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          breeding: { card: cardId, as: "source" },
          battleArea: [{ card: "BT1-009", as: "recipient", dp: 2000 }],
          hand: [{ card: "EX11-027", as: "maquinamon" }],
        },
        1: { security: ["BT1-009"], deck: ["BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("recipient").permanentId);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Breeding" && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("source").permanentId })).toEqual({
      ok: true,
    });
    let sawRecipientAttachment = false;
    await settle(() => {
      sawRecipientAttachment ||= s.state.players[0]!.battleArea.some(
        (permanent) =>
          permanent.topCard?.cardId === "BT1-009" &&
          permanent.linked.some(({ cardId: linkedCardId }) => linkedCardId === "EX11-027"),
      );
      return sawRecipientAttachment;
    });
    expect(sawRecipientAttachment).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    await settle(() => s.state.phase === "Main" && s.state.pendingDecision === undefined);
    assertNoLoudGap(s);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === "Main");
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("provides inherited Piercing in a realistic stack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-031", as: "host", under: [cardId] }] } });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
    assertNoLoudGap(s);
  });

  it("resets the self-link watcher after the next own turn through public digivolve and Link", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-027", as: "base" }],
          hand: [
            { card: cardId, as: "turbomon" },
            { card: "EX11-027", as: "link1" },
            { card: "EX11-027", as: "link2" },
            { card: "EX11-027", as: "link3" },
            { card: "EX11-070", as: "unchained1" },
            { card: "EX11-070", as: "unchained2" },
          ],
          security: ["BT1-009", "BT1-010", "BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
        1: { security: ["BT1-015", "BT1-016", "BT1-017"], deck: ["BT1-018", "BT1-019", "BT1-020"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds },
    );
    s.state.memory = 5;
    s.state.turnSeat = 0;
    s.state.turnCount = 1;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    preferInstanceIds.push(s.inst("link1").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("turbomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === cardId && s.perm("base").linked.length === 1);
    expect(s.perm("base").linked.map(({ cardId: linkedCardId }) => linkedCardId)).toEqual(["EX11-027"]);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-070"));
    expect(s.state.players[0]!.hand.map(({ cardId: handCardId }) => handCardId)).toContain("EX11-070");
    const firstUnchained = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "EX11-070");
    expect(firstUnchained).toBeDefined();

    preferInstanceIds.push(s.inst("link2").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link2").instanceId,
        targetPermanentId: s.perm("base").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").linked.length === 2);
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "EX11-070")).toHaveLength(1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    preferInstanceIds.push(s.inst("link3").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link3").instanceId,
        targetPermanentId: s.perm("base").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("base").linked).toHaveLength(1);
    await settle(
      () => s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "EX11-070").length === 2,
    );
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "EX11-070")).toHaveLength(2);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });
});
