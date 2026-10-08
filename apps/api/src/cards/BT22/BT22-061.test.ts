import { Zone } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT22-061.js";

describe("BT22-061 Vademon", () => {
  it("reduces only Ver.2 digivolutions into Vademon by its face-down stack count", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, colors: ["Black"], cost: 4, isAlternate: false },
      { namesExact: ["Vegiemon"], cost: 3, isAlternate: true },
      { level: 4, traits: ["DM"], cost: 4, isAlternate: true },
    ]);
    const replacement = compiled.effects.find((entry) => entry.trigger === "Static")?.actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      into: { nameOrTrait: [{ tokens: ["Vademon"], match: "name" }] },
      actions: [
        {
          mode: "reduceCost",
          amount: 1,
          scaling: { per: 1, unit: "digivolutionCards", filter: { isSelfRef: true, faceDown: true } },
        },
      ],
    });
  });

  it("trashes the bottom face-down card before the shared once-per-turn De-Digivolve and return", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
      expect(effect?.actions[1]).toMatchObject({
        kind: "Return",
        to: "hand",
        cost: {
          kind: "trash",
          target: { filter: { isSelfRef: true, faceDown: true, position: "bottom" }, isSelf: true },
        },
      });
    }
  });

  it("redirects an opponent's attack to its host once per turn", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
              optional: true,
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            },
          ],
        },
      ],
    });
  });

  it("stacks face-down reductions, then De-Digivolves, pays the bottom source, and returns", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT22-049",
              as: "vegiemon",
            },
          ],
          hand: [
            { card: "BT22-049", as: "faceDownOne" },
            { card: "BT22-049", as: "faceDownTwo" },
            { card: "BT22-061", as: "vademon" },
          ],
        },
        1: { battleArea: [{ card: "BT22-071", as: "target", under: ["BT1-009"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.placeUnder(s.perm("vegiemon").permanentId, [
      s.inst("faceDownOne").instanceId,
      s.inst("faceDownTwo").instanceId,
    ]);
    for (const alias of ["faceDownOne", "faceDownTwo"]) {
      s.perm("vegiemon").stack.find((card) => card.instanceId === s.inst(alias).instanceId)!.faceUp = false;
    }
    const targetTopId = s.perm("target").topCard!.instanceId;
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("vegiemon").permanentId,
        instanceId: s.inst("vademon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT1-009"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === targetTopId)).toBe(true);
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT22-049")).toHaveLength(1);
  });
});

describe("BT22-061 Vademon — KB Q&A rulings", () => {
  async function digivolveWithMeat(faceDownAlready: number) {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-070", as: "meat" },
            {
              card: "EX9-017",
              as: "garurumon",
              under: Array.from({ length: faceDownAlready }, () => ({ card: "BT1-001", faceUp: false })),
            },
          ],
          hand: [
            { card: "BT1-009", as: "placed" },
            { card: "BT22-061", as: "vademon" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("placed").instanceId);
    s.state.memory = 3;
    await s.ready();
    const delay = observe(s.engine)
      .activatableEffects(s.perm("meat"))
      .find((entry) => /Delay/i.test(entry.description ?? ""));
    expect(delay).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("meat").topCard.instanceId,
        effectKey: delay!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("garurumon").topCard.cardId === "BT22-061");
    await settle(() => s.state.pendingDecision === undefined);
    return s;
  }

  it("stacks Meat's -2 with -1 per face-down digivolution card, counting the card Meat placed (Q4915)", async () => {
    const withEarlierFaceDown = await digivolveWithMeat(1);
    expect(withEarlierFaceDown.state.memory).toBe(3);

    const onlyMeatsFaceDown = await digivolveWithMeat(0);
    expect(onlyMeatsFaceDown.state.memory).toBe(2);
  });
});

