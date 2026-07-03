export const inputStyles = `
  .zm-input-area {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    padding: 14px 16px;
    border-top: 1px solid var(--zm-border-subtle);
    background: var(--zm-bg-elevated);
    flex-shrink: 0;
  }

  .zm-input {
    flex: 1;
    border: 1px solid var(--zm-border);
    border-radius: var(--zm-radius-sm);
    padding: 11px 15px;
    font-size: 14px;
    font-family: var(--zm-font);
    resize: none;
    outline: none;
    max-height: 120px;
    line-height: 1.45;
    background: var(--zm-bg-secondary);
    color: var(--zm-text);
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  }

  .zm-input:focus {
    border-color: var(--zm-primary);
    background: var(--zm-bg);
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.12);
  }

  .zm-input::placeholder {
    color: var(--zm-text-muted);
  }

  .zm-send {
    width: 42px;
    height: 42px;
    border-radius: var(--zm-radius-sm);
    background: var(--zm-gradient);
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: opacity 0.15s ease, transform 0.1s ease;
    box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
  }

  .zm-send:hover {
    opacity: 0.9;
  }

  .zm-send:active {
    transform: scale(0.95);
  }

  .zm-send:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
  }
`;
