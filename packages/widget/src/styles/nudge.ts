export const nudgeStyles = `
  .zm-nudge {
    position: fixed;
    bottom: calc(24px + var(--zm-bubble-size) + 16px);
    max-width: 260px;
    min-height: 48px;
    padding: 13px 36px 13px 16px;
    background: var(--zm-bg-elevated);
    color: var(--zm-text);
    border: 1px solid var(--zm-border);
    border-radius: var(--zm-radius-sm);
    box-shadow: var(--zm-shadow-sm);
    font-size: 14px;
    line-height: 1.45;
    cursor: pointer;
    animation: zm-nudge-in 0.35s cubic-bezier(0.34, 1.2, 0.64, 1);
    z-index: 2147483646;
  }

  .zm-nudge.bottom-right {
    right: 24px;
  }

  .zm-nudge.bottom-left {
    left: 24px;
  }

  .zm-nudge::after {
    content: "";
    position: absolute;
    bottom: -10px;
    width: 0;
    height: 0;
    border: 6px solid transparent;
  }

  .zm-nudge.bottom-right::after {
    right: 28px;
    border-top-color: var(--zm-bg-elevated);
    filter: drop-shadow(0 2px 1px var(--zm-border));
  }

  .zm-nudge.bottom-left::after {
    left: 28px;
    border-top-color: var(--zm-bg-elevated);
    filter: drop-shadow(0 2px 1px var(--zm-border));
  }

  .zm-nudge p {
    margin: 0;
  }

  .zm-nudge-close {
    position: absolute;
    top: 6px;
    right: 8px;
    background: none;
    border: none;
    font-size: 16px;
    color: var(--zm-text-muted);
    cursor: pointer;
    padding: 2px 4px;
    line-height: 1;
    border-radius: 4px;
    transition: color 0.15s ease, background 0.15s ease;
  }

  .zm-nudge-close:hover {
    color: var(--zm-text);
    background: var(--zm-bg-secondary);
  }

  @keyframes zm-nudge-in {
    from { opacity: 0; transform: translateY(8px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @media (max-width: 480px) {
    .zm-nudge {
      bottom: calc(24px + var(--zm-bubble-size) + 16px);
      max-width: min(300px, calc(100vw - 48px));
    }

    .zm-nudge.bottom-right {
      right: 24px;
    }

    .zm-nudge.bottom-left {
      left: 24px;
    }

    .zm-window {
      width: 100vw;
      height: 100vh;
      max-height: 100vh;
      bottom: 0;
      right: 0;
      left: 0;
      border-radius: 0;
      border: none;
    }

    .chattr-bubble,
    .zm-bubble {
      bottom: 20px;
    }

    .chattr-bubble.bottom-right,
    .zm-bubble.bottom-right {
      right: 20px;
    }
  }
`;
