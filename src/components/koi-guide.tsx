import { useAwake } from '../hooks/use-awake';
import type { KoiGenome } from '../lib/koi-genome';
import {
  KOI_GROUPS,
  MODIFIERS,
  MODIFIER_INFO,
  RARITY_LABELS,
  VARIETIES,
  findVariety,
  type KoiModifier,
  type KoiVariety,
  type KoiVarietyId
} from '../lib/koi-varieties';
import { hashString } from '../lib/seeded-random';
import { KoiPortraitImage } from './koi-portrait-image';

/** The handful of words most koi names are built from. */
const GLOSSARY: readonly { term: string; kanji: string; meaning: string }[] = [
  { term: 'Hi', kanji: '緋', meaning: 'the red markings' },
  { term: 'Beni', kanji: '紅', meaning: 'deep crimson' },
  { term: 'Aka', kanji: '赤', meaning: 'red' },
  { term: 'Sumi', kanji: '墨', meaning: 'the black markings; literally “ink”' },
  { term: 'Shiro', kanji: '白', meaning: 'white' },
  { term: 'Ki', kanji: '黄', meaning: 'yellow' },
  { term: 'Cha', kanji: '茶', meaning: 'brown, the colour of tea' },
  { term: 'Sora', kanji: '空', meaning: 'sky: a soft grey-blue' },
  { term: 'Midori', kanji: '緑', meaning: 'green' },
  { term: 'Kin · Gin', kanji: '金 · 銀', meaning: 'gold · silver' },
  { term: 'Ogon', kanji: '黄金', meaning: '“golden”: the metallic line' },
  { term: 'Muji', kanji: '無地', meaning: 'one colour, no pattern' },
  { term: 'Goi', kanji: '鯉', meaning: 'carp: koi becomes -goi after another word' },
  {
    term: 'Utsuri',
    kanji: '写り',
    meaning: '“reflection”: a black koi with one colour through it'
  },
  { term: 'Bekko', kanji: '別甲', meaning: '“tortoiseshell”: small sumi spots on one colour' },
  { term: 'Tancho', kanji: '丹頂', meaning: 'a single red crown on the head' },
  { term: 'Matsuba', kanji: '松葉', meaning: '“pine needles”: a dark net over every scale' },
  { term: 'Doitsu', kanji: 'ドイツ', meaning: '“German”: scaleless skin, from German carp' },
  { term: 'Gin Rin', kanji: '銀鱗', meaning: '“silver scales”: scales that sparkle' },
  { term: 'Hirenaga', kanji: '鰭長', meaning: '“long fins”: what the West calls butterfly koi' }
];

/** Where each trait comes from, beyond what the market's chips say. */
const TRAIT_HISTORY: Readonly<Record<KoiModifier, string>> = {
  ginrin:
    'Reflective scales that flash like sequins as the fish turns. Almost any scaled variety can carry them: a Gin Rin Kohaku is simply a kohaku that sparkles.',
  doitsu:
    'German mirror and leather carp reached Japan in 1904. Crossed with koi, they gave smooth, scaleless skin, often with one row of large scales down the back. The Shusui was among the first doitsu varieties.',
  butterfly:
    'Bred in the 1980s by crossing koi with long-finned Indonesian river carp. Beautiful in the water, but most traditional Japanese shows won’t judge them.'
};

/** The fish each trait is pictured on. */
const TRAIT_SPECIMEN: Readonly<Record<KoiModifier, KoiVarietyId>> = {
  ginrin: 'kohaku',
  doitsu: 'showa',
  butterfly: 'yamabuki-ogon'
};

/** The guide's own fish: one of each, the same for everyone. */
const specimen = (variety: KoiVarietyId, modifiers: readonly KoiModifier[] = []): KoiGenome => ({
  variety,
  modifiers,
  seed: hashString(`koi-guide:${variety}:${modifiers.join('+')}`)
});

