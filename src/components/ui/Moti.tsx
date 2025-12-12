import React from 'react';
import { MotiView as MotiViewLib } from 'moti';

interface MotiProps {
  from?: Record<string, any>;
  animate?: Record<string, any>;
  transition?: Record<string, any>;
  children?: React.ReactNode;
  style?: any;
}

export const MotiView: React.FC<MotiProps> = ({ children, ...rest }) => {
  return <MotiViewLib {...rest}>{children}</MotiViewLib>;
};


