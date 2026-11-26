export default function WorkbenchScene() {
  return (
    <svg
      className="workbench-scene"
      viewBox="0 0 540 380"
      role="img"
      aria-label="小狐狸趴在数学工作桌旁，桌上有显示器、函数曲线、草稿纸和文具"
    >
      <defs>
        <linearGradient id="sceneMint" x1="70" y1="40" x2="450" y2="345" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D9FFF5" />
          <stop offset="0.52" stopColor="#A9F2DF" />
          <stop offset="1" stopColor="#7DDFC7" />
        </linearGradient>
        <linearGradient id="sceneGreen" x1="410" y1="185" x2="500" y2="260" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1BD3B0" />
          <stop offset="1" stopColor="#00BC82" />
        </linearGradient>
      </defs>
      <path
        d="M58 129C78 38 184 7 281 35c102 30 202 101 192 207-11 113-139 125-240 121-98-4-205-68-175-234Z"
        fill="url(#sceneMint)"
        stroke="#20313f"
        strokeWidth="3.5"
      />
      <path d="M84 292c61-20 307-24 382 0-58 39-330 42-382 0Z" fill="#e7d5bd" opacity=".75" />

      <g className="scene-spark" stroke="#26344f" strokeWidth="4" strokeLinecap="round">
        <path d="M86 89v22M75 100h22" />
        <path d="m425 56 11 11M436 56l-11 11" />
        <path d="M466 157v16M458 165h16" />
      </g>

      <g className="scene-bubble">
        <path
          d="M324 45h151a15 15 0 0 1 15 15v29a15 15 0 0 1-15 15h-80l-17 16 2-16h-56a15 15 0 0 1-15-15V60a15 15 0 0 1 15-15Z"
          fill="#fffdf7"
          stroke="#26344f"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <text x="398" y="74" textAnchor="middle" fontFamily="'Microsoft YaHei', sans-serif" fontSize="15" fontWeight="700" fill="#26344f">先跑一段，</text>
        <text x="398" y="94" textAnchor="middle" fontFamily="'Microsoft YaHei', sans-serif" fontSize="15" fontWeight="700" fill="#26344f">再懂一点！</text>
      </g>

      <g className="scene-float-card scene-card-pi">
        <rect x="61" y="155" width="67" height="64" rx="17" fill="#fffdf7" stroke="#26344f" strokeWidth="4" />
        <text x="94.5" y="201" textAnchor="middle" fontFamily="Georgia, serif" fontSize="37" fontWeight="700" fill="#26344f">π</text>
      </g>
      <g className="scene-float-card scene-card-code">
        <rect x="414" y="194" width="86" height="62" rx="17" fill="url(#sceneGreen)" stroke="#26344f" strokeWidth="4" />
        <text x="457" y="236" textAnchor="middle" fontFamily="Consolas, monospace" fontSize="25" fontWeight="700" fill="#26344f">{"</>"}</text>
      </g>

      <g stroke="#26344f" strokeWidth="4" strokeLinejoin="round">
        <path d="M137 274v45M393 274v45" strokeWidth="10" />
        <path d="M111 254h308a14 14 0 0 1 14 14v17H97v-17a14 14 0 0 1 14-14Z" fill="#e7a66f" />
        <path d="M103 285h324v20H103z" fill="#cf8357" />
      </g>

      <g stroke="#26344f" strokeWidth="4" strokeLinejoin="round">
        <path d="M151 182h205a12 12 0 0 1 12 12v61H139v-61a12 12 0 0 1 12-12Z" fill="#34445f" />
        <rect x="153" y="194" width="201" height="49" rx="6" fill="#f7fbff" />
        <path d="M249 255h9v30h-9z" fill="#34445f" />
        <path d="M223 286h61a8 8 0 0 1 0 16h-61a8 8 0 0 1 0-16Z" fill="#34445f" />
        <path d="M166 233h174M166 210h55" stroke="#cad8e9" strokeWidth="2" />
        <path d="M166 234V207M256 236V204" stroke="#8f9fb5" strokeWidth="2" />
        <path d="M169 229c19-18 31 0 44-12s25-27 40-17 19 6 31-8 26-10 36-1" fill="none" stroke="#ff7e67" strokeWidth="4" strokeLinecap="round" />
        <circle cx="320" cy="191" r="4" fill="#85b8ff" stroke="none" />
      </g>

      <g className="scene-fox" stroke="#26344f" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M350 214c-3-37 18-70 53-74 38-4 68 25 68 67v28H350Z" fill="#ff966f" />
        <path d="M393 139c11 14 34 17 49 3-5 26-43 29-49-3Z" fill="#fffdf7" />
        <path d="M369 285c1-49 22-78 54-80 35-2 56 28 56 80Z" fill="#8fdac5" />
        <circle cx="363" cy="176" r="16" fill="#ff966f" />
        <circle cx="476" cy="174" r="16" fill="#ff966f" />
        <path d="m406 154 16 8 16-8v10h-32z" fill="#ffb28f" />
        <circle cx="412" cy="177" r="4" fill="#26344f" stroke="none" />
        <circle cx="442" cy="177" r="4" fill="#26344f" stroke="none" />
        <path d="M423 189c5 5 10 5 15 0" fill="none" />
        <ellipse cx="400" cy="190" rx="8" ry="5" fill="#ffb0a1" stroke="none" opacity=".9" />
        <ellipse cx="454" cy="190" rx="8" ry="5" fill="#ffb0a1" stroke="none" opacity=".9" />
        <path d="M385 247c-22-7-35-22-33-41 14 0 28 9 38 23M456 243c15 3 25 12 26 29-14 0-25-8-30-21" fill="#a6e3d2" />
        <path d="M419 261c0 15 17 15 17 0" fill="#fffdf7" />
        <path d="M357 237c-23-7-42-4-54 10" fill="none" />
      </g>

      <g transform="rotate(-13 117 223)" stroke="#26344f" strokeWidth="4" strokeLinejoin="round">
        <path d="M75 231h44v25H75z" fill="#85b8ff" />
        <path d="M71 231h48v-5H71zM75 256h44v5H75z" fill="#f4bd78" />
        <path d="M100 231h8v25h-8z" fill="#fffdf7" />
      </g>

      <g stroke="#26344f" strokeWidth="4" strokeLinejoin="round">
        <path d="M426 267h50l-7 33h-36z" fill="#fffdf7" />
        <path d="M449 268v-21h25" fill="none" strokeLinecap="round" />
        <path d="M466 247c14-17 26-10 28-4-11 9-20 10-28 4Z" fill="#8fdac5" />
      </g>

      <g transform="rotate(8 339 262)">
        <rect x="293" y="245" width="95" height="53" rx="8" fill="#fffdf7" stroke="#26344f" strokeWidth="4" />
        <path d="M307 261h40M307 272h65M307 283h51" stroke="#8f9fb5" strokeWidth="3" strokeLinecap="round" />
        <path d="m359 247 28-15 8 34-28 14z" fill="#ffd66b" stroke="#26344f" strokeWidth="4" />
        <path d="m365 278 4 14 9-11" fill="#fffdf7" stroke="#26344f" strokeWidth="3" strokeLinejoin="round" />
      </g>

      <path d="M53 169c-20 0-27 26-5 30-21 8-9 30 9 26" fill="none" stroke="#85b8ff" strokeWidth="8" strokeLinecap="round" />
    </svg>
  )
}
