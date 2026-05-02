export const baseStyles = `
  :host {
    all: initial;
    display: block;
    position: fixed;
    z-index: 2147483647;
    font-family: var(--zm-font);
    color: var(--zm-text);
    font-size: 14px;
    line-height: 1.5;
  }

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .chattr-bubble,
  .zm-bubble {
    position: fixed;
    bottom: 20px;
    width: var(--zm-bubble-size);
    height: var(--zm-bubble-size);
    border-radius: 50%;
    background: var(--zm-primary);
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: transform 0.2s ease, background 0.2s ease;
    z-index: 2147483647;
  }

  .chattr-bubble:hover,
  .zm-bubble:hover {
    transform: scale(1.05);
    background: var(--zm-primary-hover);
  }

  .chattr-bubble.bottom-right,
  .zm-bubble.bottom-right {
    right: 20px;
  }

  .chattr-bubble.bottom-left,
  .zm-bubble.bottom-left {
    left: 20px;
  }
`;
