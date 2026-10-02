// Adapted from klebertanide/instagram-agent-skill web/ @6c91976 (MIT, Jake Schincariol).
// Bundled from skills/ig-human/slop.json; no filesystem access in the cloud runtime.
export const LEXICAL_REPLACEMENTS = [
  {
    find: 'share this with someone who needs it',
    replace: '',
  },
  {
    find: "in this video i'm going to show you",
    replace: '',
  },
  {
    find: 'in the ever-evolving landscape of',
    replace: 'in',
  },
  {
    find: 'in the ever-changing world of',
    replace: 'in',
  },
  {
    find: 'nobody is talking about this',
    replace: 'few people do this',
  },
  {
    find: 'no one is talking about this',
    replace: 'few people do this',
  },
  {
    find: "in today's fast-paced world",
    replace: 'right now',
  },
  {
    find: 'let me know in the comments',
    replace: '',
  },
  {
    find: 'tag someone who needs this',
    replace: '',
  },
  {
    find: 'i am excited to announce',
    replace: '',
  },
  {
    find: 'what are your thoughts?',
    replace: '',
  },
  {
    find: 'this changed everything',
    replace: 'this worked',
  },
  {
    find: 'it is worth noting that',
    replace: 'note that',
  },
  {
    find: "in today's digital age",
    replace: 'right now',
  },
  {
    find: 'had the opportunity to',
    replace: 'got to',
  },
  {
    find: "don't scroll past this",
    replace: '',
  },
  {
    find: 'imagine a world where',
    replace: 'imagine if',
  },
  {
    find: 'at the end of the day',
    replace: '',
  },
  {
    find: "i'm thrilled to share",
    replace: '',
  },
  {
    find: 'fast forward to today',
    replace: 'now',
  },
  {
    find: "we've all been there",
    replace: '',
  },
  {
    find: 'drop a comment below',
    replace: '',
  },
  {
    find: 'this is your sign to',
    replace: '',
  },
  {
    find: 'trust me on this one',
    replace: '',
  },
  {
    find: "it's no secret that",
    replace: '',
  },
  {
    find: 'the choice is yours',
    replace: '',
  },
  {
    find: 'without further ado',
    replace: '',
  },
  {
    find: 'save this for later',
    replace: '',
  },
  {
    find: 'the rest is history',
    replace: '',
  },
  {
    find: "don't sleep on this",
    replace: '',
  },
  {
    find: 'hit follow for more',
    replace: '',
  },
  {
    find: 'the algorithm loves',
    replace: 'Instagram pushes',
  },
  {
    find: 'the future is here',
    replace: '',
  },
  {
    find: 'the harsh truth is',
    replace: '',
  },
  {
    find: 'watch till the end',
    replace: '',
  },
  {
    find: 'and just like that',
    replace: '',
  },
  {
    find: 'beat the algorithm',
    replace: 'get reach',
  },
  {
    find: 'go viral overnight',
    replace: 'get reach',
  },
  {
    find: "you won't believe",
    replace: '',
  },
  {
    find: 'little did i know',
    replace: '',
  },
  {
    find: "here's the thing",
    replace: '',
  },
  {
    find: 'let that sink in',
    replace: '',
  },
  {
    find: 'food for thought',
    replace: '',
  },
  {
    find: "in today's video",
    replace: '',
  },
  {
    find: 'when it comes to',
    replace: 'with',
  },
  {
    find: 'move the needle',
    replace: 'make a difference',
  },
  {
    find: 'i am humbled to',
    replace: '',
  },
  {
    find: 'read that again',
    replace: '',
  },
  {
    find: 'follow for more',
    replace: '',
  },
  {
    find: 'a wide range of',
    replace: 'many',
  },
  {
    find: 'a testament to',
    replace: 'proof of',
  },
  {
    find: "you're welcome",
    replace: '',
  },
  {
    find: 'stop scrolling',
    replace: '',
  },
  {
    find: "run don't walk",
    replace: '',
  },
  {
    find: 'dive deep into',
    replace: 'get into',
  },
  {
    find: 'transformative',
    replace: 'big',
  },
  {
    find: 'groundbreaking',
    replace: 'new',
  },
  {
    find: 'treasure trove',
    replace: 'pile',
  },
  {
    find: 'ultimate guide',
    replace: 'guide',
  },
  {
    find: "let's face it",
    replace: '',
  },
  {
    find: 'needle-moving',
    replace: 'useful',
  },
  {
    find: 'spoiler alert',
    replace: '',
  },
  {
    find: "who's with me",
    replace: '',
  },
  {
    find: 'double tap if',
    replace: '',
  },
  {
    find: 'revolutionize',
    replace: 'change',
  },
  {
    find: 'comprehensive',
    replace: 'complete',
  },
  {
    find: 'game-changing',
    replace: 'big',
  },
  {
    find: 'in conclusion',
    replace: 'so',
  },
  {
    find: 'picture this',
    replace: '',
  },
  {
    find: 'cutting-edge',
    replace: 'new',
  },
  {
    find: 'game-changer',
    replace: 'big deal',
  },
  {
    find: 'unparalleled',
    replace: 'unmatched',
  },
  {
    find: 'meticulously',
    replace: 'carefully',
  },
  {
    find: 'multifaceted',
    replace: 'complicated',
  },
  {
    find: 'testament to',
    replace: 'proof of',
  },
  {
    find: 'additionally',
    replace: 'also',
  },
  {
    find: 'nevertheless',
    replace: 'still',
  },
  {
    find: 'consequently',
    replace: 'so',
  },
  {
    find: 'effortlessly',
    replace: 'easily',
  },
  {
    find: 'breathtaking',
    replace: 'striking',
  },
  {
    find: 'secret sauce',
    replace: 'the actual method',
  },
  {
    find: 'underscores',
    replace: 'shows',
  },
  {
    find: 'cornerstone',
    replace: 'base',
  },
  {
    find: 'plethora of',
    replace: 'lots of',
  },
  {
    find: 'furthermore',
    replace: 'also',
  },
  {
    find: 'importantly',
    replace: '',
  },
  {
    find: 'in order to',
    replace: 'to',
  },
  {
    find: 'supercharge',
    replace: 'speed up',
  },
  {
    find: 'captivating',
    replace: 'interesting',
  },
  {
    find: 'delve into',
    replace: 'look at',
  },
  {
    find: 'leveraging',
    replace: 'using',
  },
  {
    find: 'facilitate',
    replace: 'help',
  },
  {
    find: 'streamline',
    replace: 'simplify',
  },
  {
    find: 'underscore',
    replace: 'show',
  },
  {
    find: 'seamlessly',
    replace: 'cleanly',
  },
  {
    find: 'invaluable',
    replace: 'useful',
  },
  {
    find: 'meticulous',
    replace: 'careful',
  },
  {
    find: 'innovative',
    replace: 'new',
  },
  {
    find: 'remarkable',
    replace: 'notable',
  },
  {
    find: 'compelling',
    replace: 'convincing',
  },
  {
    find: 'north star',
    replace: 'goal',
  },
  {
    find: 'ultimately',
    replace: 'in the end',
  },
  {
    find: 'in essence',
    replace: 'basically',
  },
  {
    find: 'no-brainer',
    replace: 'obvious',
  },
  {
    find: 'hidden gem',
    replace: 'good one',
  },
  {
    find: 'buckle up',
    replace: '',
  },
  {
    find: 'deep dive',
    replace: 'breakdown',
  },
  {
    find: 'utilizing',
    replace: 'using',
  },
  {
    find: 'embark on',
    replace: 'start',
  },
  {
    find: 'spearhead',
    replace: 'lead',
  },
  {
    find: 'cultivate',
    replace: 'build',
  },
  {
    find: 'myriad of',
    replace: 'many',
  },
  {
    find: 'landscape',
    replace: 'market',
  },
  {
    find: 'ecosystem',
    replace: 'system',
  },
  {
    find: 'skyrocket',
    replace: 'raise',
  },
  {
    find: 'must-have',
    replace: 'worth having',
  },
  {
    find: 'leverage',
    replace: 'use',
  },
  {
    find: 'showcase',
    replace: 'show',
  },
  {
    find: 'seamless',
    replace: 'clean',
  },
  {
    find: 'holistic',
    replace: 'whole',
  },
  {
    find: 'profound',
    replace: 'big',
  },
  {
    find: 'tapestry',
    replace: 'mix',
  },
  {
    find: 'paradigm',
    replace: 'model',
  },
  {
    find: 'plethora',
    replace: 'lots',
  },
  {
    find: 'moreover',
    replace: 'also',
  },
  {
    find: 'stunning',
    replace: 'good',
  },
  {
    find: 'level up',
    replace: 'improve',
  },
  {
    find: 'utilize',
    replace: 'use',
  },
  {
    find: 'harness',
    replace: 'use',
  },
  {
    find: 'elevate',
    replace: 'improve',
  },
  {
    find: 'amplify',
    replace: 'boost',
  },
  {
    find: 'curated',
    replace: 'picked',
  },
  {
    find: 'empower',
    replace: 'let',
  },
  {
    find: 'pivotal',
    replace: 'key',
  },
  {
    find: 'crucial',
    replace: 'important',
  },
  {
    find: 'bespoke',
    replace: 'custom',
  },
  {
    find: 'journey',
    replace: 'process',
  },
  {
    find: 'synergy',
    replace: 'overlap',
  },
  {
    find: 'arsenal',
    replace: 'set',
  },
  {
    find: 'notably',
    replace: '',
  },
  {
    find: 'unleash',
    replace: 'release',
  },
  {
    find: 'foster',
    replace: 'build',
  },
  {
    find: 'unlock',
    replace: 'get',
  },
  {
    find: 'curate',
    replace: 'pick',
  },
  {
    find: 'robust',
    replace: 'solid',
  },
  {
    find: 'myriad',
    replace: 'many',
  },
  {
    find: 'beacon',
    replace: 'signal',
  },
  {
    find: 'iconic',
    replace: 'known',
  },
  {
    find: 'delve',
    replace: 'look',
  },
  {
    find: 'vital',
    replace: 'important',
  },
  {
    find: 'realm',
    replace: 'world',
  },
  {
    find: 'hence',
    replace: 'so',
  },
  {
    find: 'thus',
    replace: 'so',
  },
  {
    find: 'hack',
    replace: 'trick',
  },
] as const;

export const TYPOGRAPHIC_REPLACEMENTS = [
  {
    from: '—',
    to: ', ',
  },
  {
    from: '–',
    to: '-',
  },
  {
    from: '‘',
    to: "'",
  },
  {
    from: '’',
    to: "'",
  },
  {
    from: '“',
    to: '"',
  },
  {
    from: '”',
    to: '"',
  },
  {
    from: '…',
    to: '...',
  },
  {
    from: '′',
    to: "'",
  },
  {
    from: '·',
    to: '-',
  },
  {
    from: '•',
    to: '-',
  },
  {
    from: '→',
    to: '->',
  },
] as const;
