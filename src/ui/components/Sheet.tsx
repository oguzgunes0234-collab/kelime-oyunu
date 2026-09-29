import { useEffect, useId, useRef, type ReactNode } from 'react';

interface Props {
  title: string;
  onClose?: () => void;
  children: ReactNode;
  /** 'sheet' alttan açılır (mobil), 'page' tam ekran kaplar. */
  variant?: 'sheet' | 'page';
  /** Açılınca odaklanacak öğe için seçici; yoksa ilk düğme. */
  initialFocus?: string;
  className?: string;
}

/**
 * Erişilebilir iletişim kutusu: rol/aria-modal, açılışta odak, Esc ile kapanma,
 * Tab ile odağın dışarı kaçmaması ve kapanınca odağın geri dönmesi.
 */
export function Sheet({ title, onClose, children, variant = 'sheet', initialFocus, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const root = ref.current;
    const target =
      (initialFocus && root?.querySelector<HTMLElement>(initialFocus)) ||
      root?.querySelector<HTMLElement>('button, [href], input, select, [tabindex]:not([tabindex="-1"])');
    target?.focus();
    return () => previous?.focus?.();
    // Yalnızca açılışta çalışır.
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape' && onClose) {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !ref.current) return;
    const items = Array.from(
      ref.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, select, [tabindex]:not([tabindex="-1"])'),
    );
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div className={`overlay overlay-${variant}`} onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        ref={ref}
        className={`sheet sheet-${variant} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
      >
        <h2 id={titleId} className="sheet-title">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
