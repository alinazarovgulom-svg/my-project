export default function VerifiedBadge({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, filter: `drop-shadow(0 0 ${size * 0.2}px rgba(29,155,240,0.5))` }}
    >
      {/* 12-pointed starburst badge */}
      <path
        d="M50 2 L58 18 L75 10 L72 28 L90 30 L78 44 L92 55 L76 62 L82 80 L64 78 L58 96 L50 82 L42 96 L36 78 L18 80 L24 62 L8 55 L22 44 L10 30 L28 28 L25 10 L42 18 Z"
        fill="#1D9BF0"
      />
      {/* Instagram-style checkmark - short left leg, long right leg */}
      <polyline
        points="27,52 41,66 73,34"
        stroke="white"
        strokeWidth="9.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
