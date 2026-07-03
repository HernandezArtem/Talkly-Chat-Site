export const baseStyles = `
  :host {
    all: initial;
    display: block;
    position: fixed;
    z-index: 2147483647;
    font-family: var(--zm-font);
    color: var(--zm-text);
    font-size: 14px;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .talkly-bubble,
  .zm-bubble {
    position: fixed;
    bottom: 24px;
    width: var(--zm-bubble-size);
    height: var(--zm-bubble-size);
    border-radius: 50%;
    background: var(--zm-gradient);
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--zm-shadow-sm), 0 0 0 4px rgba(124, 58, 237, 0.15);
    transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
    z-index: 2147483647;
  }

  .talkly-bubble:hover,
  .zm-bubble:hover {
    transform: scale(1.08);
    box-shadow: var(--zm-shadow-sm), 0 0 0 6px rgba(124, 58, 237, 0.2);
  }

  .talkly-bubble.bottom-right,
  .zm-bubble.bottom-right {
    right: 24px;
  }

  .talkly-bubble.bottom-left,
  .zm-bubble.bottom-left {
    left: 24px;
  }
`;
