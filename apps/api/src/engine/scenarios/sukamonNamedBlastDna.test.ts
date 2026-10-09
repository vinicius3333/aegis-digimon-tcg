import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle, settleAcrossTimers, assertNoLoudGap } from "../testkit/harness.js";

// CR 16-31-5: a Digimon card's DNA digivolution requirements can't be ignored for ＜Blast DNA
// Digivolve＞. BT20-045 prints [DNA Digivolve] Green Lv.6 + Blue Lv.6, so once BT11-043
// KingSukamon turns the field material into a white Digimon it no longer fills the blue slot,
// even when an effect alias still names it [Slayerdramon]. The hand card keeps its printed info.
function sukamonFixture(material: string, partner?: string) {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        deck: ["BT1-009", "BT1-010"],
        security: ["BT1-009"],
        battleArea: [
          { card: material, as: "material" },
          ...(partner === undefined ? [] : [{ card: partner, as: "partner" }]),
        ],
        hand: [
          { card: "BT20-044", as: "break" },
          { card: "BT20-045", as: "examon" },
        ],
      },
      1: {
        battleArea: [{ card: "BT20-010", as: "attacker" }],
        hand: [{ card: "BT11-043", as: "king" }],
        trash: ["BT11-040", "BT11-040", "BT11-040"],
        security: ["BT1-009"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
  );
  preferred.push(s.perm("material").topCard.instanceId);
  return s;
}

type Fixture = ReturnType<typeof sukamonFixture>;

async function whitenMaterial(s: Fixture) {
  expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
  await settle(() => s.perm("material").originalNameOverride === "Sukamon" && !s.state.pendingDecision);
  expect(observe(s.engine).effectiveColors(s.perm("material"))).toEqual(["White"]);
  expect(s.perm("material").currentDP).toBe(3000);
}

function attackPlayer(s: Fixture) {
  expect(
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
}

function blastDnaKey(s: Fixture, fieldAlias: string) {
  const field = s.perm(fieldAlias);
  // Breakdramon is the printed left material, so a field Slayerdramon fills slot 1.
  return `blast-dna-digivolve:${JSON.stringify([field.permanentId, field.topCard.instanceId, s.inst("break").instanceId, 1])}`;
}

describe("Discord 1557631388650315826: Examon Blast DNA after KingSukamon", () => {
  it.each(["EX13-021", "BT20-025", "BT20-027"])(
    "offers no Blast DNA once KingSukamon makes %s a white Digimon",
    async (material) => {
      const s = sukamonFixture(material);
      await s.ready();
      s.state.turnSeat = 1;
      s.state.memory = 10;
      await whitenMaterial(s);
      attackPlayer(s);
      await settleAcrossTimers(() => !observe(s.engine).isAttacking());
      expect(
        s.events.some(
          (e) =>
            e.kind === "counterWindowOpened" &&
            e.eligibleCounters.some((c) => c.instanceId === s.inst("examon").instanceId),
        ),
      ).toBe(false);
      expect(s.state.players[0]!.hand.map((c) => c.cardId).sort()).toEqual(["BT20-044", "BT20-045"]);
      assertNoLoudGap(s);
    },
  );

  it("keeps the Wingdramon [Slayerdramon] alias but still refuses the white material", async () => {
    const s = sukamonFixture("EX13-021");
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await whitenMaterial(s);
    expect(observe(s.engine).effectiveNames(s.perm("material"))).toContain("slayerdramon");
  });

  it("refuses a forged Blast DNA intent that names the white material", async () => {
    const s = sukamonFixture("EX13-021", "BT20-027");
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await whitenMaterial(s);
    expect(observe(s.engine).effectiveColors(s.perm("partner"))).toEqual(["Blue", "Red"]);
    attackPlayer(s);
    await settle(() => s.events.some((e) => e.kind === "counterWindowOpened"));
    const counter = s.events.findLast((e) => e.kind === "counterWindowOpened");
    if (counter?.kind !== "counterWindowOpened") throw new Error("Expected public Counter window");
    const offered = counter.eligibleCounters
      .filter((c) => c.instanceId === s.inst("examon").instanceId)
      .map((c) => c.effectKey);
    expect(offered).toEqual([blastDnaKey(s, "partner")]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: s.inst("examon").instanceId,
        effectKey: blastDnaKey(s, "material"),
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.state.players[0]!.hand.map((c) => c.cardId).sort()).toEqual(["BT20-044", "BT20-045"]);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["EX13-021", "BT20-027"]);
  });

  it.each(["EX13-021", "BT20-025", "BT20-027"])(
    "still offers Blast DNA with %s while it keeps its printed blue color",
    async (material) => {
      const s = sukamonFixture(material);
      await s.ready();
      s.state.turnSeat = 1;
      s.state.memory = 10;
      attackPlayer(s);
      await settle(() => s.events.some((e) => e.kind === "counterWindowOpened"));
      const counter = s.events.findLast((e) => e.kind === "counterWindowOpened");
      if (counter?.kind !== "counterWindowOpened") throw new Error("Expected public Counter window");
      const eligible = counter.eligibleCounters.find((e) => e.instanceId === s.inst("examon").instanceId);
      expect(eligible?.effectKey).toBe(blastDnaKey(s, "material"));
      expect(
        s.engine.applyIntent(0, {
          type: "respondCounter",
          sourceInstanceId: eligible!.instanceId,
          effectKey: eligible!.effectKey,
        }),
      ).toEqual({ ok: true });
      await settleAcrossTimers(
        () =>
          s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-045") &&
          !observe(s.engine).isAttacking(),
      );
      const result = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT20-045")!;
      expect(result.stack.map((c) => c.cardId)).toEqual([material, "BT20-044"]);
      expect(s.state.players[0]!.hand).toHaveLength(1); // DNA draws once; both actual materials were consumed.
      assertNoLoudGap(s);
    },
  );
});
