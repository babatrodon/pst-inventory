export function Logo({ h = 46 }: { h?: number }) {
  return (
    <svg viewBox="0 0 250 148" style={{ height: h }} aria-label="PST logo">
      <path d="M 200 32 A 100 55 0 1 0 208 100" fill="none" stroke="#12A14B" strokeWidth="19" strokeLinecap="round" />
      <text x="72" y="103" fontFamily="Georgia,'Times New Roman',serif" fontStyle="italic" fontWeight="bold" fontSize="82" letterSpacing="-2">
        <tspan fill="#E5322D">P</tspan><tspan fill="#F0B90B">S</tspan><tspan fill="#2853A8">T</tspan>
      </text>
    </svg>
  );
}
