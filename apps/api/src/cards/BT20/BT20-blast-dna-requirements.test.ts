import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
import "../BT1/index.js";
import "../BT3/index.js";
import "../BT7/index.js";
import "../BT13/index.js";
import "../BT15/index.js";

// CR 16-31-5: a Digimon card's DNA digivolution requirements can't be ignored for ＜Blast DNA
// Digivolve＞. The named materials must also meet the printed [DNA Digivolve] line, judged on the
// field Digimon's current state and the hand card's printed information.
function blastDnaFixture(ace: string, fieldCard: string, handCard: string) {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: fieldCard, as: "field" }],
        hand: [
          { card: handCard, as: "partner" },
          { card: ace, as: "ace" },
        ],
        deck: ["BT20-001", "BT20-002"],
        security: ["BT20-001"],
      },
      1: {
        battleArea: [{ card: "BT20-009", as: "attacker" }],
        security: ["BT20-001", "BT20-002"],
        deck: ["BT20-003", "BT20-004"],
      },
    },
    { autoDeclineOptional: true, autoSelectCards: true },
  );
  s.state.turnSeat = 1;
  return s;
}

type Fixture = ReturnType<typeof blastDnaFixture>;

async function attackAndCollectBlastDnaOffers(s: Fixture) {
  await s.ready();
  expect(
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(
    () => s.events.some((event) => event.kind === "counterWindowOpened") || !observe(s.engine).isAttacking(),
  );
  const counter = s.events.find((event) => event.kind === "counterWindowOpened");
  if (counter?.kind !== "counterWindowOpened") return [];
  return counter.eligibleCounters.filter(
    (entry) => entry.instanceId === s.inst("ace").instanceId && entry.effectKey.startsWith("blast-dna-digivolve:"),
  );
}

describe("Blast DNA Digivolve keeps the printed DNA requirement (CR 16-31-5)", () => {
  it.each([
    ["BT20-045 Examon: green Breakdramon field + blue Slayerdramon hand", "BT20-045", "BT20-044", "BT20-027"],
    ["BT20-045 Examon: blue Slayerdramon field + green Breakdramon hand", "BT20-045", "BT20-027", "BT20-044"],
    ["BT20-060 Ouryuken: black Alphamon + red Ouryumon (second requirement)", "BT20-060", "BT13-075", "BT20-018"],
    ["BT20-060 Ouryuken: yellow Alphamon + black Ouryumon (first requirement)", "BT20-060", "BT20-056", "BT15-067"],
    ["BT20-076 Dragon Mode: purple Dinobeemon + red Paildramon", "BT20-076", "BT20-074", "BT20-016"],
    ["BT20-081 Takemikazuchi: Fenriloogamon + Kazuchimon with [Pulsemon] in text", "BT20-081", "BT20-080", "BT20-035"],
  ])("allows %s", async (_label, ace, fieldCard, handCard) => {
    const s = blastDnaFixture(ace, fieldCard, handCard);
    const offers = await attackAndCollectBlastDnaOffers(s);
    expect(offers).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: offers[0]!.instanceId,
        effectKey: offers[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === ace));
    const result = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === ace)!;
    expect(result.stack.map((card) => card.cardId).sort()).toEqual([fieldCard, handCard].sort());
    expect(s.state.players[0]!.hand.some((card) => card.cardId === handCard)).toBe(false);
  });

  it.each([
    ["BT20-045 Examon: blue Slayerdramon field + red-only Breakdramon hand", "BT20-045", "BT20-027", "BT1-026"],
    ["BT20-045 Examon: red-only Breakdramon field + blue Slayerdramon hand", "BT20-045", "BT1-026", "BT20-027"],
    ["BT20-060 Ouryuken: black Alphamon + black/green Ouryumon", "BT20-060", "BT13-075", "BT15-067"],
    ["BT20-076 Dragon Mode: green Dinobeemon + blue Paildramon", "BT20-076", "BT3-055", "BT3-027"],
    ["BT20-081 Takemikazuchi: Kazuchimon hand without [Pulsemon] in text", "BT20-081", "BT20-080", "BT7-041"],
    ["BT20-081 Takemikazuchi: Kazuchimon field without [Pulsemon] in text", "BT20-081", "BT7-041", "BT17-069"],
  ])("refuses %s", async (_label, ace, fieldCard, handCard) => {
    const s = blastDnaFixture(ace, fieldCard, handCard);
    const offers = await attackAndCollectBlastDnaOffers(s);
    expect(offers).toEqual([]);
    const field = s.perm("field");
    for (const fieldSlot of [0, 1]) {
      const forgedKey = `blast-dna-digivolve:${JSON.stringify([
        field.permanentId,
        field.topCard.instanceId,
        s.inst("partner").instanceId,
        fieldSlot,
      ])}`;
      expect(
        s.engine.applyIntent(0, {
          type: "respondCounter",
          sourceInstanceId: s.inst("ace").instanceId,
          effectKey: forgedKey,
        }).ok,
      ).toBe(false);
    }
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual([fieldCard]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual([ace, handCard].sort());
  });
});
