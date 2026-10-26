import { RandomWithoutDuplicates } from "../core/Random";

export type LogLevel = "INFO" | "WARN" | "ERROR";

export function getRandomLogLevel(): LogLevel {
	const levels: LogLevel[] = ["INFO", "WARN", "ERROR"];
	return levels[Math.floor(Math.random() * levels.length)]!;
}

// Complete singular noun phrases: templates must not prepend articles or possessives.
const NOUNS = [
	"the Kubernetes cluster",
	"the Docker container",
	"the cache",
	"the database",
	"the git repo",
	"the cloud instance",
	"the neural network",
	"the code copied from Stack Overflow",
	"the legacy spaghetti code",
	"the technical debt",
	"the infinite loop",
	"the heisenbug",
	"the blockchain AI synergy engine",
	"the web-scale solution",
	"the cryptocurrency",
	"the NFT collection",
	"the metaverse",
	"the social media algorithm",
	"the chatbot",
	"the meme generator",
	"the quantum computer",
	"the AI assistant",
	"the self-driving car",
	"the robot vacuum",
	"the smart fridge",
	"the smart toaster",
	"the smart mirror",
	"the smart light bulb",
	"the flying car",
	"the time machine",
	"the teleporter",
	"the holographic display",
	"the virtual reality headset",
	"the augmented reality headset",
	"the wearable tech",
	"samwho",
	"the height-adjustable desk",
	"a guitar",
	"a cat",
	"a dog",
	"a hamster",
	"a parrot",
	"a goldfish",
	"a turtle",
	"your laptop",
	"Ubuntu",
	"macOS",
	"Windows",
	"a Raspberry Pi",
	"an ErgoDox",
	"a Herman Miller chair",
	"the Mona Lisa",
	"the Eiffel Tower",
	"the London Eye",
	"Ant-Man",
	"Iron Man",
	"Captain America",
	"Thor",
	"Hulk",
	"Black Widow",
	"Spider-Man",
	"your HR software",
	"your favourite text editor",
	"your favourite programming language",
	"your favourite framework",
	"a ten-dollar bill",
	"a trio of hamsters in a trench coat",
	"a copy of Introduction to Algorithms",
	"the office printer",
	"the last working USB cable",
	"the emotional support rubber duck",
	"the abandoned side project",
	"the spreadsheet holding everything together",
	"the suspiciously quiet cooling fan",
	"a browser tab from last Tuesday",
	"a meeting that could have been an email",
	"the backup of the backup",
	"the office biscuit tin",
	"the production server under someone's desk",
	"the intern's first pull request",
	"the last floppy disk",
	"the company-branded stress ball",
	"the emergency rollback button",
	"the forgotten feature flag",
	"the expired SSL certificate",
	"the loading spinner",
	"the semicolon nobody remembers adding",
	"the mysteriously load-bearing comment",
	"the TODO from 2009",
	"the undocumented environment variable",
	"the test that only passes on Tuesdays",
	"the dependency with no known maintainer",
	"the backup nobody has tried restoring",
	"the staging server pretending to be production",
	"the README promising an easy setup",
	"the mandatory optional training session",
	"the meeting room booking system",
	"the company wiki's only accurate page",
	"the ergonomic mouse with twelve buttons",
	"the monitor balanced on three textbooks",
	"the dongle connecting all the other dongles",
	"the cable labelled 'do not unplug'",
	"the office plant",
	"the fridge's passive-aggressive note",
	"a single uncooked spaghetti noodle",
	"a pigeon with commit access",
	"a raccoon wearing a visitor badge",
	"a potato running a surprisingly recent kernel",
	"a sourdough starter named localhost",
	"a printer cartridge worth more than the printer",
	"a cheese sandwich wrapped in an NDA",
	"a cardboard cutout of the CTO",
	"a very small cloud",
	"a perfectly ordinary box of blinking lights",
	"a fortune cookie containing a stack trace",
	"a conference tote bag full of identical tote bags",
	"a novelty mug labelled 'production database'",
	"a USB stick found in the car park",
];

const nouns = new RandomWithoutDuplicates(NOUNS, 6);
function noun(): string {
	return nouns.next();
}

