import { beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Reset storage between tests
beforeEach(() => {
  sessionStorage.removeItem('arc-llm-settings');
  localStorage.removeItem('arc-llm-settings'); // legacy key (migration)
});
