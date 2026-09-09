import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-070.js";

describe("EX11-070 Unchained", () => {
  it("preserves the printed Tamer, inherited text, and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-070")).toMatchObject({
      nameEn: "Unchained",
      colors: ["White"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["LIBERATOR"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn")?.actions).toMatchObject([
      { kind: "DnaDigivolve", materials: { count: 2 }, payCost: true, optional: true },
      { kind: "MindLink", target: { filter: { textContains: "Maquinamon" } }, optional: true },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions).toMatchObject([
      { kind: "MinDpFloor", floor: 1000, duration: "permanent" },
      { kind: "StackTrashLock", duration: "permanent" },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfAllTurns")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["digivolutionCards"],
          target: { filter: { hostFilter: { isSelfRef: true } } },
        },
      ],
    });
  });

  it("sets memory to 3 at the start of your turn from 2 or less", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-070", as: "unchained" }], deck: ["BT1-009"] },
      1: { deck: ["BT1-010"] },
    });
    s.state.memory = 2;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("leaves memory above 2 unchanged at the start of your turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-070", as: "unchained" }], deck: ["BT1-009"] },
      1: { deck: ["BT1-010"] },
    });
    s.state.memory = 3;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("publicly DNA digivolves exactly two legal level-6 materials into ExMaquinamon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-070", as: "unchained" },
            { card: "EX11-034", as: "greenMaterial" },
            { card: "EX11-044", as: "blackMaterial" },
          ],
          hand: [{ card: "EX11-073", as: "exMaquinamon" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-073"));
    const dna = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "EX11-073")!;
    expect(dna.stack.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["EX11-034", "EX11-044"]));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).not.toContain("EX11-073");
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("declines the public DNA option and preserves both materials and ExMaquinamon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-070", as: "unchained" },
            { card: "EX11-034", as: "greenMaterial" },
            { card: "EX11-044", as: "blackMaterial" },
          ],
          hand: [{ card: "EX11-073", as: "exMaquinamon" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    await settle();
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(
      expect.arrayContaining(["EX11-034", "EX11-044"]),
    );
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("EX11-073");
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-073")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("Mind Links at the real end of turn to a Maquinamon-text Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-070", as: "unchained" },
            { card: "EX11-029", as: "maquinamonText" },
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
    expect(s.perm("maquinamonText").stack.map(({ cardId }) => cardId)).toContain("EX11-070");
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("plays inherited Unchained from its own stack at the real end of all turns", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-029", as: "host", under: [{ card: "EX11-070", as: "unchained" }] }],
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
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-070"));
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("plays itself from security through a legal public security check", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX11-070", as: "unchained", faceUp: false }] },
      1: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 20_000 }], security: ["BT1-013"] },
    });
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-070"));
    expect(s.state.players[0]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
