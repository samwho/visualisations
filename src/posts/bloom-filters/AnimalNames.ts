// Colour-animal pairs provide 1,000 short example values without storing each one.
const colours =
	"red blue green yellow orange purple pink black white brown grey gold silver teal navy coral lime mint olive violet indigo amber ivory ruby cyan".split(
		" ",
	);
const animals =
	"ant ape bat bear bee cat crab crow deer dog dove duck eel elk emu fox frog goat goose hare hawk hippo horse kiwi lion lynx mole moose mouse newt owl otter panda pig rat seal shark slug swan wolf".split(
		" ",
	);

export function randomAnimalName(excluding: string): string {
	let name: string;
	do {
		const index = Math.floor(Math.random() * colours.length * animals.length);
		name = `${colours[Math.floor(index / animals.length)]} ${animals[index % animals.length]}`;
	} while (name === excluding);
	return name;
}
