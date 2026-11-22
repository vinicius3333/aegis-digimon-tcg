import { expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import "#api/cards/index";
import fixture from "#api/engine/scenarios/play-or-use-reads-dual-option-color.fixture";
import { setupScenario } from "#api/engine/testkit/scenario";
import { settle } from "#api/engine/testkit/harness";

it("uses a DUAL card whose Option side meets a play-or-use color filter", async () => {
  const s = setupScenario(fixture, {
    autoAcceptOptional: true,
    autoSelectCards: true,
    autoChooseOption: true,
    declinePrompts: ["Arts Digivolve", "Alliance"],
  });
  s.state.phase = Phase.Main;
  await s.ready();
  const gankoomon = s.inst("gankoomonDual").instanceId;

  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("saviorHuckmon").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === gankoomon));

  const useChoice = s.decisions.find(
    ({ req }) => req.kind === "selectCards" && req.options?.candidateInstanceIds?.includes(gankoomon) === true,
  );
  expect(useChoice).toBeDefined();
  expect(s.state.players[0]!.hand.some((card) => card.instanceId === gankoomon)).toBe(false);
  expect(s.state.memory).toBe(2);
  expect(s.state.players[1]!.battleArea).toHaveLength(0);
});
