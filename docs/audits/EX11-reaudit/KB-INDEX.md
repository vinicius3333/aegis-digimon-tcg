# EX11 local KB index

Query source: data/kb/qa.json, errata.json, banlist.json. Every worker must also run the card query.

## EX11-001 Koromon

- **Q5787** (2026-02-06): When multiple "when your Digimon attacks, you may digivolve that Digimon" effects trigger, I activated the 1st effect, then the digivolved Digimon's [When Digivolving] effect triggered. At such times, in what order can I activate the other "when your Digimon attacks, you may digivolve that Digimon" effects and that [When Digivolving] effect?
  - The [When Digivolving] effect activates first.
As soon as your Digimon attacks, the "when your Digimon attacks, you may digivolve that Digimon" effects trigger simultaneously.
You activate the 1st effect, digivolve a Digimon, then its [When Digivolving] effect triggers, and you therefore activate it first due to the derived trigger rule.

## EX11-002 Hiyarimon

- **Q6044** (2026-03-13): Is a "while your opponent has no Digimon with XX" condition also met when my opponent has no Digimon?
  - Yes, it's met.

## EX11-003 Puroromon

- **Q5788** (2026-02-06): Does this card's inherited effect trigger if my face-down security card is flipped to face up and it's a [Royal Base] trait card?
  - No, it doesn't trigger.

## EX11-004 Kapurimon

- **Q5789** (2026-02-06): Does this card's inherited effect trigger when an opponent's security card is flipped to face up?
  - Yes, it triggers.

- **Q5790** (2026-02-06): Does this card's inherited effect trigger when a face-up card is placed in my opponent's security stack?
  - Yes, it triggers.

## EX11-005 Yaamon

- **Q5791** (2026-02-06): If I use this card's inherited effect to digivolve, do I trash 2 cards in my hand for this effect after performing the digivolution bonus draw?
  - Yes. You perform the digivolution bonus draw and then trash 2 cards in your hand.

- **Q5792** (2026-02-06): Can I activate this card's inherited effect even when I have 0 cards in my hand?
  - Yes, you can.
But even if you have just 1 card in your hand after digivolving with this effect, you must trash it when possible.

## EX11-006 Flickmon

- **Q5793** (2026-02-06): What does a card with "X in its text" refer to?
  - It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements.
For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.

## EX11-007 Agumon

No card-specific Q&A in committed KB; general rules still apply.

## EX11-008 Elizamon

- **Q5794** (2026-02-06): In what order do a [Security] effect, "when [...] performs a security check" effect, and "when a card is removed from [...] security stack" effect activate when they trigger simultaneously upon a security check?
  - [Security] effects take precedence for activation.
Upon a security check, a [Security] effect will immediately activate without pending activation.
For other triggered effects, the turn player activates their effects first.

## EX11-009 Tyrannomon

No card-specific Q&A in committed KB; general rules still apply.

## EX11-010 MasterTyrannomon

- **Q5795** (2026-02-06): Can I use this card's [On Play] [When Digivolving] effect to suspend either my Digimon or my opponent's Digimon?
  - Yes, either can be suspended.

## EX11-011 Dinomon

- **Q5796** (2026-02-06): There are only opponent's Digimon with no play costs. What happens if this card's [On Play] [When Digivolving] effect activates?
  - You can't choose your opponent's Digimon, and all Digimon that can't be chosen are deleted.

- **Q5797** (2026-02-06): I have this card in the battle area, and it's suspended. Can my opponent's BT8-018 [Marsmon] attack their unsuspended Digimon?
  - No, it can't attack.
If a "can" or "may" effect activates at the same timing as a "can't" effect, the "can't" effect takes precedence.

- **Q5798** (2026-02-06): I have this card in the battle area, and it's suspended. If my opponent's Digimon attacks my suspended Digimon, can my opponent use <Raid> on the attacking Digimon to switch the target of the attack to my unsuspended Digimon?
  - Yes, they can.
This card's [Opponent's Turn] effect only allows suspended Digimon to be chosen as the attack target upon the attack declaration.
After attacking a suspended Digimon, it will be possible to use <Raid> to switch the target of the attack to an opponent's unsuspended Digimon.

- **Q5799** (2026-02-06): I have this card in the battle area, and it's suspended. If an opponent's Digimon isn't affected by effects, can it attack Digimon other than suspended Digimon?
  - Yes, it can attack.

## EX11-012 Medusamon

- **Q5800** (2026-02-06): Which player's token does this card's [When Digivolving] [End of Attack] effect play as an opponent's Digimon?
  - This card's [When Digivolving] [End of Attack] effect plays the token of the player that activated the effect as an opponent's Digimon.
If the token played by this effect is removed from the field or the game ends, the token is returned to that player.

- **Q5801** (2026-02-06): Can I use this card's [When Digivolving] [End of Attack] effect to play a [Petrification] Token during the turn I activated BT8-097 [Crimson Blaze]'s [Main] effect?
  - Yes, it can be played.
This card's [When Digivolving] [End of Attack] effect plays one of your cards.
Cards can be played by your effects even after a "your opponent can't play Digimon by effects" effect has activated.

- **Q6045** (2026-03-13): I activated this card's [When Digivolving] [End of Attack] effect, and when my opponent's Digimon would leave the battle area for the 1st process, an immediate-type effect such as a "when [...] would leave" effect caused this card to be removed from the battle area. Can I then process the part of the effect after "then" in this card's effect?
  - Yes, you can.
If an effect activates, it is to be fully resolved even if the card that activated the effect is removed from that area during the processing.

- **Q6514** (2026-05-08): I activated this card's [All Turns] effect to delete a Token when this card's DP became 0 and it would be deleted, then it was prevented from leaving. If this card's DP is still 0 after that and it would be deleted, can I activate this card's [All Turns] effect again?
  - Yes, you can.
By activating this card's [All Turns] effect to delete a Token when this card's DP becomes 0 and it would be deleted by a rule check, it will be prevented from leaving. You can activate this card's [All Turns] effect again when it would be deleted by the next rule check. If the deleted Tokens have [On Deletion] effects, once all processing has been resolved for the rule checks, those [On Deletion] effects will trigger simultaneously.

## EX11-013 Sangomon

No card-specific Q&A in committed KB; general rules still apply.

## EX11-014 Penguinmon

No card-specific Q&A in committed KB; general rules still apply.

## EX11-015 Frigimon

No card-specific Q&A in committed KB; general rules still apply.

## EX11-016 PolarBearmon

- **Q5802** (2026-02-06): My Digimon with this card in its digivolution cards attacked, an opponent's Digimon with digivolution cards was deleted in the battle, and after that battle, my opponent doesn't have any Digimon with digivolution cards. This Digimon gains <Piercing> from this card's inherited effect at such times, but does the <Piercing> trigger simultaneously?
  - Yes, it triggers.
