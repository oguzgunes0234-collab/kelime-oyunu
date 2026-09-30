import { useEffect } from 'react';
import { CHAPTER_SIZE } from '../../core/campaign';
import { currentStreak } from '../../core/daily';
import { directionKey } from '../../core/pack';
import type { Profile } from '../../core/profile';
import { ChapterPath } from '../components/ChapterPath';
import { FlameIcon } from '../components/Icons';

interface Props {
  /** Biten bölümün numarası. */
  chapter: number;
  profile: Profile;
  onNext: () => void;
  onHome: () => void;
}

/** Sayıya gelen yönelme eki: 2'ye, 3'e, 6'ya, 10'a, 20'ye … (sayının okunuşuna göre). */
export function toCase(n: number): string {
  const ones = ['', "'e", "'ye", "'e", "'e", "'e", "'ya", "'ye", "'e", "'a"];
  const tens = ['', "'a", "'ye", "'a", "'a", "'ye", "'a", "'e", "'e", "'a"];
  if (n % 10 !== 0) return `${n}${ones[n % 10]}`;
  if (n % 100 !== 0) return `${n}${tens[(n / 10) % 10]}`;
  return `${n}'e`; // yüz, bin
}

/**
 * Bölüm sonu: yalnızca ilerleme. Yeni ödül ya da para birimi yok; oyuncu
 * nerede olduğunu ve ne öğrendiğini görür, sıradaki bölüme geçer.
 */
export function ChapterComplete({ chapter, profile, onNext, onHome }: Props) {
  // Süslü parantez şart: scrollTo yeni Chrome'da Promise döndürüyor; React onu temizlik işlevi sanıp çöküyordu.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const learned = profile.learned[directionKey(profile.settings.direction)]?.length ?? 0;
  const streak = currentStreak(profile.daily, new Date()).streak;

  return (
    <div className="page chapter-done">
      <div className="chapter-stamp paper">
        <p className="stamp-eyebrow">Bölüm</p>
        <p className="stamp-number ink-title">{chapter}</p>
        <p className="stamp-label">tamamlandı</p>
        <ChapterPath info={{ chapter, done: CHAPTER_SIZE, size: CHAPTER_SIZE }} layout="row" showNext={false} />
      </div>

      <div className="summary-stats">
        <div className="big-stat">
          <strong>
            {CHAPTER_SIZE}/{CHAPTER_SIZE}
          </strong>
          <span>bulmaca</span>
        </div>
        <div className="big-stat">
          <strong>{learned}</strong>
          <span>öğrendiğin kelime</span>
        </div>
        <div className="big-stat">
          <strong>
            <FlameIcon width={20} height={20} /> {streak}
          </strong>
          <span>günlük seri</span>
        </div>
      </div>

      <p className="muted center">
        Sırada Bölüm {chapter + 1}.{chapter === 1 ? ' Bulmacalar büyüyor: daha çok kelime, daha çok kesişme.' : ''} Kelime seviyesi performansına göre ayarlanmaya devam
        eder.
      </p>

      <div className="stack">
        <button type="button" className="btn btn-primary btn-block btn-big" onClick={onNext}>
          Bölüm {toCase(chapter + 1)} başla
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={onHome}>
          Ana sayfa
        </button>
      </div>
    </div>
  );
}
