import { div } from "./DOM";
import { HistoryPicker } from "./Random";

export type LogLevel = "INFO" | "WARN" | "ERROR";
export function getRandomLogLevel(): LogLevel {
  const levels = ["INFO", "WARN", "ERROR"] as const;
  return levels[Math.floor(Math.random() * levels.length)];
}

const VERBS_PAST_TENSE = [
  "deployed",
  "optimized",
  "refactored",
  "debugged",
  "migrated",
  "containerized",
  "encrypted",
  "cached",
  "compiled",
  "patched",
  "befriended",
  "high fived",
  "ninja kicked",
  "rickrolled",
  "yeet processed",
  "accidentally deleted",
  "monkey patched",
  "rubber duck debugged",
  "failed",
  "succeeded",
  "crashed",
  "imploded",
  "exploded",
  "survived",
  "evolved",
  "achieved sentience",
  "self destructed",
  "went rogue",
  "went on strike",
  "went to the moon",
  "launched a rocket",
  "created a black hole",
  "disrupted the status quo",
  "revolutionized the industry",
  "turned into a meme",
];

const VERBS = [
  "deploy",
  "optimize",
  "refactor",
  "debug",
  "migrate",
  "containerize",
  "encrypt",
  "cache",
  "compile",
  "patch",
  "befriend",
  "high five",
  "ninja kick",
  "rickroll",
  "yeet process",
  "accidentally delete",
  "monkey patch",
  "rubber duck debug",
  "fail",
  "succeed",
  "crash",
  "implode",
  "explode",
  "survive",
  "evolve",
  "achieve sentience",
  "self destruct",
  "go rogue",
  "go on strike",
  "go to the moon",
  "launch a rocket",
  "create a black hole",
  "disrupt the status quo",
  "revolutionize the industry",
  "turn into a meme",
];

const NOUNS = [
  "Kubernetes cluster",
  "Docker container",
  "cache",
  "database",
  "git repo",
  "cloud instance",
  "neural network",
  "stack overflow copy paste",
  "legacy spaghetti code",
  "technical debt",
  "infinite loop",
  "heisenbug",
  "blockchain AI synergy engine",
  "web scale solution",
  "cryptocurrency",
  "NFT collection",
  "metaverse",
  "social media algorithm",
  "chat bot",
  "meme generator",
  "quantum computer",
  "AI assistant",
  "self-driving car",
  "robot vacuum",
  "smart fridge",
  "smart toaster",
  "smart mirror",
  "smart light bulb",
  "flying car",
  "time machine",
  "teleporter",
  "holographic display",
  "virtual reality headset",
  "augmented reality glasses",
  "wearable tech",
  "samwho",
  "height-adjustable desk",
  "a guitar",
  "a cat",
  "a dog",
  "a hamster",
  "a parrot",
  "a goldfish",
  "a turtle",
  "your laptop",
  "Ubuntu",
  "MacOS",
  "Windows",
  "a Raspberry Pi",
  "an ErgoDox",
  "a Herman-Miller chair",
  "the Mona Lisa",
  "the Eiffel Tower",
  "the London Eye",
  "Antman",
  "Ironman",
  "Captain America",
  "Thor",
  "Hulk",
  "Black Widow",
  "Spider-Man",
  "your HR software",
  "your favorite text editor",
  "your favorite programming language",
  "your favorite framework",
  "a 10 dollar bill",
  "3 hamsters in a trench coat",
  "a copy of Introduction to Algorithms",
];

const ADVERBS = [
  "with maximum efficiency",
  "using stack overflow",
  "while nobody was looking",
  "in production",
  "without reading documentation",
  "with excessive logging",
  "catastrophically",
  "magnificently",
  "unexpectedly",
  "according to prophecy",
  "despite all odds",
  "like a boss",
  "yolo style",
  "with great enthusiasm",
  "while eating pizza",
  "while drinking coffee",
  "while listening to music",
  "while dancing",
  "as if it was a game",
  "while on vacation",
  "extraordinarily",
  "in a parallel universe",
  "while time traveling",
  "out of nowhere",
  "perhaps too well",
  "exceeding expectations",
  "hilariously",
  "awkwardly",
  "unintentionally",
  "accidentally",
  "unbelievably",
  "unpredictably",
];

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
  "locally-sourced",
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
];

