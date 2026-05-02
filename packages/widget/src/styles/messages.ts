export const messageStyles = `
  .zm-message {
    display: flex;
    gap: 8px;
    max-width: 85%;
    flex-direction: column;
  }

  .zm-message.user {
    align-self: flex-end;
  }

  .zm-message-bubble {
    padding: 10px 14px;
    border-radius: 12px;
    word-break: break-word;
  }

  .zm-message.assistant .zm-message-bubble {
    background: var(--zm-bg-secondary);
    color: var(--zm-text);
    border-bottom-left-radius: 4px;
    min-height: 41px;
    box-sizing: border-box;
  }

  .zm-message.user .zm-message-bubble {
    background: var(--zm-primary);
    color: white;
    border-bottom-right-radius: 4px;
  }

  .zm-message-meta {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
  }

  .zm-message-meta:empty {
    display: none;
  }

  .zm-meta-label {
    display: block;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #6b7280;
    margin-bottom: 6px;
  }

  .zm-source-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .zm-source-card {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: 10px;
    background: #fbfcfd;
    border: 1px solid var(--zm-border);
    color: var(--zm-text);
    text-decoration: none;
  }

  .zm-source-card strong {
    font-size: 12px;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .zm-source-card span {
    font-size: 11px;
    color: #6b7280;
    word-break: break-word;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .zm-source-toggle {
    align-self: flex-start;
    border: none;
    background: none;
    color: var(--zm-primary);
    padding: 0;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .zm-chip-group,
  .zm-feedback {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .zm-chip-group .zm-meta-label,
  .zm-feedback .zm-meta-label {
    width: 100%;
    margin-bottom: 0;
  }

  .zm-chip-button,
  .zm-action-button,
  .zm-feedback-button {
    border: 1px solid var(--zm-border);
    background: white;
    color: var(--zm-text);
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 12px;
    line-height: 1.2;
    cursor: pointer;
    transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
  }

  .zm-chip-button:hover,
  .zm-action-button:hover,
  .zm-feedback-button:hover,
  .zm-source-card:hover {
    border-color: var(--zm-primary);
  }

  .zm-action-button {
    background: var(--zm-primary);
    border-color: var(--zm-primary);
    color: white;
  }

  .zm-action-button:hover {
    background: var(--zm-primary-hover);
    border-color: var(--zm-primary-hover);
  }

  .zm-feedback-button.active {
    background: var(--zm-bg-secondary);
    border-color: var(--zm-primary);
    color: var(--zm-text);
  }

  .zm-message-bubble p {
    margin: 0 0 8px 0;
  }

  .zm-message-bubble p:last-child {
    margin-bottom: 0;
  }

  .zm-message-bubble code {
    background: rgba(0, 0, 0, 0.06);
    padding: 2px 5px;
    border-radius: 3px;
    font-size: 13px;
    font-family: "SF Mono", Consolas, monospace;
  }

  .zm-message-bubble pre {
    background: #1e1e2e;
    color: #cdd6f4;
    padding: 12px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 8px 0;
    font-size: 13px;
  }

  .zm-message-bubble pre code {
    background: none;
    padding: 0;
    color: inherit;
  }

  .zm-message-bubble ul, .zm-message-bubble ol {
    padding-left: 20px;
    margin: 4px 0;
  }

  .zm-message-bubble a {
    color: var(--zm-primary);
    text-decoration: underline;
  }

  .zm-message.user .zm-message-bubble a {
    color: white;
  }

  .zm-typing {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 21px;
  }

  .zm-typing span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #9ca3af;
    animation: zm-bounce 1.4s ease-in-out infinite;
  }

  .zm-typing span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .zm-typing span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes zm-bounce {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-4px); }
  }

  .zm-error {
    text-align: center;
    padding: 8px 12px;
    background: #fef2f2;
    color: #dc2626;
    border-radius: 8px;
    font-size: 13px;
  }

  .zm-error button {
    background: none;
    border: none;
    color: #dc2626;
    text-decoration: underline;
    cursor: pointer;
    font-size: 13px;
    padding: 0;
    margin-left: 4px;
  }
`;
