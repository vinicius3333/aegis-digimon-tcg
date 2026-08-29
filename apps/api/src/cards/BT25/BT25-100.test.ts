import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT25-100.js";

const CARD_ID = "BT25-100";

describe("BT25-100 Iron Slash", () => {
  it("maps the TS Use Req. to a battle-area Digimon or Tamer", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      actions: [
        {
          kind: "WaiveColorRequirement",
          condition: {
            kind: "youHave",
            filter: { zone: "battleArea", kind: ["Digimon", "Tamer"] },
          },
        },
      ],
    });
  });

  it("uses via TS Use Req., De-Digivolves 2, then freely links itself to breeding (Q6473-Q6474)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-091", as: "tsTamer" }],
          breeding: { card: "BT25-008", as: "breedingHost" },
          hand: [{ card: CARD_ID, as: "option" }],
        },
        1: {
          battleArea: [
            {
              card: "BT25-075",
              as: "opponent",
              under: [{ card: "BT25-011" }, { card: "BT25-010" }, { card: "BT25-009" }],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponent").permanentId, s.perm("breedingHost").permanentId);
    s.state.memory = 3;
    await s.ready();
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId, useAs: "option" } as never)).toEqual({
      ok: true,
    });
    await settle(() => s.perm("breedingHost").linked.some((card) => card.instanceId === optionId));

    expect(s.perm("breedingHost").linked.map((card) => card.instanceId)).toContain(optionId);
    expect(s.perm("opponent").topCard.cardId).toBe("BT25-009");
    expect(s.perm("opponent").stack).toHaveLength(2);
    expect(s.state.memory).toBe(0); // Option cost only; the link cost 2 was waived.
  });

  it("linked face grants Collision, Piercing and +2000 DP as Digimon-facing state (Q6471)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-075", as: "host" }], hand: [{ card: CARD_ID, as: "ironSlash" }] },
    });
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("ironSlash").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasPierce(s.perm("host")));

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Collision")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
    expect(s.perm("host").currentDP).toBe(getCardDefinition("BT25-075")!.dp + 2000);
  });

  it("does not waive color without a TS card in play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: CARD_ID, as: "option" }] } });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });

  it("does not treat a breeding TS Digimon or a TS Option as the field Use Req.", async () => {
    for (const players of [
      {
        0: {
          breeding: { card: "BT25-034", as: "breedingTs" },
          hand: [{ card: CARD_ID, as: "option" }],
        },
      },
      {
        0: {
          battleArea: [{ card: "BT25-094", as: "tsOption" }],
          hand: [{ card: CARD_ID, as: "option" }],
        },
      },
    ]) {
      const s = setupEngine(players);
      s.state.memory = 3;
      await s.ready();
      expect(
        s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
      ).toEqual({ ok: false, reason: "color-requirement-unmet" });
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain(CARD_ID);
    }
  });
});
