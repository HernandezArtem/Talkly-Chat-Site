export const windowStyles = `
  .zm-window {
    position: fixed;
    bottom: calc(24px + var(--zm-bubble-size) + 16px);
    width: var(--zm-window-width);
    height: var(--zm-window-height);
    max-height: calc(100vh - 120px);
    background: var(--zm-bg);
    border-radius: var(--zm-radius);
    border: 1px solid var(--zm-border);
    box-shadow: var(--zm-shadow);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    opacity: 0;
    transform: translateY(16px) scale(0.96);
    transition: opacity 0.28s ease, transform 0.28s cubic-bezier(0.34, 1.2, 0.64, 1);
    pointer-events: none;
    z-index: 2147483646;
  }

  .zm-window.open {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
  }

  .zm-window.bottom-right {
    right: 24px;
  }

  .zm-window.bottom-left {
    left: 24px;
  }

  .zm-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 20px;
    background: var(--zm-gradient);
    color: white;
    flex-shrink: 0;
    position: relative;
  }

  .zm-header::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 60%);
    pointer-events: none;
  }

  .zm-header-info {
    display: flex;
    align-items: center;
    gap: 12px;
    position: relative;
    z-index: 1;
  }

  .zm-header-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .zm-header-avatar img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }

  .zm-header-text h3 {
    font-size: 15px;
    font-weight: 600;
    margin: 0;
    line-height: 1.3;
    letter-spacing: -0.01em;
  }

  .zm-header-text p {
    font-size: 12px;
    opacity: 0.85;
    margin: 2px 0 0;
    line-height: 1.3;
  }

  .zm-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    position: relative;
    z-index: 1;
    flex-shrink: 0;
  }

  .zm-lang-switch {
    display: flex;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    padding: 2px;
    gap: 2px;
  }

  .zm-lang-btn {
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.85);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    padding: 5px 8px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
    font-family: var(--zm-font);
    line-height: 1;
  }

  .zm-lang-btn:hover {
    color: white;
  }

  .zm-lang-btn.active {
    background: rgba(255, 255, 255, 0.95);
    color: var(--zm-primary);
  }

  .zm-close {
    background: rgba(255, 255, 255, 0.15);
    border: none;
    color: white;
    cursor: pointer;
    padding: 6px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease;
    position: relative;
    z-index: 1;
  }

  .zm-close:hover {
    background: rgba(255, 255, 255, 0.25);
  }

  .zm-messages {
    flex: 1;
    overflow-y: auto;
    padding: 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    background: linear-gradient(180deg, var(--zm-bg-secondary) 0%, var(--zm-bg) 100%);
  }

  .zm-messages::-webkit-scrollbar {
    width: 5px;
  }

  .zm-messages::-webkit-scrollbar-thumb {
    background: var(--zm-border);
    border-radius: 3px;
  }

  .zm-messages::-webkit-scrollbar-thumb:hover {
    background: var(--zm-text-muted);
  }
`;
