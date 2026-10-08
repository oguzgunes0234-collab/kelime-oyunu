import { useEffect, useState } from 'react';
import { onMockRequest, type MockRequest } from '../../platform/mockBus';

/**
 * Deneme reklamı ve deneme satın alması (yalnızca mock derlemelerde). Gerçek
 * reklam ya da ödeme değildir; ekranda bunu açıkça yazar.
 */
export function MockHost() {
  const [req, setReq] = useState<MockRequest | null>(null);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    onMockRequest(setReq);
    return () => onMockRequest(null);
  }, []);

  useEffect(() => {
    if (req?.kind !== 'ad') return;
    setLeft(req.seconds);
    const t = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [req]);

  if (!req) return null;

  if (req.kind === 'ad') {
    return (
      <div className="mock-layer" role="dialog" aria-modal="true" aria-labelledby="mock-ad-title">
        <div className="mock-box">
          <p className="mock-tag">DENEME · gerçek reklam değil</p>
          <h2 id="mock-ad-title">{req.label}</h2>
          <p className="mock-count" aria-live="polite">
            {left > 0 ? `${left} sn` : 'Bitti'}
          </p>
          {!req.rewarded ? (
            // Geçiş reklamı: ödül yok; süre dolunca kapatılır.
            <button type="button" className="btn btn-secondary btn-block" disabled={left > 0} onClick={() => req.resolve(true)}>
              {left > 0 ? 'Bekle…' : 'Kapat'}
            </button>
          ) : left > 0 ? (
            <button type="button" className="btn btn-ghost btn-block" onClick={() => req.resolve(false)}>
              Kapat (ödül verilmez)
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-block" onClick={() => req.resolve(true)}>
              Ödülü al ve dön
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mock-layer" role="dialog" aria-modal="true" aria-labelledby="mock-buy-title">
      <div className="mock-box">
        <p className="mock-tag">DENEME · gerçek ödeme yok</p>
        <h2 id="mock-buy-title">{req.title}</h2>
        <p className="small">{req.detail}</p>
        <div className="btn-row">
          <button type="button" className="btn btn-secondary" onClick={() => req.resolve(false)}>
            Vazgeç
          </button>
          <button type="button" className="btn btn-primary" onClick={() => req.resolve(true)}>
            Deneme onayı
          </button>
        </div>
      </div>
    </div>
  );
}