If an effect's trigger conditions are met when the effect is gained, that effect will trigger.
In this case, your opponent no longer has Digimon with digivolution cards at the same timing as when your opponent's Digimon is deleted in battle, therefore you can activate <Piercing>.

- **Q6046** (2026-03-13): Is a "while your opponent has no Digimon with XX" condition also met when my opponent has no Digimon?
  - Yes, it's met.

## EX11-017 Skadimon

No card-specific Q&A in committed KB; general rules still apply.

## EX11-018 Ryugumon

- **Q6515** (2026-05-08): I activated <Decode> to play a Digimon when this card's DP became 0 and it would be deleted, then I activated <Evade>, and it was prevented from being deleted. If this card's DP is still 0 after that and it would be deleted, can I activate <Decode> again?
  - Yes, you can.
When this card's DP becomes 0 and it would be deleted by a rule check, its <Evade> and <Decode> will trigger simultaneously. You can activate <Decode>, play a Digimon, activate <Evade>, prevent the deletion, then activate this card's <Decode> again when it would be deleted by the next rule check. If the played Digimon has [On Play] effects, once all processing has been resolved for the rule checks, those [On Play] effects will trigger simultaneously.

- **Q6516** (2026-05-08): When this card would be deleted, can I first activate <Evade> to prevent the deletion, then activate <Decode> to play a card from digivolution cards?
  - Yes, you can.

## EX11-019 Shoemon

No card-specific Q&A in committed KB; general rules still apply.

## EX11-020 Hanimon

- **Q5803** (2026-02-06): I tried to delete 1 of my other Digimon using this card's inherited effect when an opponent's Digimon attacked, but I couldn't delete the other Digimon due to another effect. Can I end that attack at such times?
  - No, you can't end that attack.
If the "by" condition isn't met, the rest of the effect isn't processed. In this case, if you can't delete 1 of your other Digimon, then you can't end the attack.

- **Q5804** (2026-02-06): What does "end the attack" mean, exactly?
  - After this effect activates, the current timing makes a transition to the end of attack timing. For example, if this effect activates during the attack declaration timing, it will make a transition to the end of attack timing. A transition to the counter timing or block timing won't occur, and the attack won't succeed.

- **Q5805** (2026-02-06): Can an "end the attack" effect end an attack by a Digimon that isn't affected by effects?
  - Yes, such attacks can be ended.
"End the attack" effects are effects that change the timing, they don't affect an attacking Digimon.

## EX11-021 Kokeshimon

- **Q5806** (2026-02-06): I tried to delete 1 of my other Digimon using this card's inherited effect when an opponent's Digimon attacked, but I couldn't delete the other Digimon due to another effect. Can I end that attack at such times?
  - No, you can't end that attack.
If the "by" condition isn't met, the rest of the effect isn't processed. In this case, if you can't delete 1 of your other Digimon, then you can't end the attack.

- **Q5807** (2026-02-06): What does "end the attack" mean, exactly?
  - After this effect activates, the current timing makes a transition to the end of attack timing. For example, if this effect activates during the attack declaration timing, it will make a transition to the end of attack timing. A transition to the counter timing or block timing won't occur, and the attack won't succeed.

- **Q5808** (2026-02-06): Can an "end the attack" effect end an attack by a Digimon that isn't affected by effects?
  - Yes, such attacks can be ended.
"End the attack" effects are effects that change the timing, they don't affect an attacking Digimon.

## EX11-022 Karakurumon

- **Q5809** (2026-02-06): Do I delete the Digimon that was played by this card's [On Play] [When Digivolving] effect at the end of the turn?
  - Yes, it's deleted upon the deletion timing.

- **Q5810** (2026-02-06): What is the processing order for an effect that triggers at the end of the turn and the deletion of a Digimon played by this card's [On Play] [When Digivolving] effect?
  - The pending processing for the effect that triggers at the end of the turn and the deletion at the end of the turn are considered to be processing that triggers simultaneously. Therefore, the turn player can choose the processing order.

## EX11-023 Kaguyamon

No card-specific Q&A in committed KB; general rules still apply.

## EX11-024 Cendrillmon

- **Q5811** (2026-02-06): Multiple effects trigger when this card digivolves. In what order can they be activated?
  - The effects trigger simultaneously, so the player can choose the activation order.

## EX11-025 FunBeemon

- **Q5812** (2026-02-06): What happens to cards placed face up in the security stack by effects?
  - They become face-up security cards that remain revealed.
Other than rules that specify face-up security cards, the rules apply in the same manner as standard security cards.

- **Q5813** (2026-02-06): What happens upon a security check for a security card that is placed face-up?
  - The check is performed with the card left revealed.
Other than rules for cards left revealed, the rules apply in the same manner as standard security checks.

- **Q5814** (2026-02-06): Does a card's [Security] effect trigger upon a security check with that card placed face-up?
  - Yes, it triggers.

- **Q5815** (2026-02-06): What happens if I shuffle a security stack that includes security cards placed face-up?
  - Any face-up cards are placed face down, then you shuffle the cards.
After shuffling, all cards are left face-down.

## EX11-026 Pteromon

- **Q5816** (2026-02-06): Can I use this card's [When Moving] [On Play] effect to suspend either my Digimon or my opponent's Digimon?
  - Yes, either can be suspended.

- **Q5817** (2026-02-06): When does "when this Digimon wins a battle" trigger?
  - It triggers when the battle is won.
When the Digimon with this effect wins a battle, the opponent's Digimon that lost the battle is deleted, then the "when this Digimon wins a battle" effect can be activated.

- **Q5818** (2026-02-06): Does a "when this Digimon wins a battle" effect also trigger when a battle against a Security Digimon is won?
  - Yes, it triggers.

- **Q5819** (2026-02-06): A Digimon with a "when this Digimon wins a battle" effect won a battle, and the opponent's Digimon that lost the battle is deleted. At such times, in what order can players activate the "when this Digimon wins a battle" effect and the effects that trigger upon the losing Digimon being deleted?
  - They trigger simultaneously, so the turn player can activate their effects first.

- **Q5820** (2026-02-06): A Digimon with a "when this Digimon wins a battle" effect won a battle, and the opponent's Digimon lost the battle. At such times, in what order can players activate the "when this Digimon wins a battle" effect and the loser Digimon's effects such as "when this Digimon would be deleted" and "when this Digimon would leave the battle area" effects?
  - The "when this Digimon would be deleted" and "when this Digimon would leave the battle area" effects can be activated first.

- **Q5821** (2026-02-06): A Digimon with a "when this Digimon wins a battle" effect won a battle, and the opponent's Digimon lost the battle. At such times, can the "when this Digimon wins a battle" effect be activated even if an effect prevents the opponent's Digimon from being deleted?
  - Yes, it can be activated.

## EX11-027 Maquinamon