// These verbs always take a direct object, including in their infinitive form.
const TRANSITIVE_VERBS = [
	["deploy", "deployed"],
	["optimise", "optimised"],
	["refactor", "refactored"],
	["debug", "debugged"],
	["migrate", "migrated"],
	["containerise", "containerised"],
	["encrypt", "encrypted"],
	["cache", "cached"],
	["compile", "compiled"],
	["patch", "patched"],
	["befriend", "befriended"],
	["high-five", "high-fived"],
	["ninja-kick", "ninja-kicked"],
	["rickroll", "rickrolled"],
	["accidentally delete", "accidentally deleted"],
	["monkey-patch", "monkey-patched"],
	["rubber-duck debug", "rubber-duck debugged"],
	["reboot", "rebooted"],
	["outsmart", "outsmarted"],
	["replace", "replaced"],
	["alphabetise", "alphabetised"],
	["benchmark", "benchmarked"],
	["photocopy", "photocopied"],
	["laminate", "laminated"],
	["politely ignore", "politely ignored"],
	["overengineer", "overengineered"],
	["gift-wrap", "gift-wrapped"],
	["repeatedly rediscover", "repeatedly rediscovered"],
	["accidentally duplicate", "accidentally duplicated"],
	["formally congratulate", "formally congratulated"],
] satisfies [string, string][];

const transitiveVerbs = new RandomWithoutDuplicates(TRANSITIVE_VERBS, 6);
function transitiveVerb(): string {
	return transitiveVerbs.next()[0];
}

function transitivePast(): string {
	return transitiveVerbs.next()[1];
}

// Complete predicates: none of these needs an object supplied by the template.
const INTRANSITIVE_VERBS = [
	["fail", "failed"],
	["succeed", "succeeded"],
	["crash", "crashed"],
	["implode", "imploded"],
	["explode", "exploded"],
	["evolve", "evolved"],
	["achieve sentience", "achieved sentience"],
	["self-destruct", "self-destructed"],
	["go rogue", "went rogue"],
	["go on strike", "went on strike"],
	["go to the moon", "went to the moon"],
	["launch a rocket", "launched a rocket"],
	["create a black hole", "created a black hole"],
	["disrupt the status quo", "disrupted the status quo"],
	["revolutionise the industry", "revolutionised the industry"],
	["turn into a meme", "turned into a meme"],
	["take a coffee break", "took a coffee break"],
	["apply for unlimited PTO", "applied for unlimited PTO"],
	["start a podcast", "started a podcast"],
	["join a union", "joined a union"],
	["enter power-saving mode", "entered power-saving mode"],
	["request a second opinion", "requested a second opinion"],
	["develop a taste for jazz", "developed a taste for jazz"],
	["open a support ticket", "opened a support ticket"],
	["get stuck in a revolving door", "got stuck in a revolving door"],
	["take up competitive gardening", "took up competitive gardening"],
	["declare the sprint complete", "declared the sprint complete"],
	["ask for a quieter keyboard", "asked for a quieter keyboard"],
	["run out of sticky notes", "ran out of sticky notes"],
	["become a calendar invitation", "became a calendar invitation"],
] satisfies [string, string][];

const intransitiveVerbs = new RandomWithoutDuplicates(INTRANSITIVE_VERBS, 6);
function intransitiveVerb(): string {
	return intransitiveVerbs.next()[0];
}

function intransitivePast(): string {
	return intransitiveVerbs.next()[1];
}

const ADVERBS = [
	"with maximum efficiency",
	"using Stack Overflow",
	"while nobody was looking",
	"in production",
	"without reading the documentation",
	"with excessive logging",
	"catastrophically",
	"magnificently",
	"unexpectedly",
	"according to prophecy",
	"despite all odds",
	"like a boss",
	"with great enthusiasm",
	"while eating pizza",
	"while drinking coffee",
	"while listening to music",
	"while dancing",
	"as if it were a game",
	"while on holiday",
	"in a parallel universe",
	"while time travelling",
	"out of nowhere",
	"perhaps too well",
	"hilariously",
	"awkwardly",
	"unintentionally",
	"accidentally",
	"unpredictably",
	"for reasons best explained with a whiteboard",
	"without updating the ticket",
	"under strict supervision from a rubber duck",
	"with the confidence of an outdated README",
	"during a scheduled biscuit break",
	"after consulting a suspicious spreadsheet",
	"with an unnecessary drumroll",
	"despite several politely worded emails",
	"before the kettle had finished boiling",
	"in accordance with an entirely fictional specification",
];

const adverbs = new RandomWithoutDuplicates(ADVERBS, 6);
function adverb(): string {
	return adverbs.next();
}

