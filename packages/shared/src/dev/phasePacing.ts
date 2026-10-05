/** Conserved printed-card boards driven by the ordinary autonomous opponent. */
export const PHASE_PACING_SCENARIOS = [
  {
    id: "phase-pacing-bot-raising-evolution",
    flow: "raising-evolution",
    label: "Raising · three evolutions",
    handCardIds: ["ST1-03", "ST1-05", "ST1-08"],
    breedingCardIds: ["ST1-01"],
    fieldCardIds: [],
    eggCardId: "ST1-01",
    securityRemoved: 0,
  },
  {
    id: "phase-pacing-bot-play-grouping",
    flow: "play-grouping",
    label: "Play · two physical copies",
    handCardIds: ["BT1-009", "BT1-009"],
    breedingCardIds: [],
    fieldCardIds: [],
    eggCardId: "BT1-007",
    securityRemoved: 0,
  },
  {
    id: "phase-pacing-bot-raising-move",
    flow: "raising-move",
    label: "Raising · move, evolve and attack",
    handCardIds: ["ST1-08"],
    breedingCardIds: ["ST1-01", "BT1-009", "ST1-05"],
    fieldCardIds: ["ST1-05", "ST1-05"],
    eggCardId: "ST1-01",
    securityRemoved: 3,
  },
] as const;

export type PhasePacingScenario = (typeof PHASE_PACING_SCENARIOS)[number];
export type PhasePacingScenarioId = PhasePacingScenario["id"];
