import { memoryBoostTests } from "./memoryBoostTestSupport.js";
import { memoryBoostColorRulings } from "./qaRulings1.testSupport.js";
import "./P-038.js";

memoryBoostTests({
  cardId: "P-038",
  name: "Green Memory Boost!",
  colorSource: "BT1-064",
  matchingDigimon: "BT1-064",
  offColorDigimon: "BT1-009",
});

memoryBoostColorRulings({
  cardId: "P-038",
  name: "Green Memory Boost!",
  sameColorOption: "BT1-108",
  colorRequirementQno: "Q4155",
  delayQno: "Q4156",
});