describe("Discord 1557652222744199228 Vademon return memory", () => {
  for (const actor of [0, 1] as const) {
    for (const target of ["BT1-085", "BT14-014", "BT1-013"] as const) {
      it(`seat ${actor} returns ${target} without charging its own face-down ACE payment`, async () => {
        const opponent = actor === 0 ? 1 : 0;
        const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
        s.putOnBoard(actor, {
          card: "BT22-049",
          as: "base",
          under: [{ card: "EX9-013", as: "payment", faceUp: false }],
        });
        s.putOnBoard(opponent, { card: target, as: "target" });
        s.give(actor, Zone.Hand, { card: "BT22-061", as: "vademon" });
        s.state.turnSeat = actor;
        s.state.memory = 6;
        await s.ready();
        const targetId = s.inst("target").instanceId;
        expect(
          s.engine.applyIntent(actor, {
            type: "digivolve",
            permanentId: s.perm("base").permanentId,
            instanceId: s.inst("vademon").instanceId,
          }),
        ).toEqual({ ok: true });
        await settle(
          () =>
            s.state.players[opponent]!.hand.some((card) => card.instanceId === targetId) &&
            s.state.pendingDecision === undefined,
        );
        expect(s.state.players[actor]!.trash.some((card) => card.instanceId === s.inst("payment").instanceId)).toBe(
          true,
        );
        expect(s.state.memory).toBe(target === "BT14-014" ? 7 : 4);
        expect(s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "overflow")).toHaveLength(
          target === "BT14-014" ? 1 : 0,
        );
        expect(s.state.players[actor]!.hand.some((card) => card.instanceId === targetId)).toBe(false);
      });
    }
  }

  for (const control of ["cost5", "noSource", "decline"] as const) {
    it(`${control} prevents Vademon's return and charges no Overflow`, async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: "BT22-049",
                as: "base",
                under: control === "noSource" ? [] : [{ card: "EX9-013", as: "payment", faceUp: false }],
              },
            ],
            hand: [{ card: "BT22-061", as: "vademon" }],
          },
          1: { battleArea: [{ card: control === "cost5" ? "BT1-020" : "BT1-085", as: "target" }] },
        },
        {
          autoAcceptOptional: control !== "decline",
          autoSelectCards: true,
          autoDeclineOptional: control === "decline",
        },
      );
      s.state.memory = 6;
      await s.ready();
      const targetId = s.inst("target").instanceId;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("vademon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT22-061") &&
          s.state.pendingDecision === undefined,
      );
      expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === targetId)).toBe(true);
      expect(s.state.memory).toBe(control === "noSource" ? 3 : 4);
      expect(s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "overflow")).toHaveLength(0);
      expect(s.perm("base").stack.filter((card) => !card.faceUp)).toHaveLength(control === "decline" ? 1 : 0);
    });
  }
});

describe("Discord 1557652222744199228 Vademon returned ACE sources", () => {
  for (const actor of [0, 1] as const) {
    for (const faceUp of [false, true]) {
      it(`seat ${actor} returns a cost-3 Digimon with a ${faceUp ? "face-up" : "face-down"} ACE source`, async () => {
        const opponent = actor === 0 ? 1 : 0;
        const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
        s.putOnBoard(actor, {
          card: "BT22-049",
          as: "base",
          under: [{ card: "EX9-013", as: "payment", faceUp: false }],
        });
        // Level 3 cannot be De-Digivolved, so the returned top and trashed attachment are unambiguous.
        s.putOnBoard(opponent, {
          card: "BT1-013",
          as: "target",
          under: [{ card: "EX9-013", as: "attachment", faceUp }],
        });
        s.give(actor, Zone.Hand, { card: "BT22-061", as: "vademon" });
        s.state.turnSeat = actor;
        s.state.memory = 6;
        await s.ready();
        const targetId = s.inst("target").instanceId;
        expect(
          s.engine.applyIntent(actor, {
            type: "digivolve",
            permanentId: s.perm("base").permanentId,
            instanceId: s.inst("vademon").instanceId,
          }),
        ).toEqual({ ok: true });
        await settle(
          () =>
            s.state.players[opponent]!.hand.some((card) => card.instanceId === targetId) &&
            s.state.pendingDecision === undefined,
        );
        expect(
          s.state.players[opponent]!.trash.some((card) => card.instanceId === s.inst("attachment").instanceId),
        ).toBe(true);
        expect(s.state.memory).toBe(faceUp ? 8 : 4);
        expect(s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "overflow")).toHaveLength(
          faceUp ? 1 : 0,
        );
      });
    }
  }
});
