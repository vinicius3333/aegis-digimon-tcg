# Paid action target preflight

Optional actions whose printed processing condition begins with “By” may normally remain available
without a current payload target. A destructive `deleteOwn` payment is transactional by default:
the engine first requires a legal target for the paid action, so it cannot delete the player's card
for an effect that cannot act. Cards whose ruling explicitly permits payment without a target retain
the `allowCostWithoutTarget` opt-in.

EX13-059 exercises this boundary at End of Your Turn: with no opposing Digimon, BigMamemon and its
potential Mamemon payment remain in the battle area. The existing positive and optional-decline paths
continue to prove that a valid target can be deleted and that the player may refuse payment.
