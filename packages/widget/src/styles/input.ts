export const inputStyles = `
  .zm-input-area {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--zm-border);
    background: var(--zm-bg);
    flex-shrink: 0;
  }

  .zm-input {
    flex: 1;
    border: 1px solid var(--zm-border);
    border-radius: 12px;
    padding: 10px 14px;
    font-size: 14px;
    font-family: var(--zm-font);
    resize: none;
    outline: none;
    max-height: 120px;
    line-height: 1.4;
    background: var(--zm-bg);
    color: var(--zm-text);
    transition: border-color 0.15s ease;
  }

  .zm-input:focus {
    border-color: var(--zm-primary);
  }

  .zm-input::placeholder {
    color: #9ca3af;
  }

  .zm-send {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--zm-primary);
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s ease, opacity 0.15s ease;
  }

  .zm-send:hover {
    background: var(--zm-primary-hover);
  }

  .zm-send:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