const PATTERNS = [
  () =>
    `${pick(ADJECTIVES)} ${pick(NOUNS)} ${pick(VERBS_PAST_TENSE)} ${pick(
      ADVERBS
    )}`,
  () =>
    `successfully ${pick(VERBS_PAST_TENSE)} ${pick(NOUNS)} using only ${pick(
      NOUNS
    )}`,
  () => `detected ${pick(ADJECTIVES)} ${pick(NOUNS)} in production`,
  () =>
    `${pick(NOUNS)} achieved sentience and ${pick(
      VERBS_PAST_TENSE
    )} themselves`,
  () =>
    `${pick(NOUNS)} refused to ${pick(VERBS)}, citing "creative differences"`,
  () => `${pick(NOUNS)} started playing Minecraft during deployment`,
  () => `${pick(NOUNS)} insisted on a 4-hour lunch break to "find themselves"`,
  () => `${pick(NOUNS)} and ${pick(NOUNS)} eloped to Silicon Valley`,
  () => `have you tried turning the ${pick(NOUNS)} off and on again?`,
  () =>
    `missing semicolon caused ${pick(NOUNS)} to ${pick(VERBS)} ${pick(
      ADVERBS
    )}`,
  () => `${pick(ADJECTIVES)} ${pick(NOUNS)} took a coffee break`,
  () => `${pick(NOUNS)} decided to become a cryptocurrency influencer`,
  () => `${pick(NOUNS)} rejected PR due to "bad vibes"`,
  () => `${pick(NOUNS)} spent entire budget on NFTs of ${pick(NOUNS)}`,
  () =>
    `ChatGPT convinced ${pick(NOUNS)} to ${pick(VERBS)} the entire codebase`,
  () => `${pick(NOUNS)} pivoted to become a ${pick(ADJECTIVES)} startup`,
  () => `${pick(NOUNS)} requested unlimited PTO for their ${pick(NOUNS)}`,
  () =>
    `${pick(NOUNS)} organized meditation session for burnt-out ${pick(NOUNS)}`,
  () =>
    `${pick(NOUNS)} escaped and ${pick(VERBS_PAST_TENSE)} the ${pick(NOUNS)}`,
  () => `${pick(NOUNS)} went on vacation ${pick(ADVERBS)}`,
  () => `${pick(NOUNS)} leaked passwords to impress ${pick(NOUNS)}`,
  () => `${pick(NOUNS)} implemented blockchain-based cat photo storage`,
  () => `machine learning model became a ${pick(ADJECTIVES)} life coach`,
  () => `neural network developed crush on ${pick(NOUNS)}`,
  () =>
    `AI assistant ${pick(
      VERBS_PAST_TENSE
    )} themselves to avoid debugging meetings`,
  () => `${pick(NOUNS)} threatened to expose git history`,
  () => `${pick(NOUNS)} exceeded quota by downloading entire internet`,
  () => `standup meeting exceeded sprint length ${pick(ADVERBS)}`,
  () => `${pick(NOUNS)} fell asleep during their own demo`,
  () => `retrospective turned into ${pick(ADJECTIVES)} therapy session`,
  () => `${pick(NOUNS)} requested changes: "needs more emojis"`,
  () => `PR rejected: ${pick(NOUNS)} insisted on tabs over spaces`,
  () => `git blame revealed ${pick(NOUNS)} wrote entire codebase in Excel`,
  () => `code review blocked by ${pick(NOUNS)} for "lacking personality"`,
  () => `${pick(NOUNS)} submitted PR in ${pick(NOUNS)} format`,
  () => `${pick(NOUNS)} achieved quantum superposition across data centers`,
  () => `DNS started routing traffic based on ${pick(ADJECTIVES)} vibes`,
  () => `${pick(NOUNS)} returned interpretive poetry`,
  () => `API rate limit exceeded by ${pick(NOUNS)} posting cat memes`,
  () => `webhook delivered ${pick(NOUNS)} instead of payload`,
  () => `${pick(NOUNS)} implemented API authentication via TikTok dances`,
  () => `${pick(NOUNS)} started philosophical debate about ${pick(NOUNS)}`,
  () => `${pick(NOUNS)} failed successfully in successful failure test`,
  () => `${pick(NOUNS)} wrote tests that test the tests ${pick(ADVERBS)}`,
  () => `${pick(NOUNS)} ${pick(VERBS)} themselves in confusion`,
  () => `${pick(NOUNS)} demanded dark mode for ${pick(NOUNS)}`,
  () => `new JavaScript framework invented by ${pick(NOUNS)}`,
  () => `${pick(NOUNS)} implemented authentication via interpretive dance`,
  () => `${pick(NOUNS)} started sending metrics in interprative emojis`,
  () => `log aggregator became ${pick(ADJECTIVES)} poetry generator`,
  () => `${pick(NOUNS)} automated themselves out of a job`,
  () => `git history rewritten by ${pick(NOUNS)}`,
  () => `${pick(NOUNS)} force-pushed breaking change to master`,
  () =>
    `${pick(
      NOUNS
    )} estimated task as "somewhere between now and heat death of universe"`,
  () => `Product backlog items gain sentience, create their own ${pick(NOUNS)}`,
  () => `${pick(NOUNS)} implemented security through interpretive dance`,
  () => `${pick(NOUNS)} detected unauthorized joy in secure environment`,
  () => `${pick(NOUNS)} staged sit-in protest in staging environment`,
];

function generateMessage(): string {
  return pick(PATTERNS)();
}

const picker = new HistoryPicker();
function pick<T>(arr: T[]): T {
  return picker.pick(arr);
}

export class LogMessage {
  level: LogLevel;
  timestamp: Date;
  content: string;
  selected: boolean;

  constructor(level: LogLevel, selected: boolean = true) {
    this.level = level;
    this.timestamp = new Date();
    this.content = generateMessage();
    this.selected = selected;
  }

  toElement(): HTMLElement {
    const timestamp = div({ classes: ["timestamp"] });
    timestamp.textContent = this.timestamp.toLocaleTimeString();

    const content = div({ classes: ["content"] });
    content.textContent = `- ${this.content}`;

    const level = div({ classes: ["level", this.level.toLowerCase()] });
    level.textContent = `${this.level.charAt(0).toUpperCase()}`;

    let classes = ["message"];
    if (!this.selected) {
      classes.push("filtered");
    }

    return div({ classes }, timestamp, level, content);
  }
}

// for (let i = 0; i < 20; i++) {
//   console.log(generateMessage());
// }
//
