import type { CoinPackSize } from '../../monetization/config';

/**
 * Jeton kesesi çizimleri (özgün, bu oyun için). Oyunun sıcak renkleri: turuncu
 * kumaş, turkuaz bağcık, altın jeton; büyük kesenin önünde oyunun harf taşı.
 * Boyut büyüdükçe kese şişer ve jetonlar taşar. Süs amaçlıdır (aria-hidden).
 */

const INK = '#7a2e0e';
const COIN = '#f5c451';
const COIN_RIM = '#b8773a';

function Coin({ x, y, r = 8, squash = 1 }: { x: number; y: number; r?: number; squash?: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={r} ry={r * squash} fill={COIN} stroke={COIN_RIM} strokeWidth={2} />
      <ellipse cx={x} cy={y} rx={r * 0.55} ry={r * 0.55 * squash} fill="none" stroke="#e0a83a" strokeWidth={1.5} />
    </g>
  );
}

function Sack({ d, shade, neck, cordY, cordX1, cordX2 }: { d: string; shade: string; neck: string; cordY: number; cordX1: number; cordX2: number }) {
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <path d={d} fill="#ff9a52" stroke={INK} strokeWidth={2.5} />
      <path d={shade} fill="#c2410c" opacity={0.5} />
      <path d={neck} fill="#ffb07a" stroke={INK} strokeWidth={2.5} />
      <rect x={cordX1} y={cordY} width={cordX2 - cordX1} height={6} rx={3} fill="#6fd3c9" stroke="#1f6f6b" strokeWidth={2} />
      <circle cx={cordX2} cy={cordY + 3} r={3.2} fill="#6fd3c9" stroke="#1f6f6b" strokeWidth={2} />
      <path d={`M${cordX2} ${cordY + 6} l5 9 M${cordX2 + 2} ${cordY + 5} l9 5`} stroke="#1f6f6b" strokeWidth={2.2} fill="none" />
    </g>
  );
}

export function CoinPouch({ size, className }: { size: CoinPackSize; className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true" focusable={false}>
      {size === 'small' && (
        <>
          <Coin x={48} y={26} r={8} />
          <Sack
            d="M34 41 C21 53 22 84 48 86 C74 84 75 53 62 41 Z"
            shade="M57 45 C69 57 69 80 50 85 C65 79 66 58 57 45 Z"
            neck="M35 42 C34 34 41 34 43 37 C45 31 51 31 53 37 C55 34 62 34 61 42 Z"
            cordY={38}
            cordX1={34}
            cordX2={62}
          />
          <ellipse cx={38} cy={64} rx={3.5} ry={8} fill="#ffd0a8" opacity={0.7} />
        </>
      )}
      {size === 'medium' && (
        <>
          <Coin x={38} y={25} r={8} />
          <Coin x={58} y={23} r={8} />
          <Coin x={48} y={18} r={8} />
          <Sack
            d="M30 42 C12 56 14 88 48 89 C82 88 84 56 66 42 Z"
            shade="M61 46 C76 59 77 84 52 88 C71 81 72 60 61 46 Z"
            neck="M31 43 C29 34 37 33 40 37 C42 30 54 30 56 37 C59 33 67 34 65 43 Z"
            cordY={39}
            cordX1={30}
            cordX2={66}
          />
          <ellipse cx={30} cy={66} rx={4} ry={10} fill="#ffd0a8" opacity={0.7} />
          <Coin x={78} y={83} r={7} squash={0.8} />
        </>
      )}
      {size === 'large' && (
        <>
          <Coin x={31} y={27} r={8} />
          <Coin x={65} y={25} r={8} />
          <Coin x={42} y={19} r={8} />
          <Coin x={55} y={16} r={8} />
          <Sack
            d="M26 43 C5 58 7 90 48 91 C89 90 91 58 70 43 Z"
            shade="M65 47 C84 60 85 86 54 90 C77 82 79 61 65 47 Z"
            neck="M27 44 C24 34 33 33 37 37 C40 29 56 29 59 37 C63 33 72 34 69 44 Z"
            cordY={40}
            cordX1={26}
            cordX2={70}
          />
          <ellipse cx={24} cy={68} rx={4.5} ry={11} fill="#ffd0a8" opacity={0.7} />
          <Coin x={83} y={86} r={7} squash={0.7} />
          <Coin x={90} y={80} r={5} squash={0.7} />
          {/* Oyunun harf taşı */}
          <g transform="rotate(-12 13 80)">
            <rect x={3} y={70} width={20} height={20} rx={4} fill="#fde7c6" stroke={COIN_RIM} strokeWidth={2} />
            <text x={13} y={85} textAnchor="middle" fontSize={13} fontWeight={900} fill="#2b1d14" fontFamily="Arial, sans-serif">
              K
            </text>
          </g>
        </>
      )}
    </svg>
  );
}
