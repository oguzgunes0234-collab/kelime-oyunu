import { languageInfo } from '../../core/languages';
import type { Question } from '../../core/types';

export type CoachStep = 'intro' | 'question' | 'tap' | 'tools' | 'finish' | 'result' | null;

interface Props {
  step: Exclude<CoachStep, null | 'result'>;
  question: Question;
  onNext: (step: CoachStep) => void;
  onSkip: () => void;
}

/**
 * İlk açılıştaki kısa örnek tur. Oyuncu gerçek bir kelimeyi gerçek
 * kontrollerle çözer; balon yalnızca sıradaki adımı söyler. Eğitimde hak
 * harcanmaz ve ilerleme kaydedilmez.
 */
export function Coach({ step, question, onNext, onSkip }: Props) {
  const tgt = languageInfo(question.target).name;
  const blocking = step === 'intro' || step === 'question';

  const content: Record<typeof step, { title: string; body: string; action?: { label: string; next: CoachStep } }> = {
    intro: {
      title: 'Hoş geldin!',
      body: 'Sana bir kelime göstereceğiz; karşılığını karışık harf taşlarından kuracaksın. Önce bir örnek: bu turda hak harcanmaz.',
      action: { label: 'Başlayalım', next: 'question' },
    },
    question: {
      title: 'Soru kartı',
      body: `“${question.prompt}” kelimesinin ${tgt} karşılığını bul. Kartta kelime türü ve yaklaşık seviye de yazar.`,
      action: { label: 'Tamam', next: 'tap' },
    },
    tap: {
      title: 'Harflere dokun',
      body: 'Parlayan taşa dokun. Taşlar sırayla cevap alanına dizilir. Bilgisayardaysan harfleri klavyeden de yazabilirsin.',
    },
    tools: {
      title: 'Yardım araçları',
      body: 'Alttaki dört araç: Karıştır, Harf aç, Anlam, Geri al. Rozetteki sayı kalan hakkı gösterir. Şimdi Harf aç’a dokun: sıradaki doğru harfi senin yerine koyar.',
    },
    finish: {
      title: 'Kelimeyi tamamla',
      body: 'Kalan harfleri yerleştir. Yanlış bir harfe dokunursan geri alırsın; 3 deneme hakkın var.',
    },
  };
  const c = content[step];

  return (
    <div className={blocking ? 'coach coach-blocking' : 'coach-inline-wrap'}>
      <div
        className="coach-bubble"
        role={blocking ? 'dialog' : 'status'}
        aria-modal={blocking || undefined}
        aria-labelledby="coach-title"
        aria-describedby="coach-body"
        aria-live={blocking ? undefined : 'polite'}
      >
        <p className="coach-step">Örnek tur</p>
        <h2 id="coach-title">{c.title}</h2>
        <p id="coach-body">{c.body}</p>
        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={onSkip}>
            Eğitimi atla
          </button>
          {c.action && (
            <button type="button" className="btn btn-primary" onClick={() => onNext(c.action!.next)} autoFocus>
              {c.action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
