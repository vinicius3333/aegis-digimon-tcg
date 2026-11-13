import { expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import "#api/cards/index";
import fixture from "#api/engine/scenarios/black-white-gankoomon-meets-white-option-requirement.fixture";
import { setupScenario } from "#api/engine/testkit/scenario";

function useSistermonNoirOption(topCard: string) {
  const s = setupScenario(
    {
      ...fixture,
      board: {
        ...fixture.board,
        0: { ...fixture.board[0]!, battleArea: [{ card: topCard, as: "gankoomonX" }] },
      },
    },
    { autoAcceptOptional: false, autoSelectCards: true },
  );
  s.state.phase = Phase.Main;
  return s;
}

it("uses a white Option with BT27 Gankoomon (X Antibody) as the only white Digimon", async () => {
  const s = useSistermonNoirOption("BT27-068");
  await s.ready();
  const sistermonNoir = s.inst("sistermonNoir").instanceId;

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: sistermonNoir, useAs: "option" })).toEqual({
    ok: true,
  });
  expect(s.state.players[0]!.hand.some((card) => card.instanceId === sistermonNoir)).toBe(false);
  expect(s.state.memory).toBeLessThan(6);
});

it("still refuses the white Option when the only Gankoomon (X Antibody) is black", async () => {
  const s = useSistermonNoirOption("BT10-068");
  await s.ready();
  const sistermonNoir = s.inst("sistermonNoir").instanceId;

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: sistermonNoir, useAs: "option" })).toEqual({
    ok: false,
    reason: "color-requirement-unmet",
  });
  expect(s.state.players[0]!.hand.some((card) => card.instanceId === sistermonNoir)).toBe(true);
  expect(s.state.memory).toBe(6);
});
