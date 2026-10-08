import { chapterWindow } from '../../core/campaign';
import { CheckIcon } from './Icons';

interface Props {
  /** Oynanacak bölüm. */
  chapter: number;
}

/**
 * Bölüm yolu: biten bölümler (✓), oynanacak bölüm (vurgulu) ve sıradakiler
 * (kesik çizgili), bulmacadaki harf kareleri gibi yan yana. Her kare bir bölüm.
 */
export function ChapterPath({ chapter }: Props) {
  const nodes = chapterWindow(chapter);
  return (
    <div className="chapter-path layout-auto" role="img" aria-label={`Bölüm ${chapter}; önceki bölümler tamamlandı`}>
      <ol className="path-nodes">
        {nodes.map(({ n, state }) => (
          <li key={n} className={`path-node is-${state}`}>
            <span>{state === 'done' ? <CheckIcon width={20} height={20} /> : n}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
