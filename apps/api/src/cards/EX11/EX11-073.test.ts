import { describe, expect, it } from "vitest";
import { dnaDigivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-073.js";
import "./EX11-070.js";

describe("EX11-073 ExMaquinamon", () => {
  it("proves Mind Link onto ExMaquinamon is a stack card, not a link card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-070", as: "unchained" },
            { card: "EX11-073", as: "exmaquinamon" },
          ],
          deck: ["BT1-009"],
        },
        1: { deck: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("exmaquinamon").stack.map(({ cardId }) => cardId)).toContain("EX11-070");
    expect(s.perm("exmaquinamon").linked).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "EX11-073")).toBeDefined();
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("preserves the printed level 7 Digimon and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-073")).toMatchObject({
      nameEn: "ExMaquinamon",
      colors: ["Green", "Black"],
      level: 7,
      playCost: 15,
      dp: 15000,
      evoCosts: [
        { color: "Green", level: 6, memoryCost: 5 },
        { color: "Black", level: 6, memoryCost: 5 },
      ],
      types: ["Unique", "LIBERATOR"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.dnaDigivolveRequirement).toEqual([
      {
        cost: 0,
        materials: [
          { color: "Green", level: 6 },
          { color: "Black", level: 6 },
        ],
      },
    ]);
    expect(dnaDigivolutionRequirementsFor("EX11-073")).toEqual(compiled.dnaDigivolveRequirement);
  });

  it("DNA digivolves from one green Lv.6 and one black Lv.6 at cost 0", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-080", as: "green" },
          { card: "BT10-067", as: "black" },
        ],
        hand: [{ card: "EX11-073", as: "result" }],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
    });
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("green").permanentId, s.perm("black").permanentId],
        instanceId: s.inst("result").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.perm("result").topCard?.cardId).toBe("EX11-073");
    expect(s.perm("result").stack.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["BT1-080", "BT10-067"]));
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("links exact Maquinamon cards from hand and trash during DNA", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-080", as: "green", linked: [{ card: "EX11-027", as: "materialLink" }] },
            { card: "BT10-067", as: "black" },
          ],
          hand: [
            { card: "EX11-073", as: "result" },
            { card: "EX11-027", as: "handMaquinamon" },
            { card: "EX11-073", as: "wrongName" },
          ],
          trash: [{ card: "EX11-027", as: "trashMaquinamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("green").permanentId, s.perm("black").permanentId],
        instanceId: s.inst("result").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea[0]!.topCard?.cardId).toBe("EX11-073");
    const result = s.state.players[0]!.battleArea[0]!;
    // The material link is trashed before the DNA stack is assembled, then is eligible to be
    // linked again from trash by ExMaquinamon's own When Digivolving clause (Q5945). The final
    // linked list alone cannot distinguish those two legal transitions, so retain the movement
    // event as explicit public evidence.
    expect(result.linked.map(({ cardId }) => cardId)).toEqual(["EX11-027", "EX11-027", "EX11-027"]);
    expect(result.linked.some(({ instanceId }) => instanceId === s.inst("materialLink").instanceId)).toBe(true);
    expect(
      s.events.some(
        (event) => event.kind === "cardsMoved" && event.instanceIds.includes(s.inst("materialLink").instanceId),
      ),
    ).toBe(true);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("handMaquinamon").instanceId)).toBe(
      false,
    );
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("wrongName").instanceId)).toBe(true);
    expect(
      s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("trashMaquinamon").instanceId),
    ).toBe(false);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("materialLink").instanceId)).toBe(
      false,
    );
    assertNoLoudGap(s);
  });

  it.each([
    ["wrong colors", "BT1-080", "BT1-081"],
    ["wrong level", "BT1-080", "AD1-011"],
  ])("rejects DNA digivolution with %s", async (_label, first, second) => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: first, as: "first" },
          { card: second, as: "second" },
        ],
        hand: [{ card: "EX11-073", as: "result" }],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("first").permanentId, s.perm("second").permanentId],
        instanceId: s.inst("result").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("EX11-073");
  });

  it("has Security Attack +1 and Blocker while on the field", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-073", as: "exmaquinamon" }] } });
    await s.engine.recomputeContinuousEffects();
    await settle(() => observe(s.engine).hasKeyword(s.perm("exmaquinamon"), "SecurityAttack"));
    expect(observe(s.engine).hasKeyword(s.perm("exmaquinamon"), "SecurityAttack")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("exmaquinamon"), "Blocker")).toBe(true);
    expect(observe(s.engine).linkMaxDelta(s.perm("exmaquinamon"))).toBe(2);
    assertNoLoudGap(s);
  });

  it("trashes security before returning an opposing Digimon at the real opponent-turn boundary", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX11-073", as: "exmaquinamon", linked: [{ card: "EX11-027" }, { card: "EX11-027" }] }],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
      },
      1: {
        battleArea: [{ card: "BT1-080", as: "opponentDigimon" }],
        security: ["BT1-013", "BT1-009", "BT1-010", "BT1-011"],
        deck: ["BT1-010", "BT1-015", "BT1-016", "BT1-017", "BT1-018", "BT1-019"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-080");
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("publishes full exclusive IR with exact link sources and ordered per-link action groups", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")?.actions).toMatchObject([
      {
        kind: "Link",
        target: { source: "thisDigimon", count: 3, upTo: true },
        from: ["hand", "trash", "digivolutionCards"],
        condition: { kind: "isDnaDigivolving" },
      },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfOpponentsTurn")?.actions).toMatchObject([
      { kind: "RepeatPerCount", action: { kind: "trashSecurityTop" } },
      { kind: "RepeatPerCount", action: { kind: "Return", to: "deckBottom" } },
    ]);
  });
});
