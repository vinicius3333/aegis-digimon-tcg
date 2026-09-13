import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";

const cases = [
  ["LM-054", "BT1-046", "BT1-054", "BT12-013"],
  ["LM-055", "BT1-067", "BT6-050", "BT1-115"],
  ["LM-056", "BT1-028", "BT1-115", "BT1-054"],
  ["LM-057", "BT1-009", "BT12-013", "BT6-050"],
  ["LM-058", "BT1-028", "BT1-115", "BT12-013"],
  ["LM-059", "BT1-046", "BT1-054", "BT1-115"],
  ["LM-060", "BT1-067", "BT6-050", "BT10-061"],
  ["LM-061", "BT10-058", "BT10-061", "BT1-054"],
  ["LM-062", "BT2-067", "BT14-075", "BT10-061"],
] as const;

describe.each(cases)("%s Delay evolution", (cardId, hostCard, evolutionCard, wrongColorCard) => {
  it("targets the selected host, pays the reduced cost, and trashes the Option source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "option" },
            { card: hostCard, as: "host" },
          ],
          hand: [evolutionCard],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const hostInstanceId = s.perm("host").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("option").topCard!.instanceId,
        effectKey: `${cardId}/ir-${EffectTiming.OnDeclaration}-0`,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === evolutionCard);
    expect(s.perm("host").permanentId).toBe(hostId);
    expect(s.perm("host").topCard?.cardId).toBe(evolutionCard);
    expect(s.perm("host").stack.some((card) => card.instanceId === hostInstanceId)).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === cardId)).toBe(true);
  });

  it("refuses a hand Digimon outside the printed colour pair", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "option" },
            { card: hostCard, as: "host" },
          ],
          hand: [wrongColorCard],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("option").topCard!.instanceId,
        effectKey: `${cardId}/ir-${EffectTiming.OnDeclaration}-0`,
      }),
    ).not.toEqual({ ok: true });
  });
});
