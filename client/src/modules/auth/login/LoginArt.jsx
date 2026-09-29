export default function LoginArt() {
  return (
    <svg className="login-art" viewBox="0 0 320 300" role="img" aria-label="فنجان قهوة مبتسم">
      <ellipse cx="160" cy="272" rx="110" ry="14" fill="rgba(255,255,255,0.14)" />
      <g className="login-art__beans">
        <g transform="translate(52,228) rotate(-24)">
          <ellipse cx="0" cy="0" rx="17" ry="12" fill="#3E2412" />
          <path d="M-2,-11 C-6,-4 -6,4 -2,11" stroke="#8B5A32" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
        <g transform="translate(268,232) rotate(20)">
          <ellipse cx="0" cy="0" rx="17" ry="12" fill="#3E2412" />
          <path d="M-2,-11 C-6,-4 -6,4 -2,11" stroke="#8B5A32" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
        <g transform="translate(282,120) rotate(-14)">
          <ellipse cx="0" cy="0" rx="13" ry="9" fill="#3E2412" />
          <path d="M-2,-8 C-5,-3 -5,3 -2,8" stroke="#8B5A32" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
        <g transform="translate(38,110) rotate(16)">
          <ellipse cx="0" cy="0" rx="13" ry="9" fill="#3E2412" />
          <path d="M-2,-8 C-5,-3 -5,3 -2,8" stroke="#8B5A32" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
      </g>
      <g className="login-art__steam" stroke="#FFFFFF" strokeWidth="7" fill="none" strokeLinecap="round" opacity="0.75">
        <path className="login-art__steam-path" d="M120,108 C110,88 130,76 120,56 C112,40 124,30 122,18" />
        <path className="login-art__steam-path login-art__steam-path--late" d="M160,112 C150,92 170,80 160,60 C152,44 164,34 162,22" />
        <path className="login-art__steam-path" d="M200,108 C190,88 210,76 200,56 C192,40 204,30 202,18" />
      </g>
      <g>
        <path d="M78,140 L78,208 C78,244 112,262 160,262 C208,262 242,244 242,208 L242,140 Z" fill="#FFFFFF" />
        <path d="M78,140 L78,208 C78,244 112,262 160,262 C208,262 242,244 242,208 L242,140 Z" fill="#000000" opacity="0.06" />
        <ellipse cx="160" cy="140" rx="82" ry="20" fill="#F3ECE5" />
        <ellipse cx="160" cy="140" rx="68" ry="14" fill="#6B3F1D" />
        <ellipse cx="160" cy="139" rx="68" ry="14" fill="#8B5A32" opacity="0.55" />
        <ellipse cx="138" cy="136" rx="18" ry="5" fill="#FFFFFF" opacity="0.28" />
        <path d="M242,158 C276,158 278,206 236,210" fill="none" stroke="#FFFFFF" strokeWidth="18" strokeLinecap="round" />
        <circle cx="132" cy="196" r="9" fill="#2B211B" />
        <circle cx="188" cy="196" r="9" fill="#2B211B" />
        <circle cx="135" cy="193" r="3" fill="#FFFFFF" />
        <circle cx="191" cy="193" r="3" fill="#FFFFFF" />
        <path d="M138,222 C148,232 172,232 182,222" fill="none" stroke="#2B211B" strokeWidth="6" strokeLinecap="round" />
        <circle cx="112" cy="214" r="7" fill="#E8A0A0" opacity="0.8" />
        <circle cx="208" cy="214" r="7" fill="#E8A0A0" opacity="0.8" />
      </g>
    </svg>
  );
}
