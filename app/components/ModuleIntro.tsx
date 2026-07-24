"use client";

import { useState } from "react";

interface ModuleIntroProps {
  title: string;
  what: string;
  how: string[];
  tip?: string;
}

export default function ModuleIntro({ title, what, how, tip }: ModuleIntroProps) {
  const [open, setOpen] = useState(false);

  return (
    <div style={styles.wrap}>
      <button style={styles.header} onClick={() => setOpen(!open)} aria-expanded={open}>
        <span style={styles.summary}>
          <span style={styles.icon}>ℹ️</span>
          <span style={styles.title}>{title}</span>
          <span style={styles.colon}>：</span>
          <span style={styles.what}>{what}</span>
        </span>
        <span style={{ ...styles.arrow, transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
      </button>
      <div
        style={{
          ...styles.body,
          maxHeight: open ? 300 : 0,
          opacity: open ? 1 : 0,
          paddingTop: open ? 12 : 0,
          paddingBottom: open ? 12 : 0,
        }}
      >
        <ol style={styles.steps}>
          {how.map((step, i) => (
            <li key={i} style={styles.step}>
              <span style={styles.num}>{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        {tip && <p style={styles.tip}>💡 {tip}</p>}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    background: "rgba(212,175,55,.06)",
    border: "1px solid rgba(212,175,55,.15)",
    borderRadius: 10,
    marginBottom: 16,
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "10px 14px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    textAlign: "left" as const,
    gap: 8,
  },
  summary: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap" as const,
    gap: 4,
    minWidth: 0,
  },
  icon: {
    fontSize: 14,
    flexShrink: 0,
  },
  title: {
    color: "#D4AF37",
    fontWeight: 600,
    fontSize: 14,
    flexShrink: 0,
  },
  colon: {
    color: "#D4AF37",
    fontSize: 14,
  },
  what: {
    color: "#ECE7D8",
    fontSize: 13,
    opacity: 0.85,
  },
  arrow: {
    color: "#D4AF37",
    fontSize: 14,
    transition: "transform .25s ease",
    flexShrink: 0,
  },
  body: {
    overflow: "hidden",
    transition: "max-height .3s ease, opacity .25s ease, padding .25s ease",
    paddingLeft: 14,
    paddingRight: 14,
  },
  steps: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
  },
  step: {
    display: "flex",
    alignItems: "flex-start",
    gap: 6,
    color: "#ECE7D8",
    fontSize: 13,
    lineHeight: 1.5,
  },
  num: {
    color: "#D4AF37",
    fontWeight: 700,
    flexShrink: 0,
  },
  tip: {
    marginTop: 10,
    marginBottom: 0,
    fontSize: 12,
    color: "rgba(212,175,55,.8)",
    opacity: 0.9,
  },
};