- **Q5822** (2026-02-06): What does a card with "X in its text" refer to?
  - It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements.
For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.

- **Q5823** (2026-02-06): If I activate this card's link effect and this link card is placed as the bottom digivolution card, do "when digivolution cards are added" effects trigger?
  - Yes, they trigger.

- **Q5824** (2026-02-06): If a card was placed in digivolution cards by <Mind Link>, can I activate this card's link effect and place that card as the bottom digivolution card?
  - No, you can't.
A link card is a card plugged in sideways with a Digimon upon a link.

- **Q5850** (2026-02-06): My Digimon was given a DP reduction, it digivolved into this card, and I used a [When Moving] [When Digivolving] effect to play a linked EX11-027 [Maquinamon]. At such times, if the DP becomes 0 due to the link card leaving, can I still activate EX11-027 [Maquinamon]'s [On Play] effect before it's deleted?
  - No, you can't.
Upon resolving this card's [On Play] [When Digivolving] effect, a rule check will occur, and EX11-027 [Maquinamon] is deleted before you can activate its [On Play] effect.

- **Q5878** (2026-02-06): My Digimon was given a DP reduction, it digivolved into this card, and I used an [On Play] [When Digivolving] effect to play a linked EX11-027 [Maquinamon]. At such times, if the DP becomes 0 due to the link card leaving, can I still activate EX11-027 [Maquinamon]'s [On Play] effect before it's deleted?
  - No, you can't.
Upon resolving this card's [On Play] [When Digivolving] effect, a rule check will occur, and EX11-027 [Maquinamon] is deleted before you can activate its [On Play] effect.

## EX11-028 Galemon

- **Q5825** (2026-02-06): Can I use this card's [On Play] [When Digivolving] effect to suspend either my Digimon or my opponent's Digimon?
  - Yes, either can be suspended.

- **Q5826** (2026-02-06): My Digimon attacks an opponent's Digimon using <Vortex>, and I use this card's [All Turns] effect to play EX11-062 [Shoto Kazama]. Can I then use EX11-062 [Shoto Kazama]'s [Your Turn] effect to change the <Vortex> attack target to a player?
  - No, you can't.
EX11-062 [Shoto Kazama]'s [Your Turn] effect allows players to also be chosen as the attack target at the time of an attack declaration. It doesn't allow for changing the attack target.

- **Q5827** (2026-02-06): When does "when this Digimon wins a battle" trigger?
  - It triggers when the battle is won.
When the Digimon with this effect wins a battle, the opponent's Digimon that lost the battle is deleted, then the "when this Digimon wins a battle" effect can be activated.

- **Q5828** (2026-02-06): Does a "when this Digimon wins a battle" effect also trigger when a battle against a Security Digimon is won?
  - Yes, it triggers.

- **Q5829** (2026-02-06): A Digimon with a "when this Digimon wins a battle" effect won a battle, and the opponent's Digimon that lost the battle is deleted. At such times, in what order can players activate the "when this Digimon wins a battle" effect and the effects that trigger upon the losing Digimon being deleted?
  - They trigger simultaneously, so the turn player can activate their effects first.

- **Q5830** (2026-02-06): A Digimon with a "when this Digimon wins a battle" effect won a battle, and the opponent's Digimon lost the battle. At such times, in what order can players activate the "when this Digimon wins a battle" effect and the loser Digimon's effects such as "when this Digimon is deleted" and "when this Digimon would leave the battle area" effects?
  - The "when this Digimon is deleted" and "when this Digimon would leave the battle area" effects can be activated first.

- **Q5831** (2026-02-06): A Digimon with a "when this Digimon wins a battle" effect won a battle, and the opponent's Digimon lost the battle. At such times, can the "when this Digimon wins a battle" effect be activated even if an effect prevents the opponent's Digimon from being deleted?
  - Yes, it can be activated.

## EX11-029 Turbomon

- **Q5832** (2026-02-06): Do "when this Digimon gets linked" effects also trigger for <Mind Link>?
  - No, they don't trigger.
"When this Digimon gets linked" effects will trigger when a link card is a card plugged in sideways with a Digimon upon a <Link>.

## EX11-030 ForgeBeemon

- **Q5833** (2026-02-06): What happens to cards placed face up in the security stack by effects?
  - They become face-up security cards that remain revealed.
Other than rules that specify face-up security cards, the rules apply in the same manner as standard security cards.

- **Q5834** (2026-02-06): What happens upon a security check for a security card that is placed face-up?
  - The check is performed with the card left revealed.
Other than rules for cards left revealed, the rules apply in the same manner as standard security checks.

- **Q5835** (2026-02-06): Does a card's [Security] effect trigger upon a security check with that card placed face-up?
  - Yes, it triggers.

- **Q5836** (2026-02-06): What happens if I shuffle a security stack that includes security cards placed face-up?
  - Any face-up cards are placed face down, then you shuffle the cards.
After shuffling, all cards are left face-down.

## EX11-031 Vespamon

- **Q5837** (2026-02-06): Can this card's [On Play] [When Digivolving] effect suspend a different card from the one that's given "can't unsuspend until their turn ends"?
  - Yes, it can.

## EX11-032 GrandGalemon

- **Q5838** (2026-02-06): If I use this card's {Hand} [Main] effect to digivolve EX7-031 [Pteromon] into this card, ignoring digivolution requirements, does the combination with EX7-031 [Pteromon]'s effect make the digivolution cost 2?
  - Yes, the digivolution cost is 2.

- **Q5839** (2026-02-06): Can I activate this card's {Hand} [Main] effect at the same time as an effect such as P-106 [Agility Training]'s effect that digivolves?
  - No, you can't.

- **Q5840** (2026-02-06): Can I use this card's [When Digivolving] effect to suspend either my Digimon or my opponent's Digimon?
  - Yes, either can be suspended.

- **Q5841** (2026-02-06): When does "when this Digimon wins a battle" trigger?
  - It triggers when the battle is won.
When the Digimon with this effect wins a battle, the opponent's Digimon that lost the battle is deleted, then the "when this Digimon wins a battle" effect can be activated.

- **Q5842** (2026-02-06): Does a "when this Digimon wins a battle" effect also trigger when a battle against a Security Digimon is won?
  - Yes, it triggers.

- **Q5843** (2026-02-06): A Digimon with a "when this Digimon wins a battle" effect won a battle, and the opponent's Digimon that lost the battle is deleted. At such times, in what order can players activate the "when this Digimon wins a battle" effect and the effects that trigger upon the losing Digimon being deleted?
  - They trigger simultaneously, so the turn player can activate their effects first.

- **Q5844** (2026-02-06): A Digimon with a "when this Digimon wins a battle" effect won a battle, and the opponent's Digimon lost the battle. At such times, in what order can players activate the "when this Digimon wins a battle" effect and the loser Digimon's effects such as "when this Digimon is deleted" and "when this Digimon would leave the battle area" effects?
  - The "when this Digimon is deleted" and "when this Digimon would leave the battle area" effects can be activated first.

