import { memoryBoostTests } from "./memoryBoostTestSupport.js";
import "./P-039.js";

// audit-cases: 4
memoryBoostTests({
  cardId: "P-039",
  name: "Black Memory Boost!",
  colorSource: "BT2-052",
  matchingDigimon: "BT2-052",
  offColorDigimon: "BT1-009",
});
