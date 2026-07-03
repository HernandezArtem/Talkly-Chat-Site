export const messageStyles = `
  .zm-message {
    display: flex;
    gap: 8px;
    max-width: 88%;
    flex-direction: column;
    animation: zm-msg-in 0.3s ease;
  }

  @keyframes zm-msg-in {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .zm-message.user {
    align-self: flex-end;
  }

  .zm-message-bubble {
    padding: 11px 15px;
    border-radius: var(--zm-radius-sm);
    word-break: break-word;
    font-size: 14px;
    line-height: 1.55;
  }

  .zm-message.assistant .zm-message-bubble {
    background: var(--zm-bg-elevated);
    color: var(--zm-text);
    border: 1px solid var(--zm-border);
    border-bottom-left-radius: 4px;
    min-height: 41px;
    box-sizing: border-box;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }

  .zm-message.user .zm-message-bubble {
    background: var(--zm-gradient);
    color: white;
    border-bottom-right-radius: 4px;
    box-shadow: 0 2px 8px rgba(124, 58, 237, 0.25);
  }

  .zm-message-meta {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 6px;
  }

  .zm-message-meta:empty {
    display: none;
  }

  .zm-meta-label {
    display: block;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--zm-text-muted);
    margin-bottom: 4px;
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
    padding: 9px 12px;
    border-radius: var(--zm-radius-sm);
    background: var(--zm-bg-elevated);
    border: 1px solid var(--zm-border);
    color: var(--zm-text);
    text-decoration: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
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
    color: var(--zm-text-muted);
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
    gap: 7px;
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
    background: var(--zm-bg-elevated);
    color: var(--zm-text);
    border-radius: 999px;
    padding: 7px 13px;
    font-size: 12px;
    line-height: 1.2;
    cursor: pointer;
    transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease, transform 0.1s ease;
  }

  .zm-chip-button:hover,
  .zm-action-button:hover,
  .zm-feedback-button:hover,
  .zm-source-card:hover {
    border-color: var(--zm-primary);
    box-shadow: 0 1px 4px rgba(124, 58, 237, 0.1);
  }

  .zm-chip-button:active,
  .zm-action-button:active {
    transform: scale(0.97);
  }

  .zm-action-button {
    background: var(--zm-gradient);
    border-color: transparent;
    color: white;
  }

  .zm-action-button:hover {
    opacity: 0.92;
    border-color: transparent;
  }

  .zm-feedback-button.active {
    background: var(--zm-primary-light);
    border-color: var(--zm-primary);
    color: var(--zm-primary);
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
    border-radius: 4px;
    font-size: 13px;
    font-family: "SF Mono", Consolas, monospace;
  }

  .zm-message-bubble pre {
    background: #1e1e2e;
    color: #cdd6f4;
    padding: 12px;
    border-radius: var(--zm-radius-sm);
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
    text-underline-offset: 2px;
  }

  .zm-message.user .zm-message-bubble a {
    color: white;
  }

  .zm-typing {
    display: flex;
    align-items: center;
    gap: 5px;
    height: 21px;
    padding: 0 2px;
  }

  .zm-typing span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--zm-primary);
    opacity: 0.4;
    animation: zm-bounce 1.4s ease-in-out infinite;
  }

  .zm-typing span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .zm-typing span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes zm-bounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-5px); opacity: 1; }
  }

  .zm-error {
    text-align: center;
    padding: 10px 14px;
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
    border-radius: var(--zm-radius-sm);
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
