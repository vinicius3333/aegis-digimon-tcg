import { Zone } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";
import { advance } from "./testkit/advance.js";
const deck = Array(12).fill("BT1-009");
it("GitHub #5053: nested Takato should offer Blitz", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "EX2-009", as: "base", under: ["EX13-001"] }],
        hand: [
          { card: "AD1-003", as: "war" },
          { card: "EX13-015", as: "gallant" },
        ],
        trash: [{ card: "EX2-056", as: "takato" }],
        deck,
      },
      1: { deck, security: ["BT1-009", "BT1-009", "BT1-009"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
  );
  s.state.memory = 1;
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("war").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX13-015");
    await new Promise((resolve) => setImmediate(resolve));
    expect(s.decisions.some((d) => d.req.promptText?.includes("Blitz"))).toBe(true);
    expect(s.engine.hasAcceptedBlitzAttack(s.perm("base").permanentId)).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "attackDeclared"));
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
it("GitHub #5046: Rosemon free DUAL offers Arts", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT26-049", as: "rose" }],
        hand: [{ card: "BT26-050", as: "dual" }],
        deck,
        security: ["BT1-009"],
      },
      1: {
        deck,
        battleArea: [
          { card: "BT1-085", as: "a" },
          { card: "BT1-086", as: "b" },
          { card: "BT1-087", as: "c" },
        ],
        security: ["BT1-009", "BT1-009"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
  );
  s.state.memory = 5;
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("rose").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rose").topCard.cardId === "BT26-050" || s.state.pendingDecision !== undefined);
    expect(s.decisions.some((d) => d.req.promptText?.includes("Arts Digivolve"))).toBe(true);
    expect(s.perm("rose").topCard.cardId).toBe("BT26-050");
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
it("GitHub #5051: Kanan nested DUAL offers Arts", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT26-090", as: "kanan" },
          { card: "BT24-014", as: "base" },
        ],
        hand: [{ card: "BT26-033", as: "dual" }],
        deck,
        security: ["BT1-009", "BT1-009", "BT1-009"],
      },
      1: { deck, battleArea: ["BT1-009"], security: ["BT1-009", "BT1-009"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
  );
  s.state.memory = 1;
  const turn = s.engine.runOneTurn();
  try {
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    expect(s.decisions.some((d) => d.req.promptText?.includes("Arts Digivolve"))).toBe(true);
    expect(s.perm("base").topCard.cardId).toBe("BT26-033");
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
  }
});
it("GitHub #5051: two face-up Sirenmon plus Kanan resolve sequentially", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT26-090", as: "kanan" },
          { card: "BT24-014", as: "base" },
        ],
        hand: [
          { card: "BT26-033", as: "dual" },
          { card: "BT25-059", as: "ceres1" },
          { card: "BT25-059", as: "ceres2" },
        ],
        deck,
        security: [
          "BT1-009",
          { card: "BT25-039", as: "siren1", faceUp: true },
          { card: "BT25-039", as: "siren2", faceUp: true },
        ],
      },
      1: { deck, battleArea: ["BT1-009"], security: ["BT1-009", "BT1-009"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferTriggerKeys: ["BT26-090"] },
  );
  s.state.memory = 1;
  const turn = s.engine.runOneTurn();
  try {
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    expect(s.decisions.some((d) => d.req.promptText?.includes("Arts Digivolve"))).toBe(true);
    expect(s.perm("base").topCard.cardId).toBe("BT26-033");
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "BT25-059")).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
  }
});
it.each(["AD1-006", "BT19-014"])("GitHub #5061: Kotone plays %s but needs Rush for Taiki attack", async (card) => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "P-224", as: "kotone", under: [{ card, as: "arriving" }] },
          { card: "BT21-083", as: "taiki" },
        ],
        deck,
      },
      1: { deck, security: ["BT1-009", "BT1-009"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
  );
  s.state.memory = 20;
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(0);
    const effect = observe(s.engine).activatableEffects(s.perm("kotone"))[0];
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("kotone").instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("arriving").instanceId) &&
        s.state.pendingDecision === undefined,
    );
    await new Promise((resolve) => setImmediate(resolve));
    expect(s.decisions.some((d) => d.req.sourceCardId === "BT21-083" && d.req.kind === "optional")).toBe(true);
    expect(s.perm("taiki").isSuspended).toBe(true);
    expect(s.events.some((e) => e.kind === "attackDeclared")).toBe(false);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
it.each(["AD1-006", "BT19-014"])(
  "GitHub #5061: Kotone plays %s with Rush DigiXros source so Taiki attacks",
  async (card) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-224", as: "kotone", under: [{ card, as: "arriving" }] },
            { card: "BT21-083", as: "taiki" },
          ],
          deck,
        },
        1: { deck, security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 20;
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      s.give(0, Zone.Hand, { card: "BT19-012", as: "rush" });
      const effect = observe(s.engine).activatableEffects(s.perm("kotone"))[0];
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: s.inst("kotone").instanceId,
          effectKey: effect!.effectKey,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((e) => e.kind === "attackDeclared"));
      expect(s.perm("taiki").isSuspended).toBe(true);
      expect(
        s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === s.inst("arriving").instanceId)?.stack.map(
          (c) => c.cardId,
        ),
      ).toContain("BT19-012");
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);
