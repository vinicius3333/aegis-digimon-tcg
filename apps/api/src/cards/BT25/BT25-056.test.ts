import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { findPermanent, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT25-056.js";

const CARD_ID = "BT25-056";

describe("BT25-056 Bootmon", () => {
  it("matches catalog, App Fusion, Barrier, and Q6340 Link legality", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Green", "Yellow"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ult.", "Appmon"],
      attributes: ["Tool"],
      types: ["Super Boot"],
      linkDp: 4000,
      linkRequirement: expect.stringContaining("[Appmon]"),
    });
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 3 }]);
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Logimon", "Craftmon"], cost: 0 }]);
    const links = compiled.effects.flatMap((effect) => effect.actions).filter((action) => action.kind === "Link");
    expect(links).toHaveLength(3);
    expect(links.every((action) => action.target.filter.hasLinkRequirement === true)).toBe(true);
    expect(links.every((action) => action.target.source === "thisDigimon")).toBe(true);
    expect(links.every((action) => action.from?.join(",") === "hand,digivolutionCards")).toBe(true);
  });

  it("On Play links only a legal Social/Tool/Game card at cost -2, then suspends an opponent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "boot" },
            { card: "BT26-010", as: "legalLink" },
            { card: "BT21-005", as: "appmonWithoutLink" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "opponentDigimon" },
            { card: "BT1-089", as: "opponentTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] },
    );
    s.state.memory = 8;
    const bootInstanceId = s.inst("boot").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("boot").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === bootInstanceId && permanent.linked.length === 1,
      ),
    );
    await settle(() => s.perm("opponentDigimon").isSuspended === true);
    const boot = findPermanent(s, 0, CARD_ID);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("appmonWithoutLink").instanceId)).toBe(
      true,
    );
    expect(boot.linked[0]?.instanceId).toBe(s.inst("legalLink").instanceId);
    expect(s.perm("opponentDigimon").isSuspended).toBe(true);
    expect(s.perm("opponentTamer").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(boot, "Barrier")).toBe(true);
  });

  it("When Digivolving can link a matching card from this Digimon's digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "host", under: [{ card: "BT21-041", as: "stackLink" }] }],
          hand: [{ card: CARD_ID, as: "boot" }],
        },
        1: {
          battleArea: [{ card: "BT1-089", as: "opponentTamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        instanceId: s.inst("boot").instanceId,
        permanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("stackLink").instanceId));

    expect(s.state.memory).toBe(1);
    expect(s.perm("host").topCard?.cardId).toBe(CARD_ID);
    expect(s.perm("host").linked[0]?.instanceId).toBe(s.inst("stackLink").instanceId);
    expect(s.perm("opponentTamer").isSuspended).toBe(true);
  });

  it.each([
    ["green", "BT1-069"],
    ["yellow", "BT1-051"],
  ] as const)("uses the ordinary %s Lv4 evolution at cost 4", async (_color, source) => {
    const s = setupEngine({
      0: { battleArea: [{ card: source, as: "source" }], hand: [{ card: CARD_ID, as: "boot" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("boot").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === CARD_ID);
    expect(s.state.memory).toBe(1);
    expect(s.perm("source").topCard?.cardId).toBe(CARD_ID);
  });

  it("rejects an off-color ordinary Lv4 source without changing hand or memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-019", as: "source" }], hand: [{ card: CARD_ID, as: "boot" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("boot").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain(CARD_ID);
  });

  it("App Fuses the printed Logimon and Craftmon pair at zero cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-052", as: "logimon", linked: [{ card: "BT25-036", as: "craftmon" }] }],
          hand: [{ card: CARD_ID, as: "boot" }],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("logimon").permanentId,
        instanceId: s.inst("boot").instanceId,
        appFusionLinkInstanceId: s.inst("craftmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("logimon").topCard.cardId === CARD_ID);
    expect(s.perm("logimon").stack.map(({ cardId }) => cardId)).toEqual(["BT25-036"]);
    expect(s.perm("logimon").linked.map(({ cardId }) => cardId)).toContain("BT25-052");
    expect(s.state.memory).toBe(0);
  });

  it("links from the printed When Attacking window at the reduced cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "attacker" }],
          hand: [{ card: "BT26-010", as: "link" }],
          security: ["BT1-001"],
        },
        1: { security: ["BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").linked.some(({ cardId }) => cardId === "BT26-010"));
    expect(s.perm("attacker").linked.map(({ cardId }) => cardId)).toContain("BT26-010");
    expect(s.state.memory).toBe(2);
  });

  it("accepts inherited Barrier in a real battle and pays one security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: CARD_ID, as: "host", dp: 7000, suspended: true }],
        security: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 8000 }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(
      s.engine.applyIntent(0, {
        type: "respondBarrier",
        permanentId: s.perm("host").permanentId,
        accept: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("allows inherited Barrier refusal to delete the host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: CARD_ID, as: "host", dp: 7000, suspended: true }],
        security: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 8000 }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(
      s.engine.applyIntent(0, {
        type: "respondBarrier",
        permanentId: s.perm("host").permanentId,
        accept: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("linked Bootmon fires in the same window and returns one suspended opposing Digimon to deck bottom", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-009", as: "host" }], hand: [{ card: CARD_ID, as: "bootLink" }] },
        1: {
          battleArea: [
            { card: "BT1-019", as: "suspended", suspended: true, under: ["BT1-009"] },
            { card: "BT1-013", as: "active" },
          ],
          deck: [{ card: "BT1-001", as: "sentinel" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.perm("suspended").topCard.cardId).toBe("BT1-019");
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("bootLink").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.some((card) => card.cardId === "BT1-019"));
    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-019");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("active").permanentId,
    ]);
  });

  it("an already linked Bootmon does not fire when a different physical card links later", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-009", as: "host", linked: [CARD_ID] }],
        hand: [{ card: "BT26-010", as: "other" }],
      },
      1: { battleArea: [{ card: "BT1-010", as: "target", suspended: true }] },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("other").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("other").instanceId));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("declining the optional link keeps the legal card in hand and does not spend memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "boot" },
            { card: "BT26-010", as: "link" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "opponent", suspended: false }] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 9;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("boot").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === CARD_ID));
    const boot = findPermanent(s, 0, CARD_ID);
    expect(boot.linked).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("link").instanceId);
    expect(s.state.memory).toBe(2);
    expect(s.perm("opponent").isSuspended).toBe(false);
  });
});
