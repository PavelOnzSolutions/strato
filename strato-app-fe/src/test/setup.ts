import '@testing-library/jest-dom/vitest';

// jsdom does not implement ResizeObserver; Radix UI (scroll area / dropdown content)
// references it when mounting. Provide a no-op stub so tests don't crash.
if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
}
