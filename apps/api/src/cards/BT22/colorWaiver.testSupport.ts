import { setupEngine } from "../../engine/testkit/harness.js";

/** Try to use an Option from hand while `breeding` is seat 0's only Digimon, in the breeding area. */
export async function useOptionWithBreedingDigimon(option: string, breeding: string) {
  const s = setupEngine(
    {
      0: {
        breeding: { card: breeding, as: "breeding" },
        hand: [{ card: option, as: "option" }],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 5;
  await s.ready();
  return s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId });
}
