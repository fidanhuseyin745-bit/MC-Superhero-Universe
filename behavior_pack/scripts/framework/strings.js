/**
 * Bundled localization table.
 *
 * GENERATED FILE - edit resource_pack/texts/en_US.lang and run
 * `node tools/gen-strings.mjs`. The validator compares the two and fails the
 * build when they disagree.
 *
 * Why bundle it at all: the Bedrock script runtime has no filesystem access, so
 * a lang file cannot be read at runtime. The lang file is what the engine renders
 * from, and this mirror is what the engine formats from.
 */
export const STRINGS = {
  'item.msu:hero_core': 'Hero Core',
  'msu.hero.cosmic': 'Cosmic Hero',
  'msu.hero.speed': 'Speed Hero',
  'msu.hero.spider': 'Spider Hero',
  'msu.hero.tech': 'Tech Hero',
  'msu.hero.thunder': 'Thunder Hero',
  'msu.message.ability_locked': '§cAbility not unlocked yet.',
  'msu.message.ability_used': '§a%1% §7cooldown %2%s',
  'msu.message.energy': '§bEnergy: %1%/%2%',
  'msu.message.energy_empty': '§cNot enough energy.',
  'msu.message.hint_energy': '§7Show energy: sneak + jump',
  'msu.message.hint_key': '§7Power key: §f%1%',
  'msu.message.hint_swap': '§7Swap suit: sneak + power key',
  'msu.message.level_up': '§6Level up!§r §f%1% §7is now level §f%2%',
  'msu.message.no_hero': '§7No hero selected. Craft a Hero Core.',
  'msu.message.no_permission': '§cYou are not allowed to use that command.',
  'msu.message.not_target': '§7You must look at a target.',
  'msu.message.progress': '§7%1% §f%2% §7(level %3%)',
  'msu.message.reloaded': '§aMSU reloaded.',
  'msu.message.selected': '§aHero set to §f%1%§r.',
  'msu.message.suit_equipped': '§aEquipped §f%1%§r.',
  'msu.message.suit_locked': '§cThat suit is still locked.',
  'msu.message.unknown_hero': '§cThat hero does not exist.',
  'msu.message.unknown_suit': '§cThat suit does not exist.',
  'msu.status.cooldown': '§c%1%s',
  'msu.status.energy': '§b%1%',
  'msu.status.ready': '§aReady',
  'msu.suit.cosmic.mk1': 'Cosmic Shell',
  'msu.suit.cosmic.mk2': 'Nova Shell',
  'msu.suit.speed.mk1': 'Trail Suit',
  'msu.suit.speed.mk2': 'Blur Suit',
  'msu.suit.spider.mk1': 'Web Suit',
  'msu.suit.spider.mk2': 'Neon Suit',
  'msu.suit.tech.mark1': 'Mark I',
  'msu.suit.tech.mark2': 'Mark II',
  'msu.suit.tech.mark3': 'Mark III',
  'msu.suit.thunder.mk1': 'Storm Suit',
  'msu.suit.thunder.mk2': 'Thunder Lord',
  'msu.ui.menu.body': 'Pick a suit to equip. Locked suits need more progress.',
  'msu.ui.menu.locked': '%1% (locked)',
  'msu.ui.menu.title': 'MSU Suit Locker',
  'msu.ui.stats.body': 'Hero: %1%\nSuit: %2%\nEnergy: %3%/%4%\nPower level: %5%',
  'msu.ui.stats.title': 'MSU Progress',
  'pack.description': '§bModular superhero framework§r - engine core + starter heroes.',
  'pack.description.behavior': 'Hero registry, energy, abilities, suits.',
  'pack.description.resource': 'Placeholder models, textures and particles.',
  'pack.name': 'MC Superhero Universe',
  'pack.name.behavior': 'MSU Behavior',
  'pack.name.resource': 'MSU Resources',
};

export default STRINGS;
