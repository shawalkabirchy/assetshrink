export const EXAMPLE_NAME = 'studio-leaf.svg';

export const EXAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-labelledby="leaf-title leaf-description">
  <title id="leaf-title">Studio leaf</title>
  <desc id="leaf-description">An emerald leaf with a soft highlight and a curved stem.</desc>
  <!-- Original demo artwork by ConsoleLog Studio. -->
  <defs>
    <linearGradient id="leaf-gradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0.00000" stop-color="#65bba0"/>
      <stop offset="1.00000" stop-color="#17634d"/>
    </linearGradient>
    <mask id="leaf-mask">
      <rect width="256.00000" height="256.00000" fill="#ffffff"/>
      <path d="M 72.12345 196.45678 Q 130.12345 149.12345 181.45678 70.12345" fill="none" stroke="#000000" stroke-width="9.00000" stroke-linecap="round"/>
    </mask>
  </defs>
  <path id="leaf-shape" d="M 65.12345 197.45678 C 27.12345 112.34567 86.45678 40.12345 201.12345 36.45678 C 198.45678 138.12345 148.12345 211.45678 65.12345 197.45678 Z" fill="url(#leaf-gradient)" mask="url(#leaf-mask)"/>
  <path d="M 62.12345 218.45678 Q 113.12345 174.12345 157.45678 111.12345" fill="none" stroke="#17634d" stroke-width="7.00000" stroke-linecap="round"/>
</svg>`;
