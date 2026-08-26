import { auditEffectlessDigimon } from "./effectlessAudit.testkit.js";
import { compiled } from "./BT9-019.js";

auditEffectlessDigimon({
  cardId: "BT9-019",
  expected: {
    cardId: "BT9-019",
    nameEn: "Crabmon",
    colors: ["Blue"],
    kinds: ["Digimon"],
    level: 3,
    playCost: 2,
    dp: 3000,
    evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
    forms: ["Rookie"],
    attributes: ["Data"],
    types: ["Crustacean"],
  },
  compiled,
  validBase: "BT1-003",
  invalidBase: "BT1-005",
});
