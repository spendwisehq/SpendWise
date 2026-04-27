// Hand-tuned SVG icons. Stroke-based, currentColor.
import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

const Base = ({ size = 24, stroke = 2, color = '#fff', children }) => (
  <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color}
       strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </Svg>
);

const Filled = ({ size = 24, color = '#fff', children }) => (
  <Svg viewBox="0 0 24 24" width={size} height={size} fill={color} stroke="none">
    {children}
  </Svg>
);

export const Icon = {
  Home: (p) => <Base {...p}><Path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2z"/></Base>,
  List: (p) => <Base {...p}>
    <Path d="M8 6h13M8 12h13M8 18h13"/>
    <Circle cx="4" cy="6" r="1.2" fill={p.color || '#fff'} stroke="none"/>
    <Circle cx="4" cy="12" r="1.2" fill={p.color || '#fff'} stroke="none"/>
    <Circle cx="4" cy="18" r="1.2" fill={p.color || '#fff'} stroke="none"/>
  </Base>,
  Sparkles: (p) => <Filled {...p}>
    <Path d="M12 2l1.8 4.5L18 8l-4.2 1.5L12 14l-1.8-4.5L6 8l4.2-1.5z"/>
    <Path d="M19 14l.9 2.2L22 17l-2.1.8L19 20l-.9-2.2L16 17l2.1-.8z"/>
    <Path d="M5 15l.6 1.4L7 17l-1.4.6L5 19l-.6-1.4L3 17l1.4-.6z"/>
  </Filled>,
  Users: (p) => <Base {...p}>
    <Circle cx="9" cy="8" r="4"/>
    <Path d="M2 21a7 7 0 0 1 14 0"/>
    <Circle cx="17" cy="7" r="3"/>
    <Path d="M22 21a5 5 0 0 0-6-4.9"/>
  </Base>,
  Target: (p) => <Base {...p}>
    <Circle cx="12" cy="12" r="9"/>
    <Circle cx="12" cy="12" r="5"/>
    <Circle cx="12" cy="12" r="1.5" fill={p.color || '#fff'} stroke="none"/>
  </Base>,
  Plus: (p) => <Base {...p}><Path d="M12 5v14M5 12h14"/></Base>,
  Close: (p) => <Base {...p}><Path d="M6 6l12 12M18 6L6 18"/></Base>,
  ChevRight: (p) => <Base {...p}><Path d="M9 6l6 6-6 6"/></Base>,
  ChevLeft: (p) => <Base {...p}><Path d="M15 6l-6 6 6 6"/></Base>,
  ChevDown: (p) => <Base {...p}><Path d="M6 9l6 6 6-6"/></Base>,
  Search: (p) => <Base {...p}>
    <Circle cx="11" cy="11" r="7"/>
    <Path d="M20 20l-3.5-3.5"/>
  </Base>,
  Filter: (p) => <Base {...p}><Path d="M3 5h18M6 12h12M10 19h4"/></Base>,
  Bell: (p) => <Base {...p}>
    <Path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 7H4c0-1 2-2 2-7z"/>
    <Path d="M10 21a2 2 0 0 0 4 0"/>
  </Base>,
  Mail: (p) => <Base {...p}>
    <Rect x="3" y="5" width="18" height="14" rx="2"/>
    <Path d="M3 7l9 7 9-7"/>
  </Base>,
  Lock: (p) => <Base {...p}>
    <Rect x="4" y="11" width="16" height="10" rx="2"/>
    <Path d="M8 11V7a4 4 0 0 1 8 0v4"/>
  </Base>,
  Eye: (p) => <Base {...p}>
    <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/>
    <Circle cx="12" cy="12" r="3"/>
  </Base>,
  EyeOff: (p) => <Base {...p}>
    <Path d="M3 3l18 18"/>
    <Path d="M10.5 6.3A10 10 0 0 1 12 6c6.5 0 10 6 10 6a14.8 14.8 0 0 1-3.3 3.9"/>
    <Path d="M6.1 6.1A14.8 14.8 0 0 0 2 12s3.5 6 10 6a9.8 9.8 0 0 0 3-.5"/>
    <Path d="M9.9 9.9a3 3 0 1 0 4.2 4.2"/>
  </Base>,
  TrendUp: (p) => <Base {...p}>
    <Path d="M3 17l6-6 4 4 7-8"/>
    <Path d="M14 7h6v6"/>
  </Base>,
  TrendDown: (p) => <Base {...p}>
    <Path d="M3 7l6 6 4-4 7 8"/>
    <Path d="M14 17h6v-6"/>
  </Base>,
  Scan: (p) => <Base {...p}>
    <Path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16"/>
  </Base>,
  Split: (p) => <Base {...p}>
    <Path d="M16 3h5v5"/>
    <Path d="M8 21H3v-5"/>
    <Path d="M21 3L14 10"/>
    <Path d="M3 21l7-7"/>
  </Base>,
  Mic: (p) => <Base {...p}>
    <Rect x="9" y="3" width="6" height="12" rx="3"/>
    <Path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>
  </Base>,
  Send: (p) => <Base {...p}>
    <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>
  </Base>,
  Camera: (p) => <Base {...p}>
    <Path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <Circle cx="12" cy="13" r="4"/>
  </Base>,
  Check: (p) => <Base {...p}><Path d="M5 12l5 5L20 7"/></Base>,
  Settings: (p) => <Base {...p}>
    <Circle cx="12" cy="12" r="3"/>
    <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </Base>,
  Flame: (p) => <Base {...p}>
    <Path d="M12 22c4 0 7-3 7-7 0-5-5-6-5-11 0 0-4 2-4 7-2 0-3-2-3-3 0 0-3 3-3 7 0 4 3 7 8 7z"/>
  </Base>,
  Grid: (p) => <Base {...p}>
    <Rect x="3" y="3" width="7" height="7" rx="1.5"/>
    <Rect x="14" y="3" width="7" height="4" rx="1.5"/>
    <Rect x="3" y="14" width="7" height="7" rx="1.5"/>
    <Rect x="14" y="11" width="7" height="10" rx="1.5"/>
  </Base>,
  Wallet: (p) => <Base {...p}>
    <Rect x="3" y="6" width="18" height="14" rx="3"/>
    <Path d="M3 10h18"/>
    <Circle cx="16" cy="15" r="1.4" fill={p.color || '#fff'} stroke="none"/>
  </Base>,
  ChartSearch: (p) => <Base {...p}>
    <Path d="M4 18l4-5 3 3 4-6"/>
    <Circle cx="16" cy="16" r="3"/>
    <Path d="M18 18l2 2"/>
  </Base>,
  Logo: ({ size = 40 }) => (
    <Svg viewBox="0 0 40 40" width={size} height={size} fill="none">
      <Path d="M8 14C8 10 10 7 14 7h12c4 0 6 3 6 7 0 3-2 5-5 5H18c-3 0-5 2-5 5s2 5 5 5h14"
            stroke="#003827" strokeWidth="3.5" strokeLinecap="round"/>
      <Circle cx="13" cy="12" r="2" fill="#003827"/>
      <Circle cx="27" cy="28" r="2" fill="#003827"/>
    </Svg>
  ),
};

export default Icon;