- **Q5845** (2026-02-06): A Digimon with a "when this Digimon wins a battle" effect won a battle, and the opponent's Digimon lost the battle. At such times, can the "when this Digimon wins a battle" effect be activated even if an effect prevents the opponent's Digimon from being deleted?
  - Yes, it can be activated.

## EX11-033 Maneuvermon

- **Q5846** (2026-02-06): What does a card with "X in its text" refer to?
  - It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements.
For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.

- **Q5847** (2026-02-06): Can this card's [Your Turn] effect suspend a different card from the one that's given "can't unsuspend"?
  - Yes, it can.

- **Q5848** (2026-02-06): Can I activate this card's inherited effect when an opponent's Digimon and this Digimon are deleted at the same time?
  - No, you can't activate it.

- **Q5849** (2026-02-06): Do "when this Digimon gets linked" effects also trigger for <Mind Link>?
  - No, they don't trigger.
"When this Digimon gets linked" effects will trigger when a link card is a card plugged in sideways with a Digimon upon a <Link>.

- **Q5850** (2026-02-06): My Digimon was given a DP reduction, it digivolved into this card, and I used a [When Moving] [When Digivolving] effect to play a linked EX11-027 [Maquinamon]. At such times, if the DP becomes 0 due to the link card leaving, can I still activate EX11-027 [Maquinamon]'s [On Play] effect before it's deleted?
  - No, you can't.
Upon resolving this card's [On Play] [When Digivolving] effect, a rule check will occur, and EX11-027 [Maquinamon] is deleted before you can activate its [On Play] effect.

## EX11-034 QueenBeemon

- **Q5851** (2026-02-06): This card has multiple effects that trigger when it digivolves or when it attacks. In what order can they be activated?
  - The effects trigger simultaneously, so the player can choose the activation order.

- **Q5852** (2026-02-06): What happens to cards placed face up in the security stack by effects?
  - They become face-up security cards that remain revealed.
Other than rules that specify face-up security cards, the rules apply in the same manner as standard security cards.

- **Q5853** (2026-02-06): What happens upon a security check for a security card that is placed face-up?
  - The check is performed with the card left revealed.
Other than rules for cards left revealed, the rules apply in the same manner as standard security checks.

- **Q5854** (2026-02-06): Does a card's [Security] effect trigger upon a security check with that card placed face-up?
  - Yes, it triggers.

- **Q5855** (2026-02-06): What happens if I shuffle a security stack that includes security cards placed face-up?
  - Any face-up cards are placed face down, then you shuffle the cards.
After shuffling, all cards are left face-down.

- **Q5856** (2026-02-06): What does a card with "X in its text" refer to?
  - It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements.
For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.

## EX11-035 Zephagamon

- **Q5857** (2026-02-06): Can I use this card's [When Digivolving] effect to unsuspend or suspend either my Digimon or my opponent's Digimon?
  - Yes, either can be unsuspended or suspended.

## EX11-036 Dalphomon

- **Q5858** (2026-02-06): What does a card with "X in its text" refer to?
  - It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements.
For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.

- **Q5859** (2026-02-06): Do "when this Digimon gets linked" effects also trigger for <Mind Link>?
  - No, they don't trigger.
"When this Digimon gets linked" effects will trigger when a link card is a card plugged in sideways with a Digimon upon a <Link>.

- **Q5860** (2026-02-06): Can this card's [On Play] [When Digivolving] [When Attacking] effect suspend a different card from the one that's given "can't unsuspend until their turn ends?
  - Yes, it can.

## EX11-037 Espimon

- **Q5861** (2026-02-06): What happens to cards placed face up in the security stack by effects?
  - They become face-up security cards that remain revealed.
Other than rules that specify face-up security cards, the rules apply in the same manner as standard security cards.

- **Q5862** (2026-02-06): What happens upon a security check for a security card that is placed face-up?
  - The check is performed with the card left revealed.
Other than rules for cards left revealed, the rules apply in the same manner as standard security checks.

- **Q5863** (2026-02-06): Does a card's [Security] effect trigger upon a security check with that card placed face-up?
  - Yes, it triggers.

- **Q5864** (2026-02-06): What happens if I shuffle a security stack that includes security cards placed face-up?
  - Any face-up cards are placed face down, then you shuffle the cards.
After shuffling, all cards are left face-down.

## EX11-038 Sunarizamon

- **Q5865** (2026-02-06): Can I use this card's [When Moving] [On Play] effect to trash a digivolution card from another of my Digimon?
  - Yes, you can.

## EX11-039 HoverEspimon

No card-specific Q&A in committed KB; general rules still apply.

## EX11-040 Mulemon

- **Q5866** (2026-02-06): Do "when this Digimon gets linked" effects also trigger for <Mind Link>?
  - No, they don't trigger.
"When this Digimon gets linked" effects will trigger when a link card is a card plugged in sideways with a Digimon upon a <Link>.

## EX11-041 Oblivimon

- **Q5867** (2026-02-06): Only the top card of my opponent's security card is face up. If this card's [On Play] [When Digivolving] effect activates, what security card is flipped to face up?
  - The 2nd card from the top of their security stack is flipped to face up.

- **Q5868** (2026-02-06): What happens to cards placed face up in the security stack by effects?
  - They become face-up security cards that remain revealed.
Other than rules that specify face-up security cards, the rules apply in the same manner as standard security cards.

- **Q5869** (2026-02-06): What happens upon a security check for a security card that is placed face-up?
  - The check is performed with the card left revealed.
Other than rules for cards left revealed, the rules apply in the same manner as standard security checks.

- **Q5870** (2026-02-06): Does a card's [Security] effect trigger upon a security check with that card placed face-up?
  - Yes, it triggers.

- **Q5871** (2026-02-06): What happens if I shuffle a security stack that includes security cards placed face-up?
  - Any face-up cards are placed face down, then you shuffle the cards.
After shuffling, all cards are left face-down.

- **Q5872** (2026-02-06): In what order do a [Security] effect, "when [...] performs a security check" effect, and "when a card is removed from [...] security stack" effect activate when they trigger simultaneously upon a security check?
  - [Security] effects take precedence for activation.
Upon a security check, a [Security] effect will immediately activate without pending activation.
For other triggered effects, the turn player activates their effects first.

- **Q5873** (2026-02-06): If I attack with this card, an opponent's face-up security card is checked for the security check, then this card's [Your Turn] effect activates and I place the top card of this Digimon at the bottom of the security stack, does the [End of Attack] effect on the Digimon under this card trigger?
  - Yes, it triggers.

