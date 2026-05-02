export const nudgeStyles = `
  /* Proactive nudge bubble */
  .zm-nudge {
    position: fixed;
    bottom: calc(20px + var(--zm-bubble-size) + 12px);
    max-width: 240px;
    min-height: 48px;
    padding: 12px 32px 12px 16px;
    background: white;
    color: var(--zm-text);
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-size: 14px;
    line-height: 1.4;
    cursor: pointer;
    animation: zm-nudge-in 0.3s ease;
    z-index: 2147483646;
  }

  .zm-nudge.bottom-right {
    right: 20px;
  }

  .zm-nudge.bottom-left {
    left: 20px;
  }

  .zm-nudge::after {
    content: "";
    position: absolute;
    bottom: -12px;
    width: 0;
    height: 0;
    border: 6px solid transparent;
  }

  .zm-nudge.bottom-right::after {
    right: 24px;
    border-top-color: white;
  }

  .zm-nudge.bottom-left::after {
    left: 24px;
    border-top-color: white;
  }

  .zm-nudge p {
    margin: 0;
  }

  .zm-nudge-close {
    position: absolute;
    top: 4px;
    right: 6px;
    background: none;
    border: none;
    font-size: 16px;
    color: #9ca3af;
    cursor: pointer;
    padding: 2px 4px;
    line-height: 1;
  }

  .zm-nudge-close:hover {
    color: var(--zm-text);
  }

  @keyframes zm-nudge-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 480px) {
    .zm-nudge {
      bottom: calc(20px + var(--zm-bubble-size) + 12px);
      max-width: min(280px, calc(100vw - 32px));
    }

    .zm-nudge.bottom-right {
      right: 20px;
    }

    .zm-nudge.bottom-left {
      left: 20px;
    }

    .zm-nudge.bottom-right::after {
      right: 24px;
    }

    .zm-nudge.bottom-left::after {
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
    }
  }
`;
