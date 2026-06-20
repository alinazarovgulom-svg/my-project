export default function VerifiedBadge({ size = 16 }) {
  const id = `vg${size}`
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, filter: `drop-shadow(0 0 ${size * 0.25}px rgba(99,102,241,0.7))` }}
    >
      <path d="M8 0.5L9.79 2.71L12.55 2.05L13.21 4.81L15.42 6.6L14.18 9.13L15.42 11.66L13.21 13.45L12.55 16.21L9.79 15.55L8 17.76L6.21 15.55L3.45 16.21L2.79 13.45L0.58 11.66L1.82 9.13L0.58 6.6L2.79 4.81L3.45 2.05L6.21 2.71L8 0.5Z"
        fill={`url(#${id})`} />
      <path d="M5 8.5L7 10.5L11 6.5"
        stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
    </svg>
  )
}
