import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-066.js";

const DIGIVOLVE_LABELS = [
  "Digivolve 1 of your [Agumon] or [Greymon] into [BlitzGreymon] in your hand",
  "Digivolve 1 of your [Gabumon] or [Garurumon] into [CresGarurumon] in your hand",
];

describe("EX4-066 Adze Beast Blade and Shining Dragon Bullet", () => {
  it("offers the BlitzGreymon/CresGarurumon modal digivolutions", () => {
    const modal = compiled.effects?.find((entry) => entry.trigger === "Main")?.actions?.[0] as {
      kind?: string;
      labels?: string[];
      options?: unknown[][];
    };
    expect(modal.kind).toBe("Modal");
    expect(modal.labels).toEqual(DIGIVOLVE_LABELS);
    expect(modal.options).toMatchObject([
      [{ kind: "Digivolve", into: { nameOrTrait: [{ match: "nameExact", tokens: ["BlitzGreymon"] }] } }],
      [{ kind: "Digivolve", into: { nameOrTrait: [{ match: "nameExact", tokens: ["CresGarurumon"] }] } }],
    ]);
  });

  it("keeps every bracket-only name reference exact", () => {
    const matches: string[] = [];
    const visit = (value: unknown): void => {
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }
      if (value === null || typeof value !== "object") return;
      for (const [key, child] of Object.entries(value)) {
        if (key === "nameOrTrait" && Array.isArray(child)) {
          for (const entry of child) {
            if (entry && typeof entry === "object" && "match" in entry) matches.push(String(entry.match));
          }
        }
        visit(child);
      }
    };
    visit(compiled.effects);
    expect(matches).toHaveLength(7);
    expect(matches).toEqual(Array(7).fill("nameExact"));
  });
  it("has Security activation", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-066");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("does not play Agumon Expert for the exact Security name reference", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "EX4-066", as: "security" }],
        hand: [{ card: "BT1-011", as: "expert" }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }], deck: ["BT1-011", "BT1-012"] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("security").instanceId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-011")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("expert").instanceId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("digivolves Gabumon/Garurumon into CresGarurumon when BlitzGreymon is present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-051", as: "blitz" },
            { card: "BT1-029", as: "gabumon" },
          ],
          hand: [
            { card: "EX4-066", as: "subject" },
            { card: "EX4-049", as: "cres" },
          ],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    const subjectId = s.inst("subject").instanceId;
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: subjectId })).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.hand.some((card) => card.instanceId === subjectId));

    expect(s.perm("gabumon").topCard?.cardId).toBe("EX4-049");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cres").instanceId)).toBe(false);
  });

  it("names each digivolution in the choice when both partners are in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-051", as: "blitz" },
            { card: "EX4-049", as: "cres" },
            { card: "BT1-010", as: "agumon" },
            { card: "BT1-029", as: "gabumon" },
          ],
          hand: [
            { card: "EX4-066", as: "subject" },
            { card: "EX4-051", as: "handBlitz" },
            { card: "EX4-049", as: "handCres" },
          ],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    const subjectId = s.inst("subject").instanceId;
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: subjectId })).toEqual({ ok: true });
    await settle(() => s.perm("gabumon").topCard?.cardId === "EX4-049");

    // Only this card's own question: the digivolved partner may raise its own prompts afterwards.
    const choices = s.decisions
      .filter(({ req }) => req.kind === "chooseOption" && req.sourceCardId === "EX4-066")
      .map(({ req }) => req.options?.choices);
    expect(choices).toEqual([DIGIVOLVE_LABELS]);
    expect(s.perm("gabumon").topCard?.cardId).toBe("EX4-049");
    expect(s.perm("agumon").topCard?.cardId).toBe("BT1-010");
  });

  it("does not offer a Main digivolution when neither named partner is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "agumon" },
            { card: "BT1-031", as: "blue" },
          ],
          hand: [
            { card: "EX4-066", as: "subject" },
            { card: "EX4-051", as: "blitz" },
          ],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    const subjectId = s.inst("subject").instanceId;
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: subjectId })).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.hand.some((card) => card.instanceId === subjectId));

    expect(s.perm("agumon").topCard?.cardId).toBe("BT1-010");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("blitz").instanceId)).toBe(true);
  });

  it("may play a matching Agumon from trash on Security and returns itself to hand", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "EX4-066", as: "security" }],
          trash: [{ card: "BT1-010", as: "trashedAgumon" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const memoryBefore = s.state.memory;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("trashedAgumon").instanceId,
      ),
    );

    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("trashedAgumon").instanceId,
      ),
    ).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("security").instanceId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("trashedAgumon").instanceId)).toBe(
      false,
    );
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  ex4CardBehaviorTests("EX4-066");
});
