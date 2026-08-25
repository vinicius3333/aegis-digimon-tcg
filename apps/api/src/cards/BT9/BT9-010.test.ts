import { auditEffectlessDigimon } from "./effectlessAudit.testkit.js";
import { compiled } from "./BT9-010.js";

auditEffectlessDigimon({
  cardId: "BT9-010",
  expected: {
    cardId: "BT9-010",
    nameEn: "Atamadekachimon",
    colors: ["Red"],
    kinds: ["Digimon"],
    level: 4,
    playCost: 5,
    dp: 7000,
    evoCosts: [{ color: "Red", level: 3, memoryCost: 2 }],
    forms: ["Champion"],
    attributes: ["Data"],
    types: ["Dinosaur"],
  },
  compiled,
  validBase: "BT9-007",
  validEgg: "BT1-001",
  invalidBase: "BT9-019",
});
