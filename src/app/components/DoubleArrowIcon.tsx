import React from 'react';

interface DoubleArrowIconProps {
  size?: number;
}

export const DoubleArrowIcon: React.FC<DoubleArrowIconProps> = ({ size = 38 }) => (
  <svg width={size} viewBox="0 0 680 500" role="img" xmlns="http://www.w3.org/2000/svg">
    <title>Double pixel arrow</title>
    <desc>Two chevron arrows made of squares — grey then black — with one square spacing between them</desc>

    {/* Grey arrow */}
    <g transform="translate(145, 40)">
      <rect x="0" y="0" width="50" height="50" fill="rgb(170, 170, 170)" />
      <rect x="55" y="55" width="50" height="50" fill="rgb(170, 170, 170)" />
      <rect x="110" y="110" width="50" height="50" fill="rgb(170, 170, 170)" />
      <rect x="165" y="165" width="50" height="50" fill="rgb(170, 170, 170)" />
      <rect x="110" y="220" width="50" height="50" fill="rgb(170, 170, 170)" />
      <rect x="55" y="275" width="50" height="50" fill="rgb(170, 170, 170)" />
      <rect x="0" y="330" width="50" height="50" fill="rgb(170, 170, 170)" />
    </g>

    {/* Black arrow */}
    <g transform="translate(255, 40)">
      <rect x="0" y="0" width="50" height="50" fill="rgb(26, 26, 26)" />
      <rect x="55" y="55" width="50" height="50" fill="rgb(26, 26, 26)" />
      <rect x="110" y="110" width="50" height="50" fill="rgb(26, 26, 26)" />
      <rect x="165" y="165" width="50" height="50" fill="rgb(26, 26, 26)" />
      <rect x="110" y="220" width="50" height="50" fill="rgb(26, 26, 26)" />
      <rect x="55" y="275" width="50" height="50" fill="rgb(26, 26, 26)" />
      <rect x="0" y="330" width="50" height="50" fill="rgb(26, 26, 26)" />
    </g>
  </svg>
);
