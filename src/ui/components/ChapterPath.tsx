import { pathNodes, type ChapterInfo } from '../../core/campaign';
import { CheckIcon } from './Icons';

interface Props {
  info: ChapterInfo;
  /**
   * auto: uzun ekranda dikey yol (1 altta, sıradaki bölüm üstte), kısa ekranda
   * yatay sıra. row: her zaman yatay (sonuç ve bölüm sonu ekranları).
   */
  layout?: 'auto' | 'row';
  /** Yolun sonunda bir sonraki bölümün işareti gösterilsin mi. */
  showNext?: boolean;
}

/**
 * Bölümün bulmacalarını bir yol olarak gösterir: biten (✓), sıradaki
 * (vurgulu) ve kilitli (kesik çizgili). Çizim yok; kâğıt üstünde mürekkep hissi.
 */
export function ChapterPath({ info, layout = 'auto', showNext = true }: Props) {
  const states = pathNodes(info);
  return (
    <div
      className={`chapter-path layout-${layout}`}
      role="img"
      aria-label={`Bölüm ${info.chapter}: ${info.size} bulmacadan ${info.done} tanesi tamamlandı`}
    >
      <ol className="path-nodes">
        {states.map((s, i) => (
          <li key={i} className={`path-node is-${s}`}>
            <span>{s === 'done' ? <CheckIcon width={20} height={20} /> : i + 1}</span>
          </li>
        ))}
        {showNext && (
          <li className="path-next">
            <span>Bölüm {info.chapter + 1}</span>
          </li>
        )}
      </ol>
    </div>
  );
}
