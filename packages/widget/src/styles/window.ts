export const windowStyles = `
  .zm-window {
    position: fixed;
    bottom: 90px;
    width: var(--zm-window-width);
    height: var(--zm-window-height);
    max-height: calc(100vh - 120px);
    background: var(--zm-bg);
    border-radius: var(--zm-radius);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    opacity: 0;
    transform: translateY(10px) scale(0.95);
    transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: none;
    z-index: 2147483646;
  }

  .zm-window.open {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
  }

  .zm-window.bottom-right {
    right: 20px;
  }

  .zm-window.bottom-left {
    left: 20px;
  }

  .zm-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    background: var(--zm-primary);
    color: white;
    flex-shrink: 0;
  }

  .zm-header-info {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .zm-header-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
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
  }

  .zm-header-text p {
    font-size: 12px;
    opacity: 0.8;
    margin: 0;
    line-height: 1.3;
  }

  .zm-close {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.8;
    transition: opacity 0.15s ease;
  }

  .zm-close:hover {
    opacity: 1;
  }

  .zm-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .zm-messages::-webkit-scrollbar {
    width: 4px;
  }

  .zm-messages::-webkit-scrollbar-thumb {
    background: var(--zm-border);
    border-radius: 2px;
  }
`;
