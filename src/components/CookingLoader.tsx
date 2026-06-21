import React from 'react';

interface CookingLoaderProps {
  message?: string;
  /** Renders as a full-page semi-transparent overlay */
  fullPage?: boolean;
}

export const CookingLoader: React.FC<CookingLoaderProps> = ({
  message = 'Cooking something up…',
  fullPage = false,
}) => {
  const wrapStyle: React.CSSProperties = fullPage
    ? {
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(8, 8, 18, 0.82)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
      };

  return (
    <>
      <style>{`
        @keyframes cl-panShake {
          0%,100% { transform: translateX(0); }
          25%      { transform: translateX(2px) translateY(-1px); }
          75%      { transform: translateX(-2px) translateY(1px); }
        }
        @keyframes cl-steam {
          0%   { opacity: 0;   transform: translateY(0)    scaleX(1);   }
          30%  { opacity: 0.7; }
          100% { opacity: 0;   transform: translateY(-44px) scaleX(1.6); }
        }
        @keyframes cl-heat {
          0%,100% { opacity: 0.55; transform: scaleX(1);   }
          50%     { opacity: 1;    transform: scaleX(1.12); }
        }
        @keyframes cl-dot {
          0%,80%,100% { opacity: 0.2; transform: translateY(0);    }
          40%         { opacity: 1;   transform: translateY(-4px); }
        }
        .cl-pan    { animation: cl-panShake 0.45s ease-in-out infinite; transform-origin: 90px 145px; }
        .cl-steam1 { animation: cl-steam 2.2s ease-in-out infinite 0s;    transform-origin: center bottom; }
        .cl-steam2 { animation: cl-steam 2.2s ease-in-out infinite 0.65s; transform-origin: center bottom; }
        .cl-steam3 { animation: cl-steam 2.2s ease-in-out infinite 1.3s;  transform-origin: center bottom; }
        .cl-heat   { animation: cl-heat  0.7s ease-in-out infinite; transform-origin: center; }
        .cl-d1 { animation: cl-dot 1.2s ease-in-out infinite 0s;    }
        .cl-d2 { animation: cl-dot 1.2s ease-in-out infinite 0.2s;  }
        .cl-d3 { animation: cl-dot 1.2s ease-in-out infinite 0.4s;  }
      `}</style>

      <div style={wrapStyle}>
        <svg
          width="230"
          height="185"
          viewBox="0 0 230 185"
          style={{ filter: 'drop-shadow(0 0 18px rgba(251,146,60,0.35))' }}
        >
          <defs>
            <radialGradient id="cl-heatGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#f97316" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0"   />
            </radialGradient>
            <linearGradient id="cl-rimGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#9ca3af" />
              <stop offset="100%" stopColor="#4b5563" />
            </linearGradient>
          </defs>

          {/* ── Heat glow ── */}
          <ellipse cx="90" cy="158" rx="58" ry="11" fill="url(#cl-heatGrad)" className="cl-heat" />

          {/* ── Flame wisps ── */}
          {[55, 80, 105, 125].map((x, i) => (
            <path
              key={i}
              d={`M ${x} 153 Q ${x + 5} 143 ${x + 10} 153`}
              stroke="#fb923c"
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
              opacity="0.55"
              className="cl-heat"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}

          {/* ── Pan group (wobbles) ── */}
          <g className="cl-pan">

            {/* Pan body exterior */}
            <path d="M 20 90 L 20 145 Q 90 162 160 145 L 160 90 Z"
              fill="#1c1c2e" stroke="#374151" strokeWidth="1.5" />

            {/* Pan interior (food surface) */}
            <path d="M 28 95 L 28 140 Q 90 154 152 140 L 152 95 Z"
              fill="#0f0f1a" />

            {/* Pan rim – top edge */}
            <rect x="17" y="82" width="145" height="11" rx="5.5"
              fill="url(#cl-rimGrad)" />
            {/* Rim highlight */}
            <rect x="20" y="83" width="139" height="4" rx="2"
              fill="#d1d5db" opacity="0.18" />

            {/* Handle – outer */}
            <path d="M 160 112 Q 188 108 210 114"
              stroke="#374151" strokeWidth="14" strokeLinecap="round" fill="none" />
            {/* Handle – inner */}
            <path d="M 160 112 Q 188 108 210 114"
              stroke="#6b7280" strokeWidth="7" strokeLinecap="round" fill="none" />
            {/* Handle screw */}
            <circle cx="206" cy="113" r="3.5" fill="#4b5563" />
            <circle cx="206" cy="113" r="1.5" fill="#9ca3af" />

            {/* ── Food items (SMIL bounce) ── */}

            {/* Egg yolk */}
            <g>
              <circle cx="48" cy="122" r="9"  fill="#fcd34d" />
              <circle cx="48" cy="122" r="5.5" fill="#f59e0b" />
              <circle cx="45" cy="119" r="2"  fill="#fef3c7" opacity="0.7" />
              <animateTransform attributeName="transform" type="translate"
                values="0,0; 0,-16; 0,0" dur="0.7s" repeatCount="indefinite" begin="0s" />
            </g>

            {/* Green veggie */}
            <g>
              <circle cx="74" cy="124" r="7" fill="#22c55e" />
              <circle cx="72" cy="122" r="2.5" fill="#4ade80" opacity="0.65" />
              <animateTransform attributeName="transform" type="translate"
                values="0,0; 0,-13; 0,0" dur="0.7s" repeatCount="indefinite" begin="0.18s" />
            </g>

            {/* Red tomato */}
            <g>
              <circle cx="100" cy="120" r="8" fill="#ef4444" />
              <circle cx="97"  cy="118" r="2.5" fill="#fca5a5" opacity="0.6" />
              <animateTransform attributeName="transform" type="translate"
                values="0,0; 0,-19; 0,0" dur="0.7s" repeatCount="indefinite" begin="0.36s" />
            </g>

            {/* Orange carrot */}
            <g>
              <circle cx="126" cy="123" r="6.5" fill="#f97316" />
              <circle cx="124" cy="121" r="2" fill="#fdba74" opacity="0.65" />
              <animateTransform attributeName="transform" type="translate"
                values="0,0; 0,-11; 0,0" dur="0.7s" repeatCount="indefinite" begin="0.52s" />
            </g>

            {/* White onion */}
            <g>
              <circle cx="148" cy="125" r="5.5" fill="#f1f5f9" opacity="0.88" />
              <circle cx="146" cy="123" r="2" fill="#ffffff" opacity="0.5" />
              <animateTransform attributeName="transform" type="translate"
                values="0,0; 0,-14; 0,0" dur="0.7s" repeatCount="indefinite" begin="0.65s" />
            </g>

            {/* Sizzle droplets */}
            {[{cx:62, cy:108, r:1.5, fill:'#fbbf24', delay:'0.1s'},
              {cx:88, cy:106, r:1.2, fill:'#22c55e', delay:'0.3s'},
              {cx:113,cy:107, r:1.5, fill:'#ef4444', delay:'0.48s'},
              {cx:138,cy:109, r:1.2, fill:'#f97316', delay:'0.6s'}
            ].map((d, i) => (
              <g key={i}>
                <circle cx={d.cx} cy={d.cy} r={d.r} fill={d.fill} opacity="0.55" />
                <animateTransform attributeName="transform" type="translate"
                  values="0,0; 0,-10; 0,0" dur="0.7s" repeatCount="indefinite" begin={d.delay} />
              </g>
            ))}
          </g>

          {/* ── Steam wisps (above rim, outside wobble group) ── */}
          <path d="M 52 81 Q 46 67 52 53 Q 58 39 52 26"
            stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" fill="none"
            className="cl-steam1" />
          <path d="M 90 79 Q 84 65 90 51 Q 96 37 90 23"
            stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" fill="none"
            className="cl-steam2" />
          <path d="M 128 81 Q 122 67 128 53 Q 134 39 128 26"
            stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" fill="none"
            className="cl-steam3" />
        </svg>

        {/* Message + animated dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
          <span style={{
            fontSize: '0.95rem',
            fontWeight: 600,
            color: 'var(--text-secondary, #94a3b8)',
            letterSpacing: '0.03em',
          }}>
            {message}
          </span>
          <span className="cl-d1" style={{ color: 'var(--primary, #6366f1)', fontSize: '1.1rem', lineHeight: 1 }}>●</span>
          <span className="cl-d2" style={{ color: 'var(--primary, #6366f1)', fontSize: '1.1rem', lineHeight: 1 }}>●</span>
          <span className="cl-d3" style={{ color: 'var(--primary, #6366f1)', fontSize: '1.1rem', lineHeight: 1 }}>●</span>
        </div>
      </div>
    </>
  );
};
