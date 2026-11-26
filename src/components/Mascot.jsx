export default function Mascot() {
  return (
    <svg
      className="mascot-svg"
      viewBox="0 0 260 220"
      role="img"
      aria-label="Q版机器伙伴豆豆"
    >
      <defs>
        <linearGradient id="mascotHead" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe18a" />
          <stop offset="100%" stopColor="#ffc95a" />
        </linearGradient>
        <linearGradient id="mascotArm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff9a80" />
          <stop offset="100%" stopColor="#ff765d" />
        </linearGradient>
      </defs>

      <ellipse cx="130" cy="201" rx="76" ry="11" fill="#303447" opacity=".12" />
      <g className="mascot-float">
        <line x1="130" y1="47" x2="130" y2="22" stroke="#303447" strokeWidth="5" strokeLinecap="round" />
        <circle cx="130" cy="18" r="10" fill="#8ce0c4" stroke="#303447" strokeWidth="5" />

        <circle cx="43" cy="106" r="13" fill="#ff9daf" stroke="#303447" strokeWidth="5" />
        <circle cx="217" cy="106" r="13" fill="#ff9daf" stroke="#303447" strokeWidth="5" />

        <rect x="53" y="42" width="154" height="124" rx="42" fill="url(#mascotHead)" stroke="#303447" strokeWidth="5" />

        <rect x="76" y="70" width="108" height="64" rx="26" fill="#fffaf0" stroke="#303447" strokeWidth="4" />
        <circle className="mascot-eye mascot-eye-left" cx="106" cy="96" r="6" fill="#303447" />
        <circle className="mascot-eye mascot-eye-right" cx="154" cy="96" r="6" fill="#303447" />
        <path d="M116 115 Q130 126 144 115" fill="none" stroke="#303447" strokeWidth="4" strokeLinecap="round" />
        <circle cx="88" cy="116" r="7" fill="#ff9daf" opacity=".72" />
        <circle cx="172" cy="116" r="7" fill="#ff9daf" opacity=".72" />

        <g className="mascot-arm-left">
          <rect x="27" y="119" width="34" height="22" rx="11" fill="url(#mascotArm)" stroke="#303447" strokeWidth="5" transform="rotate(18 44 130)" />
        </g>
        <g className="mascot-arm-right">
          <rect x="199" y="119" width="34" height="22" rx="11" fill="url(#mascotArm)" stroke="#303447" strokeWidth="5" transform="rotate(-18 216 130)" />
        </g>

        <rect x="88" y="159" width="20" height="29" rx="10" fill="#ff765d" stroke="#303447" strokeWidth="5" />
        <rect x="152" y="159" width="20" height="29" rx="10" fill="#ff765d" stroke="#303447" strokeWidth="5" />
        <rect x="111" y="151" width="38" height="24" rx="10" fill="#8ce0c4" stroke="#303447" strokeWidth="4" />
        <path d="M121 162h4m6 0h4m6 0h4" stroke="#303447" strokeWidth="3" strokeLinecap="round" />
      </g>

      <g className="mascot-spark mascot-spark-one">
        <path d="M226 47v12M220 53h12" stroke="#ff765d" strokeWidth="4" strokeLinecap="round" />
      </g>
      <g className="mascot-spark mascot-spark-two">
        <path d="M35 57v9M30.5 61.5h9" stroke="#799ddb" strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  )
}
