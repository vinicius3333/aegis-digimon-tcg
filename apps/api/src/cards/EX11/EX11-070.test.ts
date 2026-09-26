import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-070.js";
import "../BT2/BT2-099.js";
import "../BT6/BT6-016.js";
import "../BT6/BT6-084.js";
import "../BT10/BT10-016.js";
import "../ST3/ST3-12.js";
import "../BT4/BT4-106.js";
import "../EX7/EX7-023.js";

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

  it("uses public opposing effects to enforce the inherited DP floor and stack-trash lock", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX11-029",
              as: "protectedMaquinamon",
              dp: 2_000,
              under: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", { card: "EX11-070", as: "unchained" }],
            },
          ],
        },
        1: {
          battleArea: [
            { card: "BT4-045", as: "yellowSource" },
            { card: "BT1-038", as: "blueHost" },
          ],
          hand: [
            { card: "BT4-106", as: "purgeShine" },
            { card: "EX7-023", as: "hexeblaumon" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const originalStack = s.perm("protectedMaquinamon").stack.map(({ instanceId }) => instanceId);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("purgeShine").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT4-106"));
    expect(s.perm("protectedMaquinamon").currentDP).toBe(1_000);
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "effectResolved", sourceCardId: "BT4-106", timing: "OnUseOption" }),
    );

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("blueHost").permanentId,
        instanceId: s.inst("hexeblaumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blueHost").topCard.cardId === "EX7-023");
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "effectResolved", sourceCardId: "EX7-023", timing: "WhenDigivolving" }),
    );
    expect(s.perm("protectedMaquinamon").stack.map(({ instanceId }) => instanceId)).toEqual(originalStack);
    expect(s.perm("protectedMaquinamon").currentDP).toBe(1_000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("publicly trashes the exact legal stack sources when the host top lacks Maquinamon text (Q5942)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-038", as: "blueSource" }], hand: [{ card: "EX7-023", as: "hexeblaumon" }] },
        1: {
          battleArea: [
            {
              card: "BT1-079",
              as: "ordinaryHost",
              under: [
                { card: "EX11-006", as: "eggSource" },
                { card: "EX11-027", as: "maquinamonSource" },
                { card: "EX11-029", as: "textHostSource" },
                { card: "EX11-070", as: "unchainedSource" },
              ],
            },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    const sourceIds = ["eggSource", "maquinamonSource", "textHostSource", "unchainedSource"].map(
      (alias) => s.inst(alias).instanceId,
    );

    expect(s.perm("ordinaryHost").topCard.cardId).toBe("BT1-079");
    expect(getCardDefinition("BT1-079")?.effectText ?? "").not.toContain("Maquinamon");
    expect(s.perm("ordinaryHost").stack.map(({ cardId }) => cardId)).toEqual([
      "EX11-006",
      "EX11-027",
      "EX11-029",
      "EX11-070",
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueSource").permanentId,
        instanceId: s.inst("hexeblaumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blueSource").topCard.cardId === "EX7-023");

    expect(s.state.memory).toBe(0);
    expect(s.perm("ordinaryHost").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(expect.arrayContaining(sourceIds));
    expect(
      sourceIds.every((instanceId) => s.state.players[1]!.trash.some((card) => card.instanceId === instanceId)),
    ).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("keeps the +2000 modifier through the opponent turn before the inherited DP floor applies (Q5941)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT6-016", as: "jesmon" },
            { card: "BT6-084", as: "sistermon" },
            { card: "EX11-029", as: "protectedMaquinamon", under: [{ card: "EX11-070", as: "unchained" }] },
          ],
          hand: [{ card: "BT10-016", as: "jesmonX" }],
        },
        1: {
          battleArea: [{ card: "ST3-12", as: "yellowTamer" }],
          hand: [{ card: "BT2-099", as: "gloriousBurst" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    await s.ready();
    preferInstanceIds.push(s.perm("protectedMaquinamon").topCard.instanceId);
    s.state.memory = 3;

    expect(s.perm("protectedMaquinamon").currentDP).toBe(5_000);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("jesmon").permanentId,
        instanceId: s.inst("jesmonX").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("jesmon").topCard.cardId === "BT10-016" &&
        s.perm("protectedMaquinamon").currentDP === 7_000 &&
        s.state.pendingDecision === undefined,
    );
    expect(s.perm("protectedMaquinamon").currentDP).toBe(7_000);
    expect(s.state.memory).toBe(3);

    s.state.turnSeat = 1;
    s.state.phase = Phase.Main;
    s.state.memory = 9;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gloriousBurst").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          ({ permanentId }) => permanentId === s.perm("protectedMaquinamon").permanentId,
        ) &&
        s.perm("protectedMaquinamon").currentDP === 1_000 &&
        s.state.pendingDecision === undefined,
    );

    expect(s.perm("protectedMaquinamon").currentDP).toBe(1_000);
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("gloriousBurst").instanceId)).toBe(
      true,
    );
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