const SECTIONS = [
  { id: 'guide-origins', label: 'Where koi come from' },
  { id: 'guide-names', label: 'Reading a name' },
  { id: 'guide-varieties', label: 'The varieties' },
  { id: 'guide-traits', label: 'Traits' },
  { id: 'guide-flair', label: 'Real, and our flair' }
] as const;

const VarietyEntry = ({ variety }: { variety: KoiVariety }): JSX.Element => {
  const { awake, wakers } = useAwake();

  return (
    <li className="guide-variety" data-rarity={variety.rarity} {...wakers}>
      <KoiPortraitImage
        genome={specimen(variety.id)}
        alt={`${variety.name} koi`}
        active={awake}
        lazy
      />
      <div className="guide-variety-text">
        <h5>
          {variety.name}{' '}
          <span lang="ja" className="koi-kanji">
            {variety.kanji}
          </span>
        </h5>
        <p className="guide-meaning">“{variety.meaning}”</p>
        <p>{variety.blurb}</p>
        <span className="rarity-badge" data-rarity={variety.rarity}>
          {RARITY_LABELS[variety.rarity]}
        </span>
      </div>
    </li>
  );
};

const TraitEntry = ({ modifier }: { modifier: KoiModifier }): JSX.Element => {
  const { awake, wakers } = useAwake();
  const info = MODIFIER_INFO[modifier];

  return (
    <li className="guide-trait" {...wakers}>
      <KoiPortraitImage
        genome={specimen(TRAIT_SPECIMEN[modifier], [modifier])}
        alt={`${info.label} ${findVariety(TRAIT_SPECIMEN[modifier])!.name} koi`}
        active={awake}
        lazy
      />
      <h5>
        {info.label}{' '}
        <span lang="ja" className="koi-kanji">
          {info.kanji}
        </span>
      </h5>
      <p>{TRAIT_HISTORY[modifier]}</p>
    </li>
  );
};

type KoiGuideProps = {
  onBack: () => void;
};

/**
 * A short, friendly guide to koi: where they come from, how their names work,
 * the varieties the market stocks, and where the market takes liberties.
 */
