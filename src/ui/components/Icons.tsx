import type { SVGProps } from 'react';
import type { ToolId } from '../../core/types';

/** Özgün, sade çizgi ikonlar. `currentColor` kullanır; renk CSS'ten gelir. */
type P = SVGProps<SVGSVGElement>;
const base = (p: P): P => ({
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
  ...p,
});

export const ShuffleIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 7h3.5c2 0 3.2 1 4.3 2.7l2.4 4.6c1.1 1.7 2.3 2.7 4.3 2.7H21" />
    <path d="M3 17h3.5c1.3 0 2.2-.4 3-1.1M14.2 8.1c.8-.7 1.7-1.1 3-1.1H21" />
    <path d="M18.5 4.5 21 7l-2.5 2.5M18.5 14.5 21 17l-2.5 2.5" />
  </svg>
);

export const MagnetIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 3v8a6 6 0 0 0 12 0V3" />
    <path d="M6 3h3.5v8a2.5 2.5 0 0 0 5 0V3H18" />
    <path d="M6 7h3.5M14.5 7H18" />
  </svg>
);

export const HintIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3Z" />
  </svg>
);

export const UndoIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </svg>
);

/** Eş anlamlı: iki eşit çizgi arasında çift yönlü ok (aynı anlam). */
export const SynonymIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 9h16M4 15h16" />
    <path d="M7 6 4 9l3 3M17 12l3 3-3 3" />
  </svg>
);

/** Cümle: satırlar ve boşluk çizgisi. */
export const SentenceIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 6h16M4 11h6M15 11h5M4 16h11" />
    <path d="M11 13h3" strokeDasharray="1.5 1.5" />
  </svg>
);

export const TOOL_ICONS: Record<ToolId, (p: P) => JSX.Element> = {
  shuffle: ShuffleIcon,
  magnet: MagnetIcon,
  hint: HintIcon,
  undo: UndoIcon,
  synonym: SynonymIcon,
  sentence: SentenceIcon,
};

export const CloseIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const BackIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const FlameIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.1 2.2-5.1 3.6-7 .4 1.6 1.3 2.6 2.4 3.1C11.2 7.6 12.6 5 15 3c-.2 2.9 1 4.6 2.2 6.3 1 1.4 1.8 3 1.8 5.1 0 4-2.9 6.6-7 6.6Z" />
  </svg>
);

export const CoinIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5v9M9.5 10a2.5 2 0 0 1 5 0M9.5 14a2.5 2 0 0 0 5 0" />
  </svg>
);

export const StarIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="m12 3.5 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8Z" />
  </svg>
);

export const BookIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" />
    <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5" />
  </svg>
);

export const GearIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </svg>
);

export const BagIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 8h14l-1 12H6L5 8Z" />
    <path d="M9 10V6a3 3 0 0 1 6 0v4" />
  </svg>
);

export const QuestionIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17h.01" />
  </svg>
);

export const SwapIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 4 3 8l4 4M3 8h14M17 12l4 4-4 4M21 16H7" />
  </svg>
);

export const CheckIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const CrossIcon = CloseIcon;

export const BackspaceIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 5h11v14H9l-6-7 6-7Z" />
    <path d="m12.5 9.5 5 5M17.5 9.5l-5 5" />
  </svg>
);

export const GridIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
    <path d="M3.5 9.5h17M3.5 15h17M9.5 3.5v17M15 3.5v17" />
  </svg>
);

export const LettersIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="7" width="8" height="10" rx="2" />
    <rect x="13" y="7" width="8" height="10" rx="2" />
    <path d="M5.5 14.5 7 9.5l1.5 5M6 13h2M15.5 9.5h1.8a1.3 1.3 0 0 1 0 2.5h-1.8Zm0 2.5h2a1.3 1.3 0 0 1 0 2.5h-2Z" />
  </svg>
);

export const ChevronLeftIcon = BackIcon;

export const ChevronRightIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);

/**
 * Çengel bulmaca okları: cevabın ipucu karesine göre nereden başlayıp hangi
 * yöne gittiğini gösterir. Dolgulu, küçük ve kalın; minik karede okunur.
 */
export function ClueArrow({ arrow, ...p }: P & { arrow: 'right' | 'down' | 'down-right' | 'right-down' }) {
  const d = {
    right: 'M2 8h9M8 4.5 11.5 8 8 11.5',
    down: 'M8 2v9M4.5 8 8 11.5 11.5 8',
    'down-right': 'M4 2v6.5h7.5M8.5 5 12 8.5 8.5 12',
    'right-down': 'M2 4h6.5v7.5M5 8.5 8.5 12 12 8.5',
  }[arrow];
  return (
    <svg width={12} height={12} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable={false} {...p}>
      <path d={d} />
    </svg>
  );
}
