// The car and tyre marks as SVG, shared by the social image and the icons.
// Drawn in the same units as the in-game car, facing +x.

const BODY = "M44 0 L36 -2.2 L22 -4.5 L14 -9 L4 -12 L-14 -12 L-28 -8 L-42 -4 L-44 0 L-42 4 L-28 8 L-14 12 L4 12 L14 9 L22 4.5 L36 2.2 Z";

// Called as a function, not rendered as <Car />: the image renderer only allows plain SVG
// elements inside <svg>.
export function car() {
  return (
    <g>
      <rect x={-37} y={-22.5} width={18} height={11} rx={2.5} fill="#0d0d0e" stroke="#2b2b2e" />
      <rect x={-37} y={11.5} width={18} height={11} rx={2.5} fill="#0d0d0e" stroke="#2b2b2e" />
      <rect x={19.5} y={-21.75} width={17} height={9.5} rx={2.5} fill="#0d0d0e" stroke="#2b2b2e" />
      <rect x={19.5} y={12.25} width={17} height={9.5} rx={2.5} fill="#0d0d0e" stroke="#2b2b2e" />
      <rect x={-51} y={-19} width={9} height={38} fill="#1b1b1d" />
      <rect x={-52} y={-20} width={11} height={2.5} fill="#dc0000" />
      <rect x={-52} y={17.5} width={11} height={2.5} fill="#dc0000" />
      <path d={BODY} fill="#dc0000" stroke="#8f0000" strokeWidth={1} />
      <path d="M44 0 L36 -2.2 L32 -2.9 L32 2.9 L36 2.2 Z" fill="#fff200" />
      <rect x={40} y={-20} width={7} height={40} fill="#1b1b1d" />
      <rect x={39} y={-20.5} width={9} height={2.5} fill="#dc0000" />
      <rect x={39} y={18} width={9} height={2.5} fill="#dc0000" />
      <rect x={-7} y={-4.5} width={16} height={9} rx={4} fill="#1b1b1d" />
      <circle cx={0} cy={0} r={3.6} fill="#f5f5f5" />
    </g>
  );
}
