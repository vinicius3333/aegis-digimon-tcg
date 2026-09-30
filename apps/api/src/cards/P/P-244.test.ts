import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./P-244.js";
import "../index.js";

const DECK = Array(20).fill("BT1-009");
const SECURITY = Array(20).fill("BT1-009");

describe("P-244 Unique Emblem: Ragnarok Attainer", () => {
  it("delays on an effect-added Vemmon card and uses normal reduced-cost digivolution requirements", () => {
    expect(
      compiled.effects.find((effect) => effect.trigger === "Main")?.actions[0],
    ).toMatchObject({
      kind: "PlayWithoutCost",
      target: {
        filter: {
          controller: "mine",
          nameOrTrait: [{ tokens: ["Vemmon", "Zenith"], match: "nameExact" }],
        },
      },
    });
    expect(
      compiled.effects.find((effect) => effect.trigger === "YourTurn"),
    ).toMatchObject({
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            byEffect: true,
          },
          addedDigivolutionCardFilter: {
            nameOrTrait: [{ tokens: ["Vemmon"], match: "nameExact" }],
          },
          actions: [
            {
              kind: "Digivolve",
              from: ["hand", "trash"],
              reduceCost: 3,
              payCost: true,
              optional: true,
            },
          ],
        },
      ],
    });
    expect(JSON.stringify(compiled)).not.toContain("ignoreRequirements");
  });

  it("plays the exact Vemmon source without cost and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-061", as: "host" }],
          hand: [{ card: "P-244", as: "option" }],
          trash: [{ card: "BT11-061", as: "vemmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const vemmonId = s.inst("vemmon").instanceId;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.cardId === "P-244",
        ),
      500,
    );
    expect(s.state.memory).toBe(7);
    expect(
      s.state.players[0]!.battleArea.map(
        (permanent) => permanent.topCard?.instanceId,
      ),
    ).toContain(vemmonId);
    expect(
      s.state.players[0]!.trash.map((card) => card.instanceId),
    ).not.toContain(vemmonId);
    expect(
      s.state.players[0]!.battleArea.filter(
        (permanent) => permanent.topCard.cardId === "BT11-061",
      ).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("plays EX11-066 Xeno from trash because its Rule also treats its name as Zenith", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-061", as: "host" }],
          hand: [{ card: "P-244", as: "option" }],
          trash: [{ card: "EX11-066", as: "xeno" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.cardId === "P-244",
        ),
      500,
    );

    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.cardId === "EX11-066",
      ),
    ).toBe(true);
    expect(
      s.state.players[0]!.trash.some((card) => card.cardId === "EX11-066"),
    ).toBe(false);
  });

  async function prepareNaturalVemmonPlacement(preferred: string[]) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-062", as: "galacticmon", under: ["BT11-065"] },
            { card: "BT11-061", as: "vemmon" },
          ],
          hand: [
            { card: "P-244", as: "emblem" },
            { card: "EX11-046", as: "evolution" },
          ],
          trash: [{ card: "BT11-061", as: "seedVemmon" }],
          deck: [
            { card: "BT1-009", as: "filler1" },
            { card: "BT11-061", as: "placedVemmon" },
            { card: "BT1-009", as: "filler2" },
            ...DECK,
          ],
          security: SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent" }],
          hand: ["BT1-009"],
          deck: DECK,
          security: SECURITY,
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    preferred.push(s.inst("seedVemmon").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("emblem").instanceId,
      }),
    ).toEqual({
      ok: true,
    });
    await settle(() =>
      s.decisions.some(
        ({ req }) => req.kind === "optional" && req.sourceCardId === "P-244",
      ),
    );
    const mainDecision = s.decisions.find(
      ({ req }) => req.kind === "optional" && req.sourceCardId === "P-244",
    )!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: mainDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(7);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    return { s, loop };
  }

  async function triggerPublicVemmonPlacement(
    prepared: Awaited<ReturnType<typeof prepareNaturalVemmonPlacement>>,
  ) {
    const { s } = prepared;
    const effect = observe(s.engine).activatableEffects(
      s.perm("vemmon"),
    )[0] as { effectKey: string };
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("vemmon").topCard.instanceId,
        effectKey: effect.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.decisions.some(
        ({ req }) =>
          req.kind === "optional" && req.promptText.includes("Delay"),
      ),
    );
    return s;
  }

  it("keeps P-244 when Delay is declined after a real effect places Vemmon", async () => {
    const prepared = await prepareNaturalVemmonPlacement([]);
    const s = await triggerPublicVemmonPlacement(prepared);
    const delayDecision = s.decisions.find(
      ({ req }) => req.kind === "optional" && req.promptText.includes("Delay"),
    )!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: delayDecision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(
      s.state.players[0]!.trash.map((card) => card.instanceId),
    ).not.toContain(s.inst("emblem").instanceId);
    expect(s.perm("emblem").topCard?.cardId).toBe("P-244");
    expect(s.perm("galacticmon").topCard?.cardId).toBe("BT21-062");
    expect(s.perm("vemmon").stack.map((card) => card.instanceId)).toContain(
      s.inst("placedVemmon").instanceId,
    );
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({
      ok: true,
    });
    await prepared.loop;
  });

  it("trashes P-244 and pays the reduced legal evolution after accepting Delay", async () => {
    const preferred: string[] = [];
    const prepared = await prepareNaturalVemmonPlacement(preferred);
    const originalPermanentId = prepared.s.perm("galacticmon").permanentId;
    const originalStack = prepared.s
      .perm("galacticmon")
      .stack.map((card) => card.instanceId);
    const originalTop = prepared.s.perm("galacticmon").topCard!.instanceId;
    preferred.push(prepared.s.perm("galacticmon").permanentId);
    const s = await triggerPublicVemmonPlacement(prepared);
    const beforeDigivolve = s.state.memory;
    const delayDecision = s.decisions.find(
      ({ req }) => req.kind === "optional" && req.promptText.includes("Delay"),
    )!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: delayDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.decisions.some(
        ({ req }) => req.kind === "optional" && req.promptText === "Digivolve",
      ),
    );
    const digivolveDecision = s.decisions.find(
      ({ req }) => req.kind === "optional" && req.promptText === "Digivolve",
    )!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: digivolveDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("galacticmon").topCard?.instanceId ===
          s.inst("evolution").instanceId &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(beforeDigivolve - (5 - 3));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(
      s.inst("emblem").instanceId,
    );
    expect(s.perm("galacticmon").permanentId).toBe(originalPermanentId);
    expect(s.perm("galacticmon").stack.map((card) => card.instanceId)).toEqual([
      ...originalStack,
      originalTop,
    ]);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({
      ok: true,
    });
    await prepared.loop;
  });
});

