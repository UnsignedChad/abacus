// Copyright (C) 2026 Charles Kennedy
// All rights reserved.

import React from "react";
import {AbsoluteFill, useCurrentFrame} from "remotion";
import {fonts} from "../fonts";
import {palette} from "../theme";

// Placeholder: replaced by the real cathedral scene.
export const CathedralScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: palette.soot,
        color: palette.gold,
        fontFamily: fonts.cinzel,
        fontSize: 90,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      CATHEDRAL {frame}
    </AbsoluteFill>
  );
};