- **Q5874** (2026-02-06): An opponent's Digimon attacks a player by an effect at the end of their turn. What happens if this card's {Security} [End of Opponent's Turn] effect then plays this card, my security stack is reduced to 0 cards, and the attack against the player is successful?
  - You lose the game.

- **Q5875** (2026-02-06): What happens if this card has just BT15-086 [Marvin Jackson] in its digivolution cards, it performs a security check on a face-up security card, and this card's [Your Turn] effect activates?
  - This card stacked on top is removed, causing this Digimon to become a Tamer, therefore the attacking Digimon is considered to be removed.

- **Q5888** (2026-02-06): This card has EX11-041 [Oblivimon] in its digivolution cards, it gained <Security A. +1>, and it attacks a player. At such times, if the [Your Turn] effect activates upon the 1st face-up security check and this card's top stacked card is placed as a security card, do I use EX11-041 [Oblivimon] to perform the 2nd check?
  - Yes, you use EX11-041 [Oblivimon] to perform the 2nd check.
If the 2nd check is on a face-up security card, EX11-041 [Oblivimon]'s [Your Turn] effect will also trigger.

## EX11-042 MockingBirdmon

- **Q5876** (2026-02-06): What does a card with "X in its text" refer to?
  - It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements.
For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.

- **Q5877** (2026-02-06): Do "when this Digimon gets linked" effects also trigger for <Mind Link>?
  - No, they don't trigger.
"When this Digimon gets linked" effects will trigger when a link card is a card plugged in sideways with a Digimon upon a <Link>.

- **Q5878** (2026-02-06): My Digimon was given a DP reduction, it digivolved into this card, and I used an [On Play] [When Digivolving] effect to play a linked EX11-027 [Maquinamon]. At such times, if the DP becomes 0 due to the link card leaving, can I still activate EX11-027 [Maquinamon]'s [On Play] effect before it's deleted?
  - No, you can't.
Upon resolving this card's [On Play] [When Digivolving] effect, a rule check will occur, and EX11-027 [Maquinamon] is deleted before you can activate its [On Play] effect.

## EX11-043 Invisimon

- **Q5879** (2026-02-06): Only the top card of my opponent's security card is face up. If this card's [On Play] [When Digivolving] effect activates, what security card is flipped to face up?
  - The 2nd card from the top of their security stack is flipped to face up.

- **Q5880** (2026-02-06): What happens to cards placed face up in the security stack by effects?
  - They become face-up security cards that remain revealed.
Other than rules that specify face-up security cards, the rules apply in the same manner as standard security cards.

- **Q5881** (2026-02-06): What happens upon a security check for a security card that is placed face-up?
  - The check is performed with the card left revealed.
Other than rules for cards left revealed, the rules apply in the same manner as standard security checks.

- **Q5882** (2026-02-06): Does a card's [Security] effect trigger upon a security check with that card placed face-up?
  - Yes, it triggers.

- **Q5883** (2026-02-06): What happens if I shuffle a security stack that includes security cards placed face-up?
  - Any face-up cards are placed face down, then you shuffle the cards.
After shuffling, all cards are left face-down.

- **Q5884** (2026-02-06): In what order do a [Security] effect, "when [...] performs a security check" effect, and "when a card is removed from [...] security stack" effect activate when they trigger simultaneously upon a security check?
  - [Security] effects take precedence for activation.
Upon a security check, a [Security] effect will immediately activate without pending activation.
For other triggered effects, the turn player activates their effects first.

- **Q5885** (2026-02-06): If I attack with this card, an opponent's face-up security card is checked for the security check, then this card's [Your Turn] effect activates and I place the top card of this Digimon at the bottom of the security stack, does the [End of Attack] effect on the Digimon under this card trigger?
  - Yes, it triggers.

- **Q5886** (2026-02-06): An opponent's Digimon attacks a player by an effect at the end of their turn. What happens if this card's {Security} [End of Opponent's Turn] effect then plays this card, my security stack is reduced to 0 cards, and the attack against the player is successful?
  - You lose the game.

- **Q5887** (2026-02-06): What happens if this card has just BT15-086 [Marvin Jackson] in its digivolution cards, it performs a security check on a face-up security card, and this card's [Your Turn] effect activates?
  - This card stacked on top is removed, causing this Digimon to become a Tamer, therefore the attacking Digimon is considered to be removed.

- **Q5888** (2026-02-06): This card has EX11-041 [Oblivimon] in its digivolution cards, it gained <Security A. +1>, and it attacks a player. At such times, if the [Your Turn] effect activates upon the 1st face-up security check and this card's top stacked card is placed as a security card, do I use EX11-041 [Oblivimon] to perform the 2nd check?
  - Yes, you use EX11-041 [Oblivimon] to perform the 2nd check.
If the 2nd check is on a face-up security card, EX11-041 [Oblivimon]'s [Your Turn] effect will also trigger.

## EX11-044 Pyramidimon

- **Q5889** (2026-02-06): Can I trash just 1 digivolution card for the conditions of this card's [On Play] [When Digivolving] [When Attacking] effect?
  - No, you can't.
A "by" condition can't be met if only some of the required actions are performed.
The conditions for this [On Play] [When Digivolving] [When Attacking] effect require you to trash the specified number of digivolution cards.

- **Q5890** (2026-02-06): Can I use this card's [On Play] [When Digivolving] [When Attacking] effect to trash a total of 3 digivolution cards from multiples of my Digimon?
  - Yes, you can.

- **Q5891** (2026-02-06): I have 3 or more [Mineral] or [Rock] trait cards in my trash. Can I use this card’s [All Turns] effect to place just 2 cards from my trash in digivolution cards?
  - No, you can't.
If you have 3 or more cards, you must place 3 cards in digivolution cards whenever possible.

- **Q5892** (2026-02-06): I have only 1 [Mineral] or [Rock] trait card in my trash. Can I use this card’s [All Turns] effect to place just 1 card from my trash in digivolution cards?
  - Yes, you can.

## EX11-045 Metatromon

- **Q5893** (2026-02-06): What does a card with "X in its text" refer to?
  - It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements.
For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.

- **Q5894** (2026-02-06): Do "when effects add to this Digimon's digivolution cards" effects also trigger when effects link a card?
  - No, they don't trigger.
Link cards aren't digivolution cards.

## EX11-046 Galacticmon

- **Q5895** (2026-02-06): There are only opponent's Digimon with no play costs. What happens if this card's [On Play] [When Digivolving] effect activates?
  - You can't choose your opponent's Digimon, and all opponent's Digimon that can't be chosen are deleted.

- **Q5896** (2026-02-06): What does a card with "X in its text" refer to?
  - It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements.
For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.

- **Q5897** (2026-02-06): What does "effects don't affect" mean, exactly?
  - This effect prevents a card from being affected by effects.
For example, your Digimon won't suspend if it's chosen for a "suspend 1 of your opponent's Digimon" effect, and its DP won't be reduced by 3000 if it's chosen for a "1 of your opponent's Digimon gets -3000 DP" effect.

- **Q5898** (2026-02-06): Can a card that has an "effects don't affect" effect be chosen for an effect?
  - Yes, it can be chosen.
For example, a Digimon that isn't affected by effects can be chosen for a "suspend 1 of your opponent's Digimon" effect.

- **Q5899** (2026-02-06): Can a card that has an "effects don't affect" effect be given an effect?
  - Yes, it can.
It won't be affected by it, but it can be given an effect.
However, if an effect such as <Security A.> is given to a Digimon that isn't affected by effects, the Digimon won't be considered to have that effect.

- **Q5900** (2026-02-06): If a card is affected by an effect, then it later gains an "effects don't affect" effect, what happens to the effect that was affecting it?
  - As soon as it gains the "effects don't affect" effect, it will no longer be affected.

- **Q5901** (2026-02-06): If a card has an "effects don't affect" effect, it gains an effect, then it later loses the "effects don't affect" effect, what happens to the effect that it gained?
  - It will be affected by the effect as soon as it can be affected by effects.

- **Q5902** (2026-02-06): A card that has an "effects don't affect" effect was given an effect that triggers at a timing such as [When Attacking]. Will the effect trigger if that card later meets the trigger conditions?
  - If the Digimon isn't affected by effects upon the trigger timing, the effect won't trigger.

- **Q6932** (2026-06-19): My Digimon digivolved into BT21-062 [Galacticmon] and I used its [When Digivolving] effect to place Vemmon in digivolution cards. At such times, can I activate this card's <Delay> effect and digivolve that Galacticmon into EX11-046 [Galacticmon]?
  - Yes, you can.

## EX11-047 Impmon

No card-specific Q&A in committed KB; general rules still apply.

## EX11-048 Ghostmon

No card-specific Q&A in committed KB; general rules still apply.

## EX11-049 Punkmon

- **Q5903** (2026-02-06): If I use this card's [When Attacking] effect to trash cards from my hand, can I then use this effect to digivolve into one of those cards from the trash?
  - Yes, you can digivolve into such a card.

## EX11-050 Loudmon

No card-specific Q&A in committed KB; general rules still apply.

## EX11-051 Necromon

- **Q5904** (2026-02-06): Multiple effects trigger when this card is deleted. In what order can they be activated?
  - The effects trigger simultaneously, so the player can choose the activation order.

- **Q5905** (2026-02-06): When this card with BT20-006 [DemiMeramon] in its digivolution cards is deleted, can I use BT20-006 [DemiMeramon]'s inherited effect to return this card to my hand after deletion, then activate this card's [On Deletion] effect to digivolve my Digimon into this card?
  - No, you can't.
If a card with an effect that's pending activation leaves that area before the effect activates, the effect can no longer be activated.
In this case, the deleted card's [On Deletion] effect triggers, but it's removed from the trash before the effect can activate.

## EX11-052 HeavyMetaldramon

- **Q5906** (2026-02-06): This card gained <Scapegoat>, and when it would be deleted other than by my effects, <Scapegoat> prevented the deletion. Can I then activate this card's [All Turns] effect?
  - Yes, you can.
<Scapegoat> and this card's [All Turns] effect will trigger simultaneously. You can also activate the [All Turns] effect after <Scapegoat> prevents the deletion.

## EX11-053 Omekamon

- **Q5907** (2026-02-06): I use this card's [On Deletion] effect to play BT20-102 [Omnimon (X Antibody)] and place this card into that Digimon's digivolution cards. If I then activate the played BT20-102 [Omnimon (X Antibody)]'s [On Play] [When Digivolving] effect, is the "if [Omnimon] or [X Antibody] is in this Digimon's digivolution cards" condition met?
  - Yes, it's met.

## EX11-054 Owen Dreadnought

- **Q5908** (2026-02-06): Can I process the part of the effect after "after" in this card's [All Turns] effect without meeting the "by" condition?
  - No, you can't.
If you don't suspend this card, you can't process the part after "after" in its [All Turns] effect.

## EX11-055 Chitose Horaiji

No card-specific Q&A in committed KB; general rules still apply.

## EX11-056 Ryutaro Williams

- **Q5909** (2026-02-06): What Digimon's digivolutions will trigger this card's [All Turns] effect?
  - It will trigger when any of your Digimon digivolve into a level 5 or higher Digimon with [Tyrannomon] in its name or a level 5 or higher Digimon with the [Dinosaur] trait.

- **Q5910** (2026-02-06): Can I process the part of the effect after "after" in this card's [All Turns] effect without meeting the "by" condition?
  - No, you can't.
If you don't suspend this card, you can't process the part after "after" in its [All Turns] effect.

## EX11-057 Suzune Kazuki

No card-specific Q&A in committed KB; general rules still apply.

## EX11-058 Yao Qinglan

- **Q5911** (2026-02-06): What will meet the "if played by <Decode>" condition?
  - The condition will be met if this effect is activated after being triggered by Digimion being played by <Decode>.
The condition won't be met if this effect is activated after being triggered by digivolution or by Digimion being played by a method other than <Decode>.

- **Q5912** (2026-02-06): My Digimon was played by <Decode>, and this card's [All Turns] effect triggered. What happens if I first use another effect to digivolve the played Digimon, then that digivolution triggers this card's [All Turns] effect again?
  - The playing and digivolving both trigger this card's [All Turns] effect.
The "if played by <Decode>" condition won't be met if this effect is activated after being triggered by digivolution, but it will be met if this effect is activated after being triggered by the Digimon being played by <Decode>.

## EX11-059 Reina Oumi

- **Q5913** (2026-02-06): An [NSo] trait Digimon with an [On Deletion] effect is deleted, and that card's [On Deletion] effect and this card's [All Turns] effect trigger simultaneously. At such times, if I activate this card's effect first, then DNA digivolve my Digimon and the card with the [On Deletion] effect that's pending activation, can I then activate that [On Deletion] effect?
  - No, you can't activate it.
When a card with an effect that's pending activation leaves its current area while activation is pending, the effect can no longer be activated.
In this case, the deleted card's [On Deletion] effect triggers, but it's removed from the trash before the effect can activate.

## EX11-060 Arisa Kinosaki

- **Q5914** (2026-02-06): What will meet the "if deleted by <Overclock>" condition?
  - The condition will be met if this effect is activated after being triggered by tokens or Digimon being deleted by <Overclock>.
The condition won't be met if this effect is activated after being triggered by tokens or Digimion being deleted by a method other than <Overclock>, attacking using <Overclock>, or deletion in battle.

## EX11-061 Mirai Kinosaki

- **Q5915** (2026-02-06): Do I delete the Digimon that was played by this card's [Your Turn] effect at the end of the turn?
  - Yes, it's deleted upon the deletion timing.

- **Q5916** (2026-02-06): What is the processing order for an effect that triggers at the end of the turn and the deletion of a Digimon played by this card's [Your Turn] effect?
  - The pending processing for the effect that triggers at the end of the turn and the deletion at the end of the turn are considered to be processing that triggers simultaneously. Therefore, the turn player can choose the processing order.

## EX11-062 Shoto Kazama

- **Q5826** (2026-02-06): My Digimon attacks an opponent's Digimon using <Vortex>, and I use this card's [All Turns] effect to play EX11-062 [Shoto Kazama]. Can I then use EX11-062 [Shoto Kazama]'s [Your Turn] effect to change the <Vortex> attack target to a player?
  - No, you can't.
EX11-062 [Shoto Kazama]'s [Your Turn] effect allows players to also be chosen as the attack target at the time of an attack declaration. It doesn't allow for changing the attack target.

- **Q5917** (2026-02-06): Can I process the part of the effect after "after" in this card's [All Turns] effect without meeting the "by" condition?
  - No, you can't.
If you don't suspend this card, you can't process the part after "after" in its [All Turns] effect.

- **Q5918** (2026-02-06): What will meet the "if effects suspended those Digimon" condition?
  - This condition will be met if this effect is activated after being triggered by a suspending effect.
If suspending occurs due to an attack or block, it will be due to the rules and not effects, therefore this effect won't trigger.

- **Q5919** (2026-03-13): Is a "while your opponent has no Digimon with XX" condition also met when my opponent has no Digimon?
  - Yes, it's met.

- **Q5920** (2026-02-06): What does "while your opponent has no unsuspended Digimon, your <Vortex> can also attack players" mean, exactly?
  - <Vortex> is an effect that normally only allows for attack declarations against Digimon, but this card's effect also allows <Vortex> attack declarations against players.

- **Q5921** (2026-02-06): If I use "while your opponent has no unsuspended Digimon, your <Vortex> can also attack players" to attack a player using <Vortex>, do "when attack targets change" effects trigger?
  - No, they don't trigger.
"While your opponent has no unsuspended Digimon, your <Vortex> can also attack players" isn't an effect that changes attack targets, it's an effect that allows for attack declarations using <Vortex> against players in addition to Digimon.

- **Q6517** (2026-05-08): Can I process the part of the effect after "after" in this card's [All Turns] effect even if a Digimon wasn't suspended by effects?
  - Yes, you can process it.
Even if it wasn't played by effects, this card's [All Turns] effect will give 1 of your Digimon with [Avian] or [Bird] in any of its traits or the [Vortex Warriors] trait +3000 DP until your opponent's turn ends.

## EX11-063 Winr

- **Q5922** (2026-02-06): Can I use this card's [On Play] effect to place a card from my hand as a security card even if I have 0 cards in my security stack?
  - Yes, you can.

- **Q5923** (2026-02-06): What happens to cards placed face up in the security stack by effects?
  - They become face-up security cards that remain revealed.
Other than rules that specify face-up security cards, the rules apply in the same manner as standard security cards.

- **Q5924** (2026-02-06): What happens upon a security check for a security card that is placed face-up?
  - The check is performed with the card left revealed.
Other than rules for cards left revealed, the rules apply in the same manner as standard security checks.

- **Q5925** (2026-02-06): Does a card's [Security] effect trigger upon a security check with that card placed face-up?
  - Yes, it triggers.

- **Q5926** (2026-02-06): What happens if I shuffle a security stack that includes security cards placed face-up?
  - Any face-up cards are placed face down, then you shuffle the cards.
After shuffling, all cards are left face-down.

- **Q5927** (2026-02-06): Can I use this card's [End of Your Turn] effect to give <Collision> and <Piercing> to a Digimon, but then choose to not attack with that Digimon?
  - No, you can't.
The Digimon that was given <Collision> and <Piercing> by this effect must attack if possible.

## EX11-064 Altea

- **Q5928** (2026-02-06): What happens to cards placed face up in the security stack by effects?
  - They become face-up security cards that remain revealed.
Other than rules that specify face-up security cards, the rules apply in the same manner as standard security cards.

- **Q5929** (2026-02-06): What happens upon a security check for a security card that is placed face-up?
  - The check is performed with the card left revealed.
Other than rules for cards left revealed, the rules apply in the same manner as standard security checks.

- **Q5930** (2026-02-06): Does a card's [Security] effect trigger upon a security check with that card placed face-up?
  - Yes, it triggers.

- **Q5931** (2026-02-06): What happens if I shuffle a security stack that includes security cards placed face-up?
  - Any face-up cards are placed face down, then you shuffle the cards.
After shuffling, all cards are left face-down.

## EX11-065 Close

No card-specific Q&A in committed KB; general rules still apply.

## EX11-066 Xeno

- **Q5932** (2026-02-06): What does a card with "X in its text" refer to?
  - It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements.
For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.

## EX11-067 Dokuson Aruba

- **Q5933** (2026-02-06): Can I use a "Digimon on the field may digivolve" effect to digivolve a Digimon from the breeding area or battle area?
  - Yes, you can.
The "field" refers to both the breeding area and the battle area.

- **Q5934** (2026-02-06): If I use this card's [On Play] effect to digivolve a Digimon in the breeding area, does that Digimon's [When Digivolving] effect trigger?
  - No, it doesn't trigger.

- **Q5935** (2026-02-06): Does this card's [Your Turn] effect trigger when I use this card’s [On Play] effect to digivolve my Digimon in the battle area?
  - Yes, it triggers.

- **Q5936** (2026-02-06): Does this card’s [Your Turn] effect trigger when I use this card’s [On Play] effect to digivolve my Digimon in the breeding area?
  - No, it doesn't trigger.

- **Q5937** (2026-02-06): What does a card with "X in its text" refer to?
  - It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements.
For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.

## EX11-068 Violet Inboots

- **Q5938** (2026-02-06): What will meet the "if attacking by <Execute>" condition?
  - The condition will be met if this effect is activated after being triggered by an attack using <Execute>.

## EX11-069 Yuuki

- **Q5939** (2026-02-06): An opponent's Digimon uses another effect to attack a player at the end of their turn, this card is checked, and its [Security] effect plays it. After it's played, can I then activate this card's [All Turns] effect?
  - No, you can't. [End of All Turns] effects are effects that trigger at the end of a turn. If the turn has already ended, it won't trigger.

## EX11-070 Unchained

- **Q5940** (2026-02-06): Can I use this card's [End of Your Turn] effect to perform <Mind Link> without DNA digivolving?
  - Yes, you can.

- **Q5941** (2026-02-06): There is a Digimon with a "can't have less than 1000 DP" effect and an original DP of 5000. It then gets +2000 DP, changing its DP to 7000. What happens if another effect gives that Digimon -7000 DP?
  - Its DP becomes 1000.
For changes to DP, the values of the changes are first calculated, then the changes are applied to the original value.
In this case, +2000 DP and -7000 DP are the values of the changes, and those values are applied to the original DP of 5000.
If a Digimon with 5000 DP gets -5000 DP but it has a "can't have less than 1000 DP" effect, its DP will change to 1000.

- **Q5942** (2026-02-06): What does a card with "X in its text" refer to?
  - It refers to a card that contains the specified text or icon in its name, traits, effects, inherited effects, (Rule), digivolution requirements, DNA digivolution, DigiXros requirements, burst digivolve, App Fusion, Link, or Assembly requirements.
For example, a card with [Knightmon] in its text would include cards with the name [DarkKnightmon] and cards with the text [Knightmon] in their effects.

- **Q5943** (2026-02-06): What does a "can't trash stacked cards" effect do, exactly?
  - This effect prevents cards stacked on top from being trashed by <De-Digivolve> or other effects, and cards stacked on the bottom can't be trashed by effects such as those that trash digivolution cards.

- **Q6523** (2026-05-08): Does this card's [All Turns] effect trigger when I use EX11-070 [Unchained]'s inherited effect to play [Unchained] from my Digimon's digivolution cards?
  - Yes, it triggers.

## EX11-071 Cool Boy

No card-specific Q&A in committed KB; general rules still apply.

## EX11-072 Unique Emblem: Guardian Vortex

- **Q5944** (2026-02-06): If I would use this card's <Delay> effect to digivolve my Digimon, can it digivolve into Digimon card with just the [Bird Dragon] or [LIBERATOR] trait?
  - No, it can't.
It can only digivolve into a card with both the [Bird Dragon] and [LIBERATOR] traits.

## EX11-073 ExMaquinamon

- **Q5945** (2026-02-06): If a Digimon with a link card would DNA digivolve into this card, what happens to the link card of the Digimon that would become a digivolution card?
  - The link card is trashed immediately before stacking the Digimon as a digivolution card.

- **Q5946** (2026-02-06): If <Mind Link> places a card in this card's digivolution cards, is it also included as one of this card's link cards?
  - No, it isn't.
A link card is a card plugged in sideways with a Digimon by a <Link>.

- **Q5947** (2026-02-06): If a card has a "for each XX, [action 1] and [action 2]" effect and there are multiples of XX, in what order are [action 1] and [action 2] processed?
  - After performing [action 1] for each XX, then [action 2] is performed.
For example, if a Digimon has 3 colors in its digivolution cards and a "for each color of this Digimon's digivolution cards, choose 1 digivolution card under your opponent's Digimon and trash it, and suspend 1 of your opponent's Digimon" effect activates, you first choose 3 digivolution cards under your opponent's Digimon and trash them, then you suspend 3 of their Digimon.

## EX11-074 Vortexdramon

- **Q5948** (2026-02-06): Can I use this card's [When Digivolving] [When Attacking] effect to suspend either my Digimon or my opponent's Digimon?
  - Yes, either can be suspended.

- **Q5949** (2026-02-06): What does "effects don't affect" mean, exactly?
  - This effect prevents a card from being affected by effects.
For example, your Digimon won't suspend if it's chosen for a "suspend 1 of your opponent's Digimon" effect, and its DP won't be reduced by 3000 if it's chosen for a "1 of your opponent's Digimon gets -3000 DP" effect.

- **Q5950** (2026-02-06): Can a card that has an "effects don't affect" effect be chosen for an effect?
  - Yes, it can be chosen.
For example, a Digimon that isn't affected by effects can be chosen for a "suspend 1 of your opponent's Digimon" effect.

- **Q5951** (2026-02-06): Can a card that has an "effects don't affect" effect be given an effect?
  - Yes, it can.
It won't be affected by it, but it can be given an effect.
However, if an effect such as <Security A.> is given to a Digimon that isn't affected by effects, the Digimon won't be considered to have that effect.

- **Q5952** (2026-02-06): If a card is affected by an effect, then it later gains an "effects don't affect" effect, what happens to the effect that was affecting it?
  - As soon as it gains the "effects don't affect" effect, it will no longer be affected.

- **Q5953** (2026-02-06): If a card has an "effects don't affect" effect, it gains an effect, then it later loses the "effects don't affect" effect, what happens to the effect that it gained?
  - It will be affected by the effect as soon as it can be affected by effects.

- **Q5954** (2026-02-06): A card that has an "effects don't affect" effect was given an effect that triggers at a timing such as [When Attacking]. Will the effect trigger if that card later meets the trigger conditions?
  - If the Digimon isn't affected by effects upon the trigger timing, the effect won't trigger.

- **Q5955** (2026-02-06): What does "may battle" mean, exactly?
  - This effect directly performs a battle.
If this effect is activated, the chosen Digimon battle, as with the standard rules.

- **Q5956** (2026-03-06): If 2 Digimon including a Digimon that has an "effects don't affect" effect are chosen for a "may battle" effect, can those Digimon battle?
  - Yes, they can battle.
A card that has an "effects don't affect" effect can still be chosen for an effect. In addition, a battle itself is a rule that compares DP, not an effect. Therefore, a Digimon that isn't affected by effects can be chosen, and then it can battle.
If it loses the battle, it will be deleted as normal according to the rules.

- **Q5957** (2026-03-06): During an attack by this card, I used its [All Turns] effect to have it and an opponent's Digimon battle, and my opponent's Digimon was deleted in battle. Then, if the attack target successfully becomes an opponent's Digimon and it's also deleted in battle, do I use this card's <Piercing> to perform 2 security checks?
  - No, you only perform 1 security check for <Piercing>.
Only 1 security check can be performed during a single attack, even if <Piercing> activates multiple times.
However, if the number of security checks is modified by <Security A.>, that number of cards will be checked in a single security check.

- **Q5958** (2026-03-06): During an attack by this card, I used its [All Turns] effect to have it and an opponent's Digimon battle, and my opponent's Digimon was deleted in battle. Then, if the attack target successfully becomes an opponent's Digimon, it loses the battle, but an effect prevents it from being deleted, can I still activate this card's <Piercing>?
  - Yes, you can.
<Piercing> is an effect that triggers and activates if an opponent's Digimon is deleted in battle during the attack, and it's processed immediately before the end of attack timing.
<Piercing> will still trigger if the Digimon with <Piercing> successfully attacks a Digimon, even if another battle occurs during this battle.

- **Q5959** (2026-02-06): A Digimon other than this card attacks, I used this card's [All Turns] effect to have this card and an opponent's Digimon battle, and my opponent's Digimon was deleted in battle. At such times, does this card's <Piercing> trigger?
  - No, it doesn't trigger.
<Piercing> will only trigger if this card deletes an opponent's Digimon in battle during this card's attack.