export const KoiGuide = ({ onBack }: KoiGuideProps): JSX.Element => (
  <article className="koi-guide" aria-labelledby="koi-guide-title">
    <button type="button" className="link-button guide-back" onClick={onBack}>
      ← Back to the market
    </button>

    <header className="guide-hero">
      <p className="guide-kicker">Koi guide</p>
      <h3 id="koi-guide-title">Nishikigoi, the brocaded carp</h3>
      <p className="guide-lede">
        Koi aren’t a species of their own. They are carp that people have bred for colour for two
        hundred years, and almost everything about them, down to their names, comes from that
        history.
      </p>
      <nav className="guide-contents" aria-label="In this guide">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() =>
              document.getElementById(section.id)?.scrollIntoView?.({ behavior: 'smooth' })
            }
          >
            {section.label}
          </button>
        ))}
      </nav>
    </header>

    <section id="guide-origins" className="guide-section">
      <h4>Where koi come from</h4>
      <p>
        Koi, properly <em>nishikigoi</em> (錦鯉, “brocaded carp”), are domesticated carp. In the
        early 1800s, rice farmers around Niigata, in the snowy north of Japan, kept carp in their
        paddy ponds as winter food. Every so often a fish hatched with a flash of red or white, and
        the farmers began breeding the colourful ones for their own sake.
      </p>
      <p>
        Koi reached the whole country after they were shown at the Tokyo Taisho Exhibition in 1914,
        and the rest of the world after the Second World War. Two of the classic varieties are named
        for the eras they first appeared in: the Taisho Sanke and the Showa Sanshoku.
      </p>
      <aside className="guide-fact">
        <strong>A fortune in a fish.</strong> A well-kept koi can live for decades, and the finest
        change hands for fortunes: in 2018 a kohaku called S Legend sold for about ¥200 million,
        roughly $1.8 million.
      </aside>
    </section>

    <section id="guide-names" className="guide-section">
      <h4>Reading a koi’s name</h4>
      <p>
        A koi’s name is a description, written the way breeders write it: the fin and scale types
        come first, then the variety. A <strong>Gin Rin Kohaku</strong> is a red-and-white koi with
        sparkling scales. A <strong>Doitsu Showa</strong> is a Showa without its scales.
      </p>
      <p className="guide-example" aria-label="Butterfly Gin Rin Kohaku, read word by word">
        <span>
          Butterfly <small>long fins</small>
        </span>
        <span>
          Gin Rin <small>sparkling scales</small>
        </span>
        <span>
          Kohaku <small>red and white</small>
        </span>
      </p>
      <p>
        Most variety names are plain Japanese for colours and patterns, so a few words go a long
        way:
      </p>
      <dl className="guide-glossary">
        {GLOSSARY.map((entry) => (
          <div key={entry.term}>
            <dt>
              {entry.term}{' '}
              <span lang="ja" className="koi-kanji">
                {entry.kanji}
              </span>
            </dt>
            <dd>{entry.meaning}</dd>
          </div>
        ))}
      </dl>
    </section>

    <section id="guide-varieties" className="guide-section">
      <h4>The varieties</h4>
      <p>
        Shows sort koi into families. These are the {VARIETIES.length} varieties the market stocks,
        family by family. Point at one to see it swim.
      </p>
      {KOI_GROUPS.map((group) => (
        <div key={group.id} className="guide-group">
          <h5 className="guide-group-title">
            {group.name}{' '}
            <span lang="ja" className="koi-kanji">
              {group.kanji}
            </span>
          </h5>
          <p className="guide-group-blurb">{group.blurb}</p>
          <ul className="guide-varieties">
            {VARIETIES.filter((variety) => variety.group === group.id).map((variety) => (
              <VarietyEntry key={variety.id} variety={variety} />
            ))}
          </ul>
        </div>
      ))}
    </section>

    <section id="guide-traits" className="guide-section">
      <h4>Traits</h4>
      <p>
        On top of its variety, a koi can be born with a different kind of scale or fin. In the
        market they are rarer than plain fish, and they raise a koi’s rarity and price.
      </p>
      <ul className="guide-traits">
        {MODIFIERS.map((modifier) => (
          <TraitEntry key={modifier} modifier={modifier} />
        ))}
      </ul>
    </section>

    <section id="guide-flair" className="guide-section">
      <h4>What’s real, and where we took liberties</h4>
      <ul className="guide-liberties">
        <li data-kind="real">
          <strong>Real varieties, real names.</strong> Every variety in the market is an established
          nishikigoi, and every name follows the conventions breeders use.
        </li>
        <li data-kind="real">
          <strong>Real, but never wild.</strong> None of these colours occurs in nature. Wild carp
          are olive-bronze, and every koi, from the first red-and-white fish of the 1800s to the
          metallic Ogon of the 1940s and the platinum after it, was bred by people. Gold and
          platinum koi are real, but only because breeders made them.
        </li>
        <li data-kind="flair">
          <strong>Rarities and prices are ours.</strong> In real life the most expensive koi are
          usually the classic gosanke, kohaku above all, not the exotic varieties.
        </li>
        <li data-kind="flair">
          <strong>Butterfly fins on anything.</strong> Here, long fins can turn up on any variety.
          Real butterfly koi are a line of their own.
        </li>
        <li data-kind="flair">
          <strong>Generated patterns.</strong> Every fish’s markings are generated from its
          variety’s rules, so no two are alike, but real patterns are wilder still, and a real
          Midorigoi’s green tends to fade as it grows.
        </li>
        <li data-kind="flair">
          <strong>Pet names.</strong> Names like Hana and Sora are just lovely Japanese words. Real
          koi are usually known by their breeder and variety.
        </li>
      </ul>
    </section>

    <button type="button" className="link-button guide-back" onClick={onBack}>
      ← Back to the market
    </button>
  </article>
);
