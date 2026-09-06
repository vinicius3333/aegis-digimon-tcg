import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-025.js";
import "./index.js";
import "../EX3/EX3-074.js";

describe("BT20-025 Wingdramon", () => {
  it("deletes up to 6000 DP and is treated as Slayerdramon only while in play", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } }, count: 1 },
          },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true, zone: "battleArea" }, isSelf: true },
          grant: "name",
          tokens: ["Slayerdramon"],
        },
        {
          kind: "GrantStatic",
          grant: { kind: "TreatAsLevel", level: 6, context: "DNADigivolution", intoNames: ["Examon"] },
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toEqual([
      { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
    ]);
  });

  it("deletes exactly one opposing Digimon at the inclusive 6000-DP boundary", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-025", as: "wingdramon" }] },
        1: {
          battleArea: [
            { card: "BT20-014", dp: 6000, as: "boundary" },
            { card: "BT20-014", dp: 7000, as: "tooLarge" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const boundaryId = s.perm("boundary").permanentId;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("wingdramon"));
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === boundaryId));
    expect(s.perm("tooLarge")).toBeDefined();
  });

  it("is Slayerdramon only on the field and grants inherited Security Attack +1", async () => {
    const field = setupEngine({ 0: { battleArea: [{ card: "BT20-025", as: "wingdramon" }] } });
    await field.ready();
    expect(observe(field.engine).grantedNames(field.perm("wingdramon"))).toContain("slayerdramon");

    const breeding = setupEngine({ 0: { breeding: { card: "BT20-025", as: "breedingWingdramon" } } });
    await breeding.ready();
    expect(observe(breeding.engine).grantedNames(breeding.perm("breedingWingdramon"))).not.toContain("slayerdramon");

    const inherited = setupEngine({
      0: { battleArea: [{ card: "BT20-027", as: "host", under: ["BT20-025"] }] },
    });
    await inherited.ready();
    expect(observe(inherited.engine).keywordAmount(inherited.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("uses the field-only Slayerdramon treatment for Examon Blast DNA", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-025", as: "wingdramon", under: ["BT20-023"] }],
          hand: [
            { card: "BT20-044", as: "breakdramon" },
            { card: "BT20-045", as: "examon" },
          ],
          security: ["BT20-001", "BT20-002"],
          deck: ["BT20-001", "BT20-002"],
        },
        1: { battleArea: [{ card: "BT20-009", as: "attacker" }] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    expect(opened).toBeDefined();
    const choice = opened!.eligibleCounters.find((entry) => entry.instanceId === s.inst("examon").instanceId);
    expect(choice).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: choice!.instanceId,
        effectKey: choice!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    const result = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT20-045");
    expect(result).toBeDefined();
    expect(result!.stack.map((card) => card.cardId)).toEqual(["BT20-023", "BT20-025", "BT20-044"]);
    expect(s.state.players[0]!.hand.some((card) => ["BT20-044", "BT20-045"].includes(card.cardId))).toBe(false);
    expect(s.state.memory).toBe(3);
  });
  it("publicly evolves Coredramon into Wingdramon and applies the printed deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-023", as: "coredramon" }], hand: [{ card: "BT20-025", as: "wingdramon" }] },
      1: {
        battleArea: [
          { card: "BT20-014", dp: 6000, as: "boundary" },
          { card: "BT20-014", dp: 7000, as: "tooLarge" },
        ],
      },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("coredramon").permanentId,
        instanceId: s.inst("wingdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("coredramon").topCard.cardId === "BT20-025");
    expect(s.perm("coredramon").stack.map((card) => card.cardId)).toContain("BT20-023");
    expect(
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.topCard.cardId === "BT20-014" && permanent.baseDP === 6000,
      ),
    ).toBe(false);
    expect(
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.topCard.cardId === "BT20-014" && permanent.baseDP === 7000,
      ),
    ).toBe(true);
  });

  it("makes a legal Wingdramon stack perform two security checks", async () => {
    const withInherited = setupEngine({
      0: { battleArea: [{ card: "BT20-027", dp: 12000, as: "attacker", under: ["BT20-025"] }] },
      1: { security: ["BT1-015", "BT1-015"] },
    });
    expect(
      withInherited.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: withInherited.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => withInherited.state.players[1]!.security.length === 0);
    expect(withInherited.state.players[0]!.battleArea).toHaveLength(1);

    const withoutInherited = setupEngine({
      0: { battleArea: [{ card: "BT20-027", dp: 12000, as: "attacker" }] },
      1: { security: ["BT1-015", "BT1-015"] },
    });
    expect(
      withoutInherited.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: withoutInherited.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => withoutInherited.state.players[1]!.security.length === 1);
    expect(withoutInherited.state.players[1]!.security).toHaveLength(1);
  });

  it("uses the ordinary public Examon DNA route from Breakdramon and Slayerdramon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-044", as: "breakdramon" },
          { card: "BT20-027", as: "slayerdramon", under: ["BT20-025"] },
        ],
        hand: [{ card: "EX3-074", as: "examon" }],
      },
      1: { battleArea: [{ card: "BT20-014", dp: 7000, as: "opponent" }] },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("breakdramon").permanentId, s.perm("slayerdramon").permanentId],
        instanceId: s.inst("examon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX3-074"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("examon").instanceId)).toBe(false);
  });
});
