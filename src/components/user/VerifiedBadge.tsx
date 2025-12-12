/**
 * Verified Badge Component
 * Instagram-style round check badge
 */

import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface VerifiedBadgeProps {
  size?: number;
}

export default function VerifiedBadge({ size = 18 }: VerifiedBadgeProps) {
  return (
    <Svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none"
      style={{ alignSelf: 'center' }} // Ensure vertical centering
    >
      <Path
        d="M12 2l2.3 2 2.7-.5 1.2 2.6 2.6 1.2-.5 2.7 2 2.3-2 2.3.5 2.7-2.6 1.2-1.2 2.6-2.7-.5-2.3 2-2.3-2-2.7.5-1.2-2.6-2.6-1.2.5-2.7-2-2.3 2-2.3-.5-2.7L7 5.5 8.2 2.9 10.9 3.4 12 2z"
        fill="#1DA1F2"
      />
      <Path
        d="M10 13l-2-2 1.4-1.4L10 10.2l4.6-4.6L16 7l-6 6z"
        fill="white"
      />
    </Svg>
  );
}