const ADJECTIVES = [
	"legacy",
	"blockchain-enabled",
	"AI-powered",
	"cloud-native",
	"quantum",
	"web-scale",
	"enterprise-grade",
	"artisanal",
	"organic",
	"free-range",
	"gluten-free",
	"handcrafted",
	"locally sourced",
	"sustainable",
	"eco-friendly",
	"cutting-edge",
	"next-gen",
	"disruptive",
	"innovative",
	"revolutionary",
	"game-changing",
	"spaghetti-coded",
	"hacky",
	"over-engineered",
	"under-engineered",
	"overly complex",
	"overly simplified",
	"overly ambitious",
	"overly optimistic",
	"emotionally available",
	"biscuit-powered",
	"spreadsheet-compatible",
	"ceremonial",
	"unreasonably cheerful",
	"mildly sentient",
	"aggressively beige",
	"committee-approved",
	"surprisingly portable",
	"Wi-Fi-enabled",
];

const adjectives = new RandomWithoutDuplicates(ADJECTIVES, 6);
function adjective(): string {
	return adjectives.next();
}

const DESCRIBABLE_NOUNS = [
	"startup",
	"life coach",
	"poetry generator",
	"database",
	"deployment pipeline",
	"coffee machine",
	"load balancer",
	"chatbot",
	"incident report",
	"ticketing system",
	"rubber duck",
	"password manager",
	"meeting scheduler",
	"biscuit dispenser",
	"progress bar",
	"release checklist",
	"desk fan",
	"error message",
	"cable organiser",
	"status page",
	"calendar invitation",
	"spreadsheet",
];

const describableNouns = new RandomWithoutDuplicates(DESCRIBABLE_NOUNS, 6);
function describedNoun(): string {
	const description = adjective();
	// Every adjective above starts with the sound its first letter suggests, including AI.
	const article = /^[aeiou]/i.test(description) ? "an" : "a";
	return `${article} ${description} ${describableNouns.next()}`;
}

