import { CardKind, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-067.js";
import "../index.js";

const CARD_ID = "LM-067";
const FILLER = ["BT1-027", "BT1-028", "BT1-045", "BT1-047", "BT1-050"];
/** The digivolve draw takes the top card, so the interesting card sits second. */
const deckWith = (...cards: string[]): string[] => ["BT1-065", ...cards, ...FILLER];

describe("LM-067 Gundramon / Gewalt Schwärmer", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Gundramon",
      colors: ["Black"],
      kinds: [CardKind.Digimon, CardKind.Option],
      level: 6,
      playCost: 6,
      dp: 13000,
      isDualCard: true,
    });
    const ir = runtimeCompiledCard(CARD_ID);
    expect(ir).toMatchObject({ coverage: "full", residual: [] });
    expect(ir?.effects[0]?.keywords).toEqual([
      { keyword: "Reboot", raw: "＜Reboot＞" },
      { keyword: "Blocker", raw: "＜Blocker＞" },
      { keyword: "Fragment", amount: 3, raw: "＜Fragment (3)＞" },
    ]);
    expect(ir?.digivolutionRequirement).toEqual([
      { level: 5, texts: ["Three Musketeers"], cost: 4, isAlternate: true },
      { level: 5, traits: ["TS"], cost: 4, isAlternate: true },
    ]);
  });

  it("digivolves off an off-color Lv.5 with the [TS] trait but not off a plain Lv.5", async () => {
    const withTrait = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-083", as: "base" }],
          hand: [{ card: CARD_ID, as: "gundramon" }],
          deck: deckWith(),
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    withTrait.state.memory = 5;
    await withTrait.ready();
    expect(
      withTrait.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: withTrait.perm("base").permanentId,
        instanceId: withTrait.inst("gundramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => withTrait.perm("base").topCard?.cardId === CARD_ID);
    expect(withTrait.state.memory).toBe(1);

    const plain = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-078", as: "base" }],
          hand: [{ card: CARD_ID, as: "gundramon" }],
          deck: deckWith(),
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    plain.state.memory = 5;
    await plain.ready();
    expect(
      plain.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: plain.perm("base").permanentId,
        instanceId: plain.inst("gundramon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("digivolves off a Lv.5 with [Three Musketeers] in text but no [TS] trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-044", as: "base" }],
          hand: [{ card: CARD_ID, as: "gundramon" }],
          deck: deckWith(),
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gundramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === CARD_ID);
    expect(s.state.memory).toBe(1);
  });

  it("reveals six on digivolve and plays a cost 6 [Three Musketeers] card for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-064", as: "base" }],
          hand: [{ card: CARD_ID, as: "gundramon" }],
          deck: deckWith("EX7-059"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gundramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX7-059"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("EX7-059");
    expect(s.state.players[0]!.deck).toHaveLength(5);
    expect(s.state.memory).toBe(1);
  });

  it("leaves a play cost 7 [Three Musketeers] card in the deck, one over the cost 6 bound", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-064", as: "base" }],
          hand: [{ card: CARD_ID, as: "gundramon" }],
          deck: deckWith("EX7-044"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gundramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === CARD_ID);

    expect(s.state.players[0]!.deck).toHaveLength(6);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toContain("EX7-044");
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("spends the shared [Once Per Turn] reveal on the digivolve window, blocking the [Counter] one", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-064", as: "base" }],
          hand: [{ card: CARD_ID, as: "gundramon" }],
          deck: [...deckWith("EX7-059"), "EX7-059", ...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gundramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX7-059"));
    const deckAfterFirst = s.state.players[0]!.deck.length;

    await advance(s.engine).fireForPermanent(EffectTiming.OnCounterTiming, s.perm("base"));

    expect(s.state.players[0]!.deck).toHaveLength(deckAfterFirst);
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "EX7-059")).toHaveLength(1);
  });

  it("trashes its [Three Musketeers] digivolution cards when attacking and deletes one small Digimon each", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "gundramon",
              under: [
                { card: "BT25-078", as: "musketeerA" },
                { card: "BT25-082", as: "musketeerB" },
                { card: "BT1-027", as: "plain" },
              ],
            },
          ],
          deck: deckWith(),
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "small1" },
            { card: "BT1-013", as: "small2" },
            { card: "BT6-065", as: "big" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gundramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT6-065"]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("musketeerA").instanceId, s.inst("musketeerB").instanceId]),
    );
    expect(s.perm("gundramon").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("plain").instanceId);
  });

  it("deletes nothing when no [Three Musketeers] digivolution card can be trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "gundramon", under: [{ card: "BT1-027", as: "plain" }] }],
          deck: deckWith(),
        },
        1: { battleArea: [{ card: "BT1-009", as: "small" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gundramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length >= 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("gundramon").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("plain").instanceId);
  });

  it("resolves the shared [Once Per Turn] reveal when [Counter] is the first use of the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "gundramon", under: [{ card: "BT10-064" }] }],
          deck: ["EX7-059", ...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    // No Intent produces a [Counter] window without an opposing attack, and the point here is
    // the reveal itself rather than the counter timing's own plumbing.
    await advance(s.engine).fireForPermanent(EffectTiming.OnCounterTiming, s.perm("gundramon"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX7-059"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("EX7-059");
    expect(s.state.players[0]!.deck).toHaveLength(5);
  });

  it("trashes at most 3 [Three Musketeers] cards and deletes at most 3 Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "gundramon",
              under: [
                { card: "BT25-078", as: "m1" },
                { card: "BT25-082", as: "m2" },
                { card: "BT6-068", as: "m3" },
                { card: "EX7-051", as: "m4" },
              ],
            },
          ],
          deck: deckWith(),
        },
        1: {
          battleArea: [{ card: "BT1-009" }, { card: "BT1-013" }, { card: "BT1-027" }, { card: "BT1-028" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gundramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("gundramon").stack).toHaveLength(1);
    const musketeerIds = ["m1", "m2", "m3", "m4"].map((key) => s.inst(key).instanceId);
    const trashed = s.state.players[0]!.trash.filter(({ instanceId }) => musketeerIds.includes(instanceId));
    expect(trashed).toHaveLength(3);
  });

  it("deletes a play cost 7 Digimon but leaves a play cost 8 one alone", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "gundramon", under: [{ card: "BT25-078", as: "musketeer" }] }],
          deck: deckWith(),
        },
        1: {
          battleArea: [
            { card: "BT9-053", as: "oversized" },
            { card: "BT1-024", as: "atBound" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gundramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT9-053"]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("musketeer").instanceId);
  });

  it("may still pay its processing cost when no Digimon is small enough to delete", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "gundramon", under: [{ card: "BT25-078", as: "musketeer" }] }],
          deck: deckWith(),
        },
        1: { battleArea: [{ card: "BT9-053", as: "oversized" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gundramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length >= 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("gundramon").stack.map(({ instanceId }) => instanceId)).not.toContain(
      s.inst("musketeer").instanceId,
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("musketeer").instanceId);
  });

  it("gates the Option side on <Use Req. ([Three Musketeers] in text)> without a Black source", async () => {
    const seat = (musketeerInPlay: boolean) =>
      setupEngine(
        {
          0: {
            battleArea: musketeerInPlay ? [{ card: "BT25-078", as: "musketeer" }] : [{ card: "BT1-013", as: "plain" }],
            hand: [{ card: CARD_ID, as: "option" }],
          },
          1: {
            battleArea: [
              { card: "BT2-078", as: "a", under: [{ card: "BT1-009" }] },
              { card: "BT2-078", as: "b", under: [{ card: "BT1-013" }] },
              { card: "BT2-078", as: "c", under: [{ card: "BT1-027" }] },
            ],
          },
        },
        {
          autoAcceptOptional: true,
          autoSelectCards: true,
          autoChooseOption: true,
          declinePrompts: ["Arts Digivolve"],
        },
      );

    const blocked = seat(false);
    blocked.state.memory = 6;
    await blocked.ready();
    expect(
      blocked.engine.applyIntent(0, {
        type: "playCard",
        instanceId: blocked.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });

    const allowed = seat(true);
    allowed.state.memory = 6;
    await allowed.ready();
    expect(
      allowed.engine.applyIntent(0, {
        type: "playCard",
        instanceId: allowed.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
  });

  it("de-digivolves three opposing Digimon and places a [Three Musketeers] card as the Option side", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-064", as: "host" }],
          hand: [
            { card: CARD_ID, as: "option" },
            { card: "EX7-070", as: "musketeer" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT2-078", as: "a", under: [{ card: "BT1-009" }] },
            { card: "BT2-078", as: "b", under: [{ card: "BT1-013" }] },
            { card: "BT2-078", as: "c", under: [{ card: "BT1-027" }] },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        declinePrompts: ["Arts Digivolve"],
      },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("option").instanceId));

    for (const key of ["a", "b", "c"] as const) {
      expect(s.perm(key).topCard.cardId).not.toBe("BT2-078");
      expect(s.perm(key).stack).toHaveLength(0);
    }
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("musketeer").instanceId);
  });

  it("fires the reveal and the trash-and-delete window together on the digivolve", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT10-064",
              as: "base",
              under: [
                { card: "BT25-078", as: "musketeerA" },
                { card: "BT25-082", as: "musketeerB" },
              ],
            },
          ],
          hand: [{ card: CARD_ID, as: "gundramon" }],
          deck: deckWith("EX7-059"),
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "small1" },
            { card: "BT1-013", as: "small2" },
            { card: "BT9-053", as: "oversized" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gundramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT9-053"]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("musketeerA").instanceId, s.inst("musketeerB").instanceId]),
    );
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("EX7-059");
  });

  it("allows three deletions on the digivolve window and three more when it attacks the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT10-064",
              as: "base",
              under: [
                { card: "BT25-078", as: "m1" },
                { card: "BT25-078", as: "m2" },
                { card: "BT25-078", as: "m3" },
                { card: "BT6-068", as: "m4" },
                { card: "BT6-068", as: "m5" },
                { card: "BT6-068", as: "m6" },
              ],
            },
          ],
          hand: [{ card: CARD_ID, as: "gundramon" }],
          deck: deckWith(),
        },
        1: {
          battleArea: [
            { card: "BT1-009" },
            { card: "BT1-013" },
            { card: "BT1-027" },
            { card: "BT1-028" },
            { card: "BT1-045" },
            { card: "BT1-047" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gundramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 3);
    expect(s.state.players[1]!.battleArea).toHaveLength(3);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    const musketeerIds = ["m1", "m2", "m3", "m4", "m5", "m6"].map((key) => s.inst(key).instanceId);
    const trashed = s.state.players[0]!.trash.filter(({ instanceId }) => musketeerIds.includes(instanceId));
    expect(trashed).toHaveLength(6);
  });

  it("uses a revealed [Three Musketeers] Option instead of playing it in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-064", as: "base" }],
          hand: [{ card: CARD_ID, as: "gundramon" }],
          deck: deckWith("EX7-070"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gundramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ stack }) => stack.some(({ cardId }) => cardId === "EX7-070")),
    );

    // "play OR use": the Option side USES the revealed card instead of creating a permanent.
    // Its own [Main] places it under Gundramon, then Gundramon's accepted processing cost
    // immediately trashes that [Three Musketeers]-text source.
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).not.toContain("EX7-070");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX7-070");
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).not.toContain("EX7-070");
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).not.toContain("EX7-070");
  });

  it("returns the unchosen revealed cards to the bottom of the deck in order", async () => {
    const tail = ["BT1-045", "BT1-047", "BT1-050", "BT1-065"];
    const top = ["BT1-021", "BT1-027", "BT1-028", "BT1-009", "BT1-013", "BT1-024"];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-064", as: "base" }],
          hand: [{ card: CARD_ID, as: "gundramon" }],
          // The digivolve draw takes the leading card, so `top` is what the reveal sees.
          deck: ["BT1-050", ...top, ...tail],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gundramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck[0]?.cardId === "BT1-045");

    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual([...tail, ...top]);
  });

  it("resolves the [Counter] reveal from a real counter window opened by an opposing attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }], security: ["BT1-001"] },
        1: {
          battleArea: [{ card: CARD_ID, as: "gundramon", under: [{ card: "BT10-064" }] }],
          deck: ["EX7-059", ...FILLER],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"), 5000);
    const counter = s.events.find((event) => event.kind === "counterWindowOpened");
    if (counter?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = counter.eligibleCounters.find((entry) => entry.instanceId === s.inst("gundramon").instanceId);
    expect(eligible).toBeDefined();

    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX7-059"), 5000);

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("EX7-059");
  });
});
