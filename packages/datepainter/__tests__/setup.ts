import { beforeEach, afterEach, vi } from "vitest";

// Mock localStorage
const localStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
	get length() {
		return (this as any).store?.size ?? 0;
	},
	key: vi.fn(),
	store: new Map(),
};

// Setup localStorage mock
beforeEach(() => {
	// Clear mock calls
	localStorageMock.getItem.mockClear();
	localStorageMock.setItem.mockClear();
	localStorageMock.removeItem.mockClear();
	localStorageMock.clear.mockClear();
	localStorageMock.store.clear();

	// Setup mock implementations
	localStorageMock.getItem.mockImplementation((key: string) => {
		return localStorageMock.store.get(key) ?? null;
	});

	localStorageMock.setItem.mockImplementation((key: string, value: string) => {
		localStorageMock.store.set(key, value);
	});

	localStorageMock.removeItem.mockImplementation((key: string) => {
		localStorageMock.store.delete(key);
	});

	localStorageMock.clear.mockImplementation(() => {
		localStorageMock.store.clear();
	});

	localStorageMock.key.mockImplementation((index: number) => {
		const keys = Array.from(localStorageMock.store.keys());
		return keys[index] ?? null;
	});

	// Mock localStorage on global object
	Object.defineProperty(global, "localStorage", {
		value: localStorageMock,
		writable: true,
	});
});

// Cleanup after each test
afterEach(() => {
	vi.clearAllMocks();
});
