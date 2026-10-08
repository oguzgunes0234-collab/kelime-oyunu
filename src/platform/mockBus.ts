/**
 * Deneme (mock) reklam ve satın alma pencereleri için küçük bir kanal: sağlayıcı
 * bir istek açar, ekrandaki MockHost onu gösterir ve sonucu döner. Yalnızca
 * VITE_ADS=mock / VITE_IAP=mock derlemelerinde kullanılır.
 */

export type MockRequest =
  | { kind: 'ad'; label: string; seconds: number; resolve: (completed: boolean) => void }
  | { kind: 'purchase'; title: string; detail: string; resolve: (approved: boolean) => void };

type Listener = (req: MockRequest | null) => void;
let listener: Listener | null = null;
let pending: MockRequest | null = null;

export function onMockRequest(l: Listener | null): void {
  listener = l;
  if (l && pending) l(pending);
}

export function openMock<T extends MockRequest>(req: T): void {
  pending = req;
  listener?.(req);
}

export function closeMock(): void {
  pending = null;
  listener?.(null);
}
