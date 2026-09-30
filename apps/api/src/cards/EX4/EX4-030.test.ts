import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { irNode } from "../../engine/testkit/irNode.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { effectsOf } from "../../engine/effects/collect.js";
import "../index.js";
import "../BT1/BT1-036.js";
import "../BT1/BT1-102.js";
import "./EX4-030.js";

describe("EX4-030 Kuzuhamon", () => {
  it("matches the catalog and registers full residual-free IR", () => {
    expect(getCardDefinition("EX4-030")).toMatchObject({
      cardId: "EX4-030",
      nameEn: "Kuzuhamon",
      colors: ["Yellow", "Blue"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 11000,
      evoCosts: [
        { color: "Yellow", level: 5, memoryCost: 3 },
        { color: "Blue", level: 5, memoryCost: 3 },
      ],
      types: ["Shaman"],
    });
    expect(getEffectModule("EX4-030")).toBeDefined();
    expect(runtimeCompiledCard("EX4-030")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("uses one optional hand Option costing 5 or less when digivolving", () => {
    const effect = runtimeCompiledCard("EX4-030")?.effects?.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "UseOptionWithoutCost",
      filter: { kind: ["Option"], playCostLte: 5 },
      payCost: false,
      from: ["hand"],
      optional: true,
    });
  });

  it("fires the once-per-turn cost-2 watcher and plays an eligible stack Digimon", () => {
    const effect = runtimeCompiledCard("EX4-030")?.effects?.find((entry) => entry.trigger === "YourTurn");
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenOptionUsed" }],
    });
    expect(irNode(effect?.actions?.[0])?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["digivolutionCards"],
      payCost: false,
      optional: true,
      target: {
        filter: {
          zone: "digivolutionCards",
          or: [
            { nameOrTrait: [{ tokens: ["Taomon"], match: "nameExact" }] },
            { colors: ["Blue", "Yellow"], levelComparison: { op: "lte", value: 4 } },
          ],
        },
        count: 1,
      },
    });
  });

  it("uses a qualifying Option for free after a public digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-028", as: "base" }],
          hand: [
            { card: "EX4-030", as: "kuzuhamon" },
            { card: "BT1-102", as: "option" },
          ],
          deck: [{ card: "BT1-009", as: "digivolutionDraw" }, { card: "BT1-010", as: "optionDraw" }, "BT1-011"],
          security: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    const optionId = s.inst("option").instanceId;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kuzuhamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === optionId) &&
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("optionDraw").instanceId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(optionId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("digivolutionDraw").instanceId, s.inst("optionDraw").instanceId]),
    );
    expect(observe(s.engine).grantedNames(s.perm("kuzuhamon"))).toContain("sakuyamon");
  });

  it("uses the exact cost-five Option boundary without paying memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-028", as: "base" }],
          hand: [
            { card: "EX4-030", as: "kuzuhamon" },
            { card: "BT1-106", as: "option" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kuzuhamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === optionId));
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(optionId);
    expect(s.state.memory).toBe(0);
  });

  it("does not use a cost-six Option during digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-028", as: "base" }],
          hand: [
            { card: "EX4-030", as: "kuzuhamon" },
            { card: "BT1-107", as: "option" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kuzuhamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX4-030");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(optionId);
  });

  it("allows refusing the optional free Option use", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-028", as: "base" }],
          hand: [
            { card: "EX4-030", as: "kuzuhamon" },
            { card: "BT1-102", as: "option" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: false, autoDeclineOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kuzuhamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX4-030");

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(optionId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(optionId);
  });

  it("plays an exact Taomon name from the stack after the Option watcher fires", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-028", as: "host", under: ["BT10-039"] }],
          hand: [
            { card: "EX4-030", as: "kuzuhamon" },
            { card: "BT1-102", as: "option" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("kuzuhamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "BT10-039"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "BT10-039")).toBe(true);
  });

  it("does not play a non-Taomon level-five source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-030", as: "kuzuhamon", under: ["BT1-060"] }],
          hand: [{ card: "BT1-102", as: "option" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sourcePermanentId = s.perm("kuzuhamon").permanentId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-102"));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.permanentId).toBe(sourcePermanentId);
    expect(s.perm("kuzuhamon").stack.map((card) => card.cardId)).toEqual(["BT1-060"]);
  });

  it("plays an eligible digivolution card from a stack after a real cost-two Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-028", as: "host", under: ["BT1-036"] }],
          hand: [
            { card: "EX4-030", as: "kuzuhamon" },
            { card: "BT1-102", as: "optionOnDigivolve" },
            { card: "BT1-102", as: "option" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("kuzuhamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "EX4-030");
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-036"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-036")).toBe(true);
  });

  it("triggers for the free Option use during its own public digivolution (Q5490/Q5494/Q5502)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-028", as: "host", under: ["BT1-036"] }],
          hand: [
            { card: "EX4-030", as: "kuzuhamon" },
            { card: "BT1-102", as: "option" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("kuzuhamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "EX4-030");

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "BT1-036")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-102")).toBe(true);
  });

  it("fires only once per turn and re-arms on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-030", as: "kuzuhamon", under: ["BT1-036", "BT1-051"] }],
          hand: [
            { card: "BT1-102", as: "first" },
            { card: "BT1-102", as: "second" },
            { card: "BT1-102", as: "third" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-013", "BT1-014"],
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    s.state.turnSeat = 0;
    const secondOptionId = s.inst("second").instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "BT1-036"));
    expect(
      s.state.players[0]!.battleArea.filter((perm) => ["BT1-036", "BT1-051"].includes(perm.topCard.cardId)),
    ).toHaveLength(1);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === secondOptionId));
    expect(
      s.state.players[0]!.battleArea.filter((perm) => ["BT1-036", "BT1-051"].includes(perm.topCard.cardId)),
    ).toHaveLength(1);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("third").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.filter((perm) => ["BT1-036", "BT1-051"].includes(perm.topCard.cardId)).length ===
        2,
    );
    expect(
      s.state.players[0]!.battleArea.filter((perm) => ["BT1-036", "BT1-051"].includes(perm.topCard.cardId)),
    ).toHaveLength(2);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("EX4-030 Kuzuhamon — KB Q&A rulings", () => {
  const DECK = ["BT1-009", "BT1-010", "BT1-011", "BT1-012"];
  const SECURITY = ["BT1-009", "BT1-013", "BT1-009"];

  function stackCardWasPlayed(s: ReturnType<typeof setupEngine>, alias: string): boolean {
    return s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst(alias).instanceId);
  }

  it("is not a [Sakuyamon] target for Rika Nonaka's Renamon digivolution (Q2868)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-085", as: "rika" },
            { card: "BT17-031", as: "renamon" },
          ],
          trash: ["BT17-032", "BT17-035"],
          hand: [{ card: "EX4-030", as: "kuzuhamon" }],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const rikaId = s.perm("rika").topCard.instanceId;
    const mainEffect = effectsOf(EffectTiming.OnDeclaration, observe(s.engine).cardSource(s.perm("rika"))).find(
      (entry) => entry.effectKey.startsWith("BT17-085/"),
    );
    expect(mainEffect).toBeDefined();

    s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: rikaId, effectKey: mainEffect!.effectKey });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("renamon").topCard.cardId).toBe("BT17-031");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("kuzuhamon").instanceId);
  });

  it("activates only after the used Option's [Main] effect has resolved (Q3473)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-030", as: "kuzuhamon", under: [{ card: "BT1-036", as: "garurumon" }] }],
          hand: [{ card: "BT1-102", as: "option" }],
          deck: [{ card: "BT1-013", as: "drawnByMain" }, ...DECK],
          security: SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => stackCardWasPlayed(s, "garurumon"));

    const movedIndex = (instanceId: string) =>
      s.events.findIndex((event) => event.kind === "cardsMoved" && event.instanceIds.includes(instanceId));
    const drawIndex = movedIndex(s.inst("drawnByMain").instanceId);
    const playIndex = movedIndex(s.inst("garurumon").instanceId);
    expect(drawIndex).toBeGreaterThanOrEqual(0);
    expect(playIndex).toBeGreaterThan(drawIndex);
  });

  it("is a legal Digital Translator destination from a chosen Sakuyamon (Q3474/Q3516)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-044", as: "sakuyamon" },
            { card: "EX4-064", as: "tamer" },
          ],
          hand: [
            { card: "EX4-072", as: "translator" },
            { card: "EX4-030", as: "kuzuhamon" },
          ],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("translator").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("sakuyamon").topCard.cardId === "EX4-030");

    expect(s.perm("sakuyamon").topCard.instanceId).toBe(s.inst("kuzuhamon").instanceId);
    expect(s.perm("sakuyamon").stack.map((card) => card.cardId)).toEqual(["BT5-044"]);
    expect(s.state.memory).toBe(0);
  });

  it("cannot be chosen by Digital Translator to digivolve into Sakuyamon (Q3517)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-030", as: "kuzuhamon" },
            { card: "EX4-064", as: "tamer" },
          ],
          hand: [
            { card: "EX4-072", as: "translator" },
            { card: "BT5-044", as: "sakuyamon" },
          ],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const translatorId = s.inst("translator").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: translatorId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === translatorId));

    expect(s.perm("kuzuhamon").topCard.cardId).toBe("EX4-030");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("sakuyamon").instanceId);
  });

  it("is chosen by text naming cards with [Sakuyamon] in their names (Q3475)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-019", as: "renamon" }],
          deck: [{ card: "EX4-030", as: "kuzuhamon" }, "BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("renamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("kuzuhamon").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX4-030"]);
  });

  it("does not trigger when an Option's <Delay> effect activates without the card being used (Q5499)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-030", as: "kuzuhamon", under: [{ card: "BT1-036", as: "garurumon" }] },
            { card: "EX4-070", as: "delayOption" },
          ],
          deck: DECK,
          security: SECURITY,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 2;
    await s.ready();
    const delayOptionId = s.inst("delayOption").instanceId;
    const delay = observe(s.engine).activatableEffects(s.perm("delayOption")) as Array<{ effectKey: string }>;
    expect(delay).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: delayOptionId,
        effectKey: delay[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 4 && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(delayOptionId);
    expect(stackCardWasPlayed(s, "garurumon")).toBe(false);
    expect(s.perm("kuzuhamon").stack.map((card) => card.instanceId)).toEqual([s.inst("garurumon").instanceId]);
  });

  it("does not trigger when the Option's own use cost is reduced below two (Q5500)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-030", as: "kuzuhamon", under: [{ card: "BT1-036", as: "garurumon" }] },
            { card: "BT1-009", as: "redSource" },
          ],
          hand: [{ card: "BT8-097", as: "option" }],
          deck: DECK,
          security: SECURITY,
        },
        1: {
          battleArea: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          deck: DECK,
          security: SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === optionId) && s.state.pendingDecision === undefined,
    );

    expect(s.state.memory).toBe(10);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(stackCardWasPlayed(s, "garurumon")).toBe(false);
  });

  it("triggers when only the payment is reduced and the printed use cost is at least two (Q5501)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-030", as: "kuzuhamon", under: [{ card: "BT1-036", as: "garurumon" }] },
            { card: "BT10-071", as: "purple" },
          ],
          hand: [{ card: "BT16-100", as: "option" }],
          deck: DECK,
          security: ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009", "BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-019", as: "deleted" }], deck: DECK, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => stackCardWasPlayed(s, "garurumon"));

    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(stackCardWasPlayed(s, "garurumon")).toBe(true);
  });
});