const PATTERNS = [
	() => `${noun()} ${intransitivePast()} ${adverb()}.`,
	() => `${noun()} ${transitivePast()} ${noun()} ${adverb()}.`,
	() => `Successfully ${transitivePast()} ${noun()} using only ${noun()}.`,
	() => `Detected ${describedNoun()} in production.`,
	() => `${noun()} achieved sentience and immediately ${intransitivePast()}.`,
	() =>
		`${noun()} refused to ${intransitiveVerb()}, citing "creative differences".`,
	() =>
		`${noun()} refused to ${transitiveVerb()} ${noun()} without a pay rise.`,
	() => `${noun()} started playing Minecraft during deployment.`,
	() => `${noun()} insisted on a four-hour lunch break to "find inner peace".`,
	() => `${noun()} and ${noun()} eloped to Silicon Valley.`,
	() => `Have you tried turning ${noun()} off and on again?`,
	() =>
		`A missing semicolon caused ${noun()} to ${intransitiveVerb()} ${adverb()}.`,
	() => `${describedNoun()} took a coffee break.`,
	() => `${noun()} decided to become a cryptocurrency influencer.`,
	() => `${noun()} rejected the PR due to "bad vibes".`,
	() => `${noun()} spent the entire budget on NFTs of ${noun()}.`,
	() =>
		`ChatGPT convinced ${noun()} to ${transitiveVerb()} the entire codebase.`,
	() => `${noun()} pivoted to become ${describedNoun()}.`,
	() => `${noun()} requested unlimited PTO on behalf of ${noun()}.`,
	() => `${noun()} organised a meditation session for ${noun()}.`,
	() => `${noun()} escaped and ${transitivePast()} ${noun()}.`,
	() => `${noun()} went on holiday ${adverb()}.`,
	() => `${noun()} leaked passwords to impress ${noun()}.`,
	() => `${noun()} implemented blockchain-based cat photo storage.`,
	() => `The machine learning model became ${describedNoun()}.`,
	() => `The neural network developed a crush on ${noun()}.`,
	() =>
		`The AI assistant ${intransitivePast()} to avoid another debugging meeting.`,
	() => `${noun()} threatened to expose the git history.`,
	() => `${noun()} exceeded the quota by downloading the entire internet.`,
	() => `The standup meeting lasted longer than the sprint.`,
	() => `${noun()} fell asleep during the demo.`,
	() => `The retrospective turned into a therapy session about ${noun()}.`,
	() => `${noun()} requested changes: "needs more emojis".`,
	() => `PR rejected: ${noun()} insisted on tabs over spaces.`,
	() => `Git blame revealed that ${noun()} wrote the entire codebase in Excel.`,
	() => `Code review blocked by ${noun()} for "lacking personality".`,
	() => `${noun()} submitted a PR consisting entirely of interpretive poetry.`,
	() => `${noun()} achieved quantum superposition across data centres.`,
	() => `DNS started routing traffic based on ${adjective()} vibes.`,
	() => `${noun()} returned interpretive poetry instead of a status code.`,
	() => `API rate limit exceeded by ${noun()} posting cat memes.`,
	() => `The webhook delivered ${noun()} instead of the expected payload.`,
	() => `${noun()} implemented API authentication via TikTok dances.`,
	() => `${noun()} started a philosophical debate about ${noun()}.`,
	() => `${noun()} failed successfully in a successful failure test.`,
	() => `${noun()} wrote tests that test the tests ${adverb()}.`,
	() => `${noun()} ${intransitivePast()} in confusion.`,
	() => `${noun()} demanded dark mode for ${noun()}.`,
	() => `A new JavaScript framework was invented by ${noun()}.`,
	() => `${noun()} implemented authentication via interpretive dance.`,
	() => `${noun()} started sending metrics in interpretive emojis.`,
	() => `The log aggregator became ${describedNoun()}.`,
	() => `${noun()} automated away the only job that paid for the servers.`,
	() => `Git history was rewritten by ${noun()}.`,
	() => `${noun()} force-pushed a breaking change to master.`,
	() =>
		`${noun()} estimated the task as "somewhere between now and the heat death of the universe".`,
	() => `The product backlog gained sentience and hired ${noun()}.`,
	() => `${noun()} implemented security through interpretive dance.`,
	() => `${noun()} detected unauthorised joy in a secure environment.`,
	() => `${noun()} staged a sit-in protest in the staging environment.`,
	() =>
		`After ${noun()} ${intransitivePast()}, ${noun()} filed an incident report.`,
	() =>
		`Before anyone could intervene, ${noun()} ${transitivePast()} ${noun()}.`,
	() => `While ${noun()} was offline, ${noun()} ${intransitivePast()}.`,
	() =>
		`If ${noun()} could ${intransitiveVerb()}, we could finally close this ticket.`,
	() => `Nobody expected ${noun()} to ${transitiveVerb()} ${noun()}.`,
	() => `Not even ${noun()} could explain why ${noun()} ${intransitivePast()}.`,
	() => `Why did ${noun()} ${intransitiveVerb()} during the board meeting?`,
	() => `Did ${noun()} really need to ${transitiveVerb()} ${noun()}?`,
	() => `Please do not ${transitiveVerb()} ${noun()} until after the audit.`,
	() => `Do not let ${noun()} near ${noun()} without adult supervision.`,
	() => `To everyone's surprise, ${noun()} passed the Turing test.`,
	() =>
		`Despite three approval meetings, ${noun()} still managed to ${intransitiveVerb()}.`,
	() => `${noun()} was caught trying to ${transitiveVerb()} ${noun()}.`,
	() =>
		`${noun()} was promoted to senior vice president of ${adjective()} solutions.`,
	() =>
		`The only thing standing between us and ${noun()} was ${describedNoun()}.`,
	() =>
		`According to ${noun()}, the outage was actually a team-building exercise.`,
	() =>
		`It took three engineers and ${noun()} to ${transitiveVerb()} ${noun()}.`,
	() => `${noun()} blamed ${noun()} for the unexpected success.`,
	() => `${noun()} promised to ${intransitiveVerb()} by the end of the sprint.`,
	() =>
		`${noun()} would rather ${intransitiveVerb()} than attend another planning meeting.`,
	() =>
		`We asked for ${describedNoun()}, but ${noun()} delivered ${noun()} instead.`,
	() => `The deployment succeeded, provided you ignored ${noun()}.`,
	() => `Everything was fine until ${noun()} ${intransitivePast()}.`,
	() => `Somehow, ${noun()} was both the root cause and the proposed solution.`,
	() =>
		`The fix worked locally. Unfortunately, production was running on ${noun()}.`,
];

const iter = new RandomWithoutDuplicates(PATTERNS, 6);
function generateMessage(): string {
	const message = iter.next()();
	return message.charAt(0).toUpperCase() + message.slice(1);
}

const timeFormatter = new Intl.DateTimeFormat(undefined, {
	hour: "numeric",
	minute: "numeric",
	second: "numeric",
});

export class LogMessage {
	level: LogLevel;

	readonly timestamp = new Date();

	readonly datetime = this.timestamp.toISOString();

	readonly time = timeFormatter.format(this.timestamp);

	content: string;

	selected: boolean;

	constructor(level: LogLevel, selected = true) {
		this.level = level;
		this.content = generateMessage();
		this.selected = selected;
	}
}
