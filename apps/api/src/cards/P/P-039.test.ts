import { memoryBoostTests } from "./memoryBoostTestSupport.js";
import { memoryBoostColorRulings } from "./qaRulings1.testSupport.js";
import "./P-039.js";

memoryBoostTests({
  cardId: "P-039",
  name: "Black Memory Boost!",
  colorSource: "BT2-052",
  matchingDigimon: "BT2-052",
  offColorDigimon: "BT1-009",
});

memoryBoostColorRulings({
  cardId: "P-039",
  name: "Black Memory Boost!",
  sameColorOption: "BT10-105",
  colorRequirementQno: "Q4157",
  delayQno: "Q4158",
});
