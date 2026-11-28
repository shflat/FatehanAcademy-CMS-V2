/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fatehan Robotics Academy — Lightweight Technical Robotics Visual Accents
 * Inspired by Aceternity UI blueprint beams, React Bits micro-telemetry,
 * and unDraw-style technical robotics vector art.
 * Strictly GPU-compositor animated (transform/opacity only), zero layout reflow,
 * zero external bundle overhead, and fully honors prefers-reduced-motion.
 */

import React from 'react';

/** Subtle Aceternity-style architectural blue PCB circuit & engineering grid overlay */
export const RoboticsBlueprintGrid: React.FC<{
  variant?: 'light' | 'dark';
  className?: string;
}> = ({ variant = 'light', className = '' }) => {
  const strokeMain = variant === 'dark' ? 'rgba(56, 189, 248, 0.24)' : 'rgba(37, 99, 235, 0.14)';
  const strokeSoft = variant === 'dark' ? 'rgba(147, 197, 253, 0.12)' : 'rgba(59, 130, 246, 0.08)';
  const nodeFill = variant === 'dark' ? '#38BDF8' : '#2563EB';
  const accentFill = variant === 'dark' ? '#FBBF24' : '#0EA5E9';

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none absolute inset-0 overflow-hidden ${className}`}
    >
      {/* Engineering coordinate grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            variant === 'dark'
              ? 'linear-gradient(to right, rgba(56,189,248,0.09) 1px, transparent 1px), linear-gradient(to bottom, rgba(56,189,248,0.09) 1px, transparent 1px)'
              : 'linear-gradient(to right, rgba(37,99,235,0.065) 1px, transparent 1px), linear-gradient(to bottom, rgba(37,99,235,0.065) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
          maskImage: 'radial-gradient(ellipse 85% 75% at 50% 45%, black 35%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 85% 75% at 50% 45%, black 35%, transparent 100%)',
        }}
      />

      {/* Precision PCB circuit trace paths & microchip nodes */}
      <svg
        viewBox="0 0 1200 420"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full opacity-85"
      >
        {/* Right-top circuit bus */}
        <path
          d="M1200 62 H1030 L990 102 H875"
          stroke={strokeMain}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M1200 84 H1058 L1026 116 H940"
          stroke={strokeSoft}
          strokeWidth="1.25"
          strokeLinecap="round"
        />
        <circle cx="875" cy="102" r="4" fill={nodeFill} fillOpacity="0.65" />
        <circle cx="940" cy="116" r="3" fill={accentFill} fillOpacity="0.7" />

        {/* Left-bottom circuit bus */}
        <path
          d="M0 342 H172 L212 302 H330"
          stroke={strokeMain}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M0 364 H146 L178 332 H268"
          stroke={strokeSoft}
          strokeWidth="1.25"
          strokeLinecap="round"
        />
        <circle cx="330" cy="302" r="4" fill={nodeFill} fillOpacity="0.65" />
        <circle cx="268" cy="332" r="3" fill={accentFill} fillOpacity="0.7" />

        {/* Technical crosshair markers */}
        <g stroke={strokeMain} strokeWidth="1.2">
          <path d="M98 44 V60 M90 52 H106" />
          <path d="M1112 332 V348 M1104 340 H1120" />
        </g>

        {/* Animated light-beam sweep */}
        <line
          x1="0"
          y1="0"
          x2="220"
          y2="0"
          stroke={variant === 'dark' ? 'rgba(56, 189, 248, 0.5)' : 'rgba(37, 99, 235, 0.3)'}
          strokeWidth="2"
          strokeLinecap="round"
          className="fatehan-beam-x"
        />
      </svg>
    </div>
  );
};

/** unDraw-inspired clean technical vector of an articulated 4-DOF blue robotic arm */
export const RoboticArmVector: React.FC<{
  variant?: 'light' | 'dark';
  className?: string;
}> = ({ variant = 'light', className = '' }) => {
  const isDark = variant === 'dark';
  const primary = isDark ? '#38BDF8' : '#2563EB';
  const secondary = isDark ? '#93C5FD' : '#1D4ED8';
  const surface = isDark ? '#1E3A8A' : '#DBEAFE';
  const highlight = '#F59E0B';

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 240 240"
      fill="none"
      className={`pointer-events-none select-none ${className}`}
    >
      {/* Base pedestal */}
      <rect x="42" y="196" width="112" height="18" rx="9" fill={surface} stroke={primary} strokeWidth="2.5" />
      <rect x="64" y="176" width="68" height="22" rx="8" fill={primary} fillOpacity={isDark ? '0.32' : '0.16'} stroke={primary} strokeWidth="2.5" />
      <circle cx="98" cy="186" r="5" fill={highlight} />

      {/* Animated upper arm & forearm assembly */}
      <g className="fatehan-servo-sway" style={{ transformOrigin: '98px 178px' }}>
        {/* Lower arm link */}
        <path
          d="M90 176 L62 112 L78 105 L106 170 Z"
          fill={surface}
          stroke={secondary}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Hydraulic / cable accent */}
        <path
          d="M84 166 C66 150 58 134 64 118"
          stroke={highlight}
          strokeWidth="2"
          strokeDasharray="4 4"
          strokeLinecap="round"
        />

        {/* Elbow servo joint */}
        <circle cx="70" cy="108" r="15" fill={isDark ? '#0F2557' : '#FFFFFF'} stroke={primary} strokeWidth="2.5" />
        <circle cx="70" cy="108" r="6" fill={primary} />

        {/* Forearm link */}
        <g className="fatehan-forearm-sway" style={{ transformOrigin: '70px 108px' }}>
          <path
            d="M78 100 L152 62 L160 76 L86 114 Z"
            fill={primary}
            fillOpacity={isDark ? '0.35' : '0.16'}
            stroke={primary}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Wrist servo joint */}
          <circle cx="156" cy="69" r="11" fill={isDark ? '#0F2557' : '#FFFFFF'} stroke={secondary} strokeWidth="2.5" />
          <circle cx="156" cy="69" r="4" fill={highlight} />

          {/* Precision Gripper Claws */}
          <path
            d="M166 64 L188 50 L204 60"
            stroke={secondary}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M165 74 L186 90 L204 82"
            stroke={secondary}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Ultrasonic / laser precision wave */}
          <path
            d="M210 62 C216 67 216 75 210 80"
            stroke={highlight}
            strokeWidth="2.2"
            strokeLinecap="round"
            className="fatehan-sensor-pulse"
          />
          <path
            d="M218 56 C227 65 227 77 218 86"
            stroke={primary}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeOpacity="0.7"
            className="fatehan-sensor-pulse"
          />
        </g>
      </g>

      {/* Precision Base Joint */}
      <circle cx="98" cy="178" r="11" fill={isDark ? '#0F2557' : '#FFFFFF'} stroke={primary} strokeWidth="2.5" />
      <circle cx="98" cy="178" r="4.5" fill={primary} />
    </svg>
  );
};

/** Clean unDraw-style autonomous wheeled educational robotics rover with ultrasonic wave */
export const AutonomousRoverVector: React.FC<{
  variant?: 'light' | 'dark';
  className?: string;
}> = ({ variant = 'dark', className = '' }) => {
  const isDark = variant === 'dark';
  const stroke = isDark ? '#38BDF8' : '#2563EB';
  const fillSoft = isDark ? 'rgba(56, 189, 248, 0.16)' : 'rgba(37, 99, 235, 0.12)';
  const accent = '#FBBF24';

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 220 140"
      fill="none"
      className={`pointer-events-none select-none ${className}`}
    >
      {/* Ground track */}
      <line
        x1="18"
        y1="118"
        x2="202"
        y2="118"
        stroke={stroke}
        strokeOpacity="0.35"
        strokeWidth="2"
        strokeDasharray="6 6"
      />

      {/* Floating gentle chassis */}
      <g className="fatehan-float-gentle">
        {/* Antenna */}
        <line x1="88" y1="42" x2="88" y2="20" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="88" cy="17" r="4.5" fill={accent} className="fatehan-sensor-pulse" />

        {/* Ultrasonic head */}
        <rect x="116" y="34" width="38" height="22" rx="7" fill={fillSoft} stroke={stroke} strokeWidth="2.2" />
        <circle cx="128" cy="45" r="5" fill={isDark ? '#0B2255' : '#FFFFFF'} stroke={stroke} strokeWidth="2" />
        <circle cx="143" cy="45" r="5" fill={isDark ? '#0B2255' : '#FFFFFF'} stroke={stroke} strokeWidth="2" />
        <circle cx="128" cy="45" r="1.8" fill={accent} />
        <circle cx="143" cy="45" r="1.8" fill={accent} />

        {/* Sensor ping arcs */}
        <path
          d="M162 39 C167 43 167 49 162 53"
          stroke={accent}
          strokeWidth="2"
          strokeLinecap="round"
          className="fatehan-sensor-pulse"
        />
        <path
          d="M170 33 C178 40 178 52 170 59"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeOpacity="0.7"
          className="fatehan-sensor-pulse"
        />

        {/* Neck */}
        <rect x="129" y="56" width="12" height="10" rx="2" fill={stroke} fillOpacity="0.45" />

        {/* Main Microcontroller Body */}
        <rect x="52" y="64" width="114" height="36" rx="12" fill={fillSoft} stroke={stroke} strokeWidth="2.4" />
        {/* Chip details on chassis */}
        <rect x="66" y="74" width="26" height="16" rx="4" fill={isDark ? '#0F2A6B' : '#EFF6FF'} stroke={stroke} strokeWidth="1.6" />
        <line x1="102" y1="78" x2="148" y2="78" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.65" />
        <line x1="102" y1="86" x2="136" y2="86" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.85" />

        {/* Left Wheel */}
        <g className="fatehan-wheel-spin" style={{ transformOrigin: '76px 104px' }}>
          <circle cx="76" cy="104" r="14" fill={isDark ? '#0B2255' : '#FFFFFF'} stroke={stroke} strokeWidth="2.6" />
          <circle cx="76" cy="104" r="5" fill={accent} />
          <line x1="76" y1="90" x2="76" y2="118" stroke={stroke} strokeWidth="1.4" strokeOpacity="0.55" />
          <line x1="62" y1="104" x2="90" y2="104" stroke={stroke} strokeWidth="1.4" strokeOpacity="0.55" />
        </g>

        {/* Right Wheel */}
        <g className="fatehan-wheel-spin" style={{ transformOrigin: '142px 104px' }}>
          <circle cx="142" cy="104" r="14" fill={isDark ? '#0B2255' : '#FFFFFF'} stroke={stroke} strokeWidth="2.6" />
          <circle cx="142" cy="104" r="5" fill={accent} />
          <line x1="142" y1="90" x2="142" y2="118" stroke={stroke} strokeWidth="1.4" strokeOpacity="0.55" />
          <line x1="128" y1="104" x2="156" y2="104" stroke={stroke} strokeWidth="1.4" strokeOpacity="0.55" />
        </g>
      </g>
    </svg>
  );
};

/** Concentric CAD orbital servo halo behind the central Fatehan Hero emblem */
export const HeroEmblemOrbitalHalo: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 260 260"
    fill="none"
    className={`pointer-events-none select-none absolute inset-0 w-full h-full ${className}`}
  >
    {/* Outer slow-rotating precision dashed CAD ring */}
    <g className="fatehan-orbit-slow" style={{ transformOrigin: '130px 130px' }}>
      <circle
        cx="130"
        cy="130"
        r="116"
        stroke="rgba(37, 99, 235, 0.28)"
        strokeWidth="1.5"
        strokeDasharray="10 8"
      />
      <circle cx="130" cy="14" r="4.5" fill="#2563EB" />
      <circle cx="246" cy="130" r="3.5" fill="#0EA5E9" />
      <circle cx="130" cy="246" r="4" fill="#F59E0B" />
    </g>

    {/* Counter-rotating inner precision ring */}
    <g className="fatehan-orbit-reverse" style={{ transformOrigin: '130px 130px' }}>
      <circle
        cx="130"
        cy="130"
        r="96"
        stroke="rgba(14, 165, 233, 0.25)"
        strokeWidth="1.25"
        strokeDasharray="4 10"
      />
      <path d="M130 30 L130 38" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M230 130 L222 130" stroke="#0EA5E9" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M130 230 L130 222" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M30 130 L38 130" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  </svg>
);

/** Architectural blue PCB circuit divider with central microchip node between sections */
export const RoboticsCircuitDivider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    aria-hidden="true"
    className={`pointer-events-none select-none w-full flex items-center justify-center py-1 ${className}`}
  >
    <div className="flex-1 h-[1.5px] bg-gradient-to-l from-blue-500/65 via-sky-400/45 to-transparent rounded-full" />
    <div className="mx-3 flex items-center gap-2 text-blue-600/90">
      <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
      <svg viewBox="0 0 36 24" className="w-9 h-6" fill="none">
        <rect
          x="10"
          y="4"
          width="16"
          height="16"
          rx="4"
          fill="#DBEAFE"
          stroke="#1D4ED8"
          strokeWidth="1.6"
        />
        <rect x="14.5" y="8.5" width="7" height="7" rx="1.5" fill="#2563EB" />
        <path
          d="M4 9 H10 M4 15 H10 M26 9 H32 M26 15 H32 M15 1 V4 M21 1 V4 M15 20 V23 M21 20 V23"
          stroke="#0284C7"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
    </div>
    <div className="flex-1 h-[1.5px] bg-gradient-to-r from-blue-500/65 via-sky-400/45 to-transparent rounded-full" />
  </div>
);

/** Spline/unDraw-inspired 3D-shaded friendly robotics academy mascot SVG (GPU float + LED blink) */
export const CuteBotMascotVector: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 120 120"
    fill="none"
    className={`pointer-events-none select-none ${className}`}
  >
    <defs>
      <linearGradient id="botBodyGrad" x1="20" y1="20" x2="100" y2="105" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#60A5FA" />
        <stop offset="52%" stopColor="#2563EB" />
        <stop offset="100%" stopColor="#1E3A8A" />
      </linearGradient>
      <linearGradient id="botVisorGrad" x1="30" y1="42" x2="90" y2="74" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0F172A" />
        <stop offset="100%" stopColor="#1E293B" />
      </linearGradient>
    </defs>

    {/* Soft hover shadow */}
    <ellipse cx="60" cy="109" rx="28" ry="5" fill="#1D4ED8" fillOpacity="0.2" />

    <g className="fatehan-float-gentle">
      {/* Antenna */}
      <line x1="60" y1="26" x2="60" y2="13" stroke="#1D4ED8" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="60" cy="11" r="5.5" fill="#FBBF24" stroke="#FFFFFF" strokeWidth="2" className="fatehan-sensor-pulse" />

      {/* Side ear servos */}
      <rect x="14" y="47" width="10" height="22" rx="5" fill="#0EA5E9" stroke="#FFFFFF" strokeWidth="2" />
      <rect x="96" y="47" width="10" height="22" rx="5" fill="#0EA5E9" stroke="#FFFFFF" strokeWidth="2" />

      {/* 3D-shaded rounded head */}
      <rect x="22" y="26" width="76" height="58" rx="24" fill="url(#botBodyGrad)" stroke="#BFDBFE" strokeWidth="2.5" />
      {/* Glossy top highlight */}
      <path d="M36 33 H84" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="4" strokeLinecap="round" />

      {/* Visor screen */}
      <rect x="31" y="40" width="58" height="32" rx="14" fill="url(#botVisorGrad)" stroke="#38BDF8" strokeWidth="1.8" />

      {/* Glowing cyan LED eyes + happy smile */}
      <g className="fatehan-eye-blink" style={{ transformOrigin: '60px 54px' }}>
        <circle cx="47" cy="54" r="5" fill="#38BDF8" />
        <circle cx="48.5" cy="52.5" r="1.6" fill="#FFFFFF" />
        <circle cx="73" cy="54" r="5" fill="#38BDF8" />
        <circle cx="74.5" cy="52.5" r="1.6" fill="#FFFFFF" />
      </g>
      <path d="M53 63 C56.5 66.5 63.5 66.5 67 63" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" />

      {/* Mini torso & glowing blue core */}
      <rect x="40" y="84" width="40" height="16" rx="8" fill="#1D4ED8" stroke="#93C5FD" strokeWidth="2" />
      <circle cx="60" cy="92" r="3.5" fill="#38BDF8" className="fatehan-sensor-pulse" />
    </g>
  </svg>
);