describe("P-244 Unique Emblem: Ragnarok Attainer — KB Q&A rulings", () => {
  type Setup = ReturnType<typeof setupEngine>;
  const delayOffers = (s: Setup) =>
    s.decisions.filter(
      ({ req }) => req.kind === "optional" && req.promptText.includes("Delay"),
    );
  const permanentWithTop = (s: Setup, alias: string) =>
    s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst(alias).instanceId,
    );

  async function digivolveSnatchmonIntoGalacticmon() {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-244", as: "emblem" },
            { card: "BT18-065", as: "host" },
          ],
          hand: [
            { card: "BT21-062", as: "galacticmon" },
            { card: "EX11-046", as: "finalGalacticmon" },
          ],
          trash: Array.from({ length: 4 }, (_, index) => ({
            card: "BT18-060",
            as: `vemmon${index}`,
          })),
          deck: DECK,
          security: SECURITY,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("galacticmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("host").topCard.instanceId ===
          s.inst("finalGalacticmon").instanceId &&
        s.state.pendingDecision === undefined,
    );
    return {
      s,
      async finish() {
        expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({
          ok: true,
        });
        await loop;
      },
    };
  }

  it("matches Digimon whose text, not name, contains [Vemmon] for both host and digivolution (Q6930)", async () => {
    expect(getCardDefinition("BT21-062")!.nameEn).not.toContain("Vemmon");
    expect(getCardDefinition("EX11-046")!.nameEn).not.toContain("Vemmon");
    const { s, finish } = await digivolveSnatchmonIntoGalacticmon();

    expect(s.perm("host").topCard.cardId).toBe("EX11-046");
    expect(s.perm("host").stack.map((card) => card.instanceId)).toContain(
      s.inst("galacticmon").instanceId,
    );
    await finish();
  });

  it("does not open <Delay> when Vemmon is placed under Snatchmon for its DigiXros (Q6931)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-244", as: "emblem" }],
          hand: [
            { card: "BT18-065", as: "snatchmon" },
            { card: "BT18-060", as: "vemmon" },
            { card: "EX11-046", as: "galacticmon" },
          ],
          deck: DECK,
          security: SECURITY,
        },
        1: { deck: DECK, security: SECURITY },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        declinePrompts: ["Digivolve"],
      },
    );
    s.state.memory = 30;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("snatchmon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("vemmon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        permanentWithTop(s, "snatchmon") !== undefined &&
        s.state.pendingDecision === undefined,
    );
    const snatchmon = permanentWithTop(s, "snatchmon")!;
    expect(snatchmon.stack.map((card) => card.instanceId)).toEqual([
      s.inst("vemmon").instanceId,
    ]);
    expect(delayOffers(s)).toHaveLength(0);

    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.cardId === "P-244",
      ),
    ).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({
      ok: true,
    });
    await loop;
  });

  it("opens <Delay> when Snatchmon's [When Digivolving] effect places Vemmon in its digivolution cards (Q6931)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-244", as: "emblem" },
            { card: "BT18-060", as: "host" },
          ],
          hand: [
            { card: "BT18-065", as: "snatchmon" },
            { card: "BT21-062", as: "galacticmon" },
          ],
          trash: [
            { card: "BT18-060", as: "placedVemmon" },
            { card: "BT18-060", as: "secondPlacedVemmon" },
          ],
          deck: DECK,
          security: SECURITY,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("snatchmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("host").topCard.instanceId === s.inst("galacticmon").instanceId && s.state.pendingDecision === undefined,
    );

    expect(delayOffers(s)).toHaveLength(1);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("placedVemmon").instanceId, s.inst("snatchmon").instanceId]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("emblem").instanceId);
    const vemmonCostReductions = 3;
    expect(s.state.memory).toBe(10 - 3 - (9 - 3 - vemmonCostReductions));
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("opens <Delay> when Galacticmon's [When Digivolving] places Vemmon and digivolves it into EX11-046 (Q6932)", async () => {
    const { s, finish } = await digivolveSnatchmonIntoGalacticmon();

    expect(delayOffers(s)).toHaveLength(1);
    expect(s.perm("host").topCard.instanceId).toBe(
      s.inst("finalGalacticmon").instanceId,
    );
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("galacticmon").instanceId,
        s.inst("vemmon0").instanceId,
      ]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(
      s.inst("emblem").instanceId,
    );
    const snatchmonToGalacticmon = 9;
    const placedVemmonCostReductions = 4;
    const delayDigivolveCost = Math.max(0, 5 - 3 - placedVemmonCostReductions);
    expect(s.state.memory).toBe(12 - snatchmonToGalacticmon - delayDigivolveCost);
    await finish();
  });
});
