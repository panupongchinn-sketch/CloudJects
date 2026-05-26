import React from "react";
import { motion } from "framer-motion";

function CloudJectLoadingLogo() {
  return (
    <motion.svg
      width="172"
      height="172"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{
        opacity: 1,
        scale: [1, 1.025, 1],
        y: [0, -3, 0],
      }}
      transition={{
        opacity: { duration: 0.65, ease: "easeOut" },
        scale: {
          duration: 2.1,
          repeat: Infinity,
          repeatType: "loop",
          ease: "easeInOut",
        },
        y: {
          duration: 2.1,
          repeat: Infinity,
          repeatType: "loop",
          ease: "easeInOut",
        },
      }}
      style={{ transformOrigin: "50px 50px" }}
    >
      <defs>
        <linearGradient id="cloudBlue" x1="8" y1="18" x2="94" y2="78" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1A7CFF" />
          <stop offset="0.55" stopColor="#075FE8" />
          <stop offset="1" stopColor="#0048C8" />
        </linearGradient>

        <linearGradient id="cloudDark" x1="44" y1="18" x2="88" y2="78" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0B62E8" />
          <stop offset="1" stopColor="#003EA8" />
        </linearGradient>

        <linearGradient id="softSweep" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="white" stopOpacity="0" />
          <stop offset="0.5" stopColor="white" stopOpacity="0.52" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>

        <filter id="premiumShadow" x="-24%" y="-24%" width="148%" height="156%">
          <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#0347B8" floodOpacity="0.16" />
        </filter>

        <clipPath id="logoClip">
          <path d="M17.5 72.5C8.4 72.5 1 65.1 1 56C1 48.1 6.7 41.4 14.2 40C17.7 24.5 31.5 13 48 13C59.9 13 70.4 19 76.6 28.2C89.2 29.4 99 40 99 52.8C99 66.4 88 77.5 74.3 77.5H17.5Z" />
          <path d="M18.2 86C8.2 86 0 77.9 0 67.8C0 59.1 6.2 51.7 14.5 50C18.2 42.7 25.8 38 34.4 38C43.9 38 52.3 43.9 55.5 52.6C67.4 52.8 77 62.6 77 74.6C77 80.9 71.9 86 65.6 86H18.2Z" />
        </clipPath>
      </defs>

      <motion.g
        filter="url(#premiumShadow)"
        animate={{ opacity: [0.92, 1, 0.92] }}
        transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
      >
        <path
          d="M17.5 72.5C8.4 72.5 1 65.1 1 56C1 48.1 6.7 41.4 14.2 40C17.7 24.5 31.5 13 48 13C59.9 13 70.4 19 76.6 28.2C89.2 29.4 99 40 99 52.8C99 66.4 88 77.5 74.3 77.5H17.5Z"
          fill="url(#cloudBlue)"
        />

        <path
          d="M56 77.5H74.3C88 77.5 99 66.4 99 52.8C99 40 89.2 29.4 76.6 28.2C70.4 19 59.9 13 48 13C42.3 13 36.9 14.4 32.2 16.8C48.3 20.2 60.3 34.5 60.3 51.5C60.3 61 56.6 69.7 50.5 76.1C52.2 77 54 77.5 56 77.5Z"
          fill="url(#cloudDark)"
          opacity="0.72"
        />

        <motion.path
          d="M18.2 86C8.2 86 0 77.9 0 67.8C0 59.1 6.2 51.7 14.5 50C18.2 42.7 25.8 38 34.4 38C43.9 38 52.3 43.9 55.5 52.6C67.4 52.8 77 62.6 77 74.6C77 80.9 71.9 86 65.6 86H18.2Z"
          fill="white"
          animate={{ y: [0, -1.4, 0] }}
          transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.g>

      <g clipPath="url(#logoClip)">
        <motion.rect
          x="-56"
          y="24"
          width="40"
          height="64"
          rx="18"
          fill="url(#softSweep)"
          transform="rotate(-24 0 0)"
          animate={{ x: [-56, 146], opacity: [0, 0.78, 0] }}
          transition={{
            duration: 1.55,
            repeat: Infinity,
            repeatDelay: 0.55,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      </g>
    </motion.svg>
  );
}

export function CloudJectLoading() {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-white">
      <CloudJectLoadingLogo />
    </div>
  );
}

export default function App() {
  return <CloudJectLoading />;
}
