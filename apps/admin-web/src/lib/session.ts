export const SESSION_ACCESS_KEY = "smartpay.admin.access";
export const SESSION_REFRESH_KEY = "smartpay.admin.refresh";

export type TokenPair = {
  access: string;
  refresh: string;
};

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function memoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

function browserSessionStorage(): StorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function createSessionStore(storage: StorageLike = browserSessionStorage() ?? memoryStorage()) {
  return {
    read(): Partial<TokenPair> {
      return {
        access: storage.getItem(SESSION_ACCESS_KEY) ?? undefined,
        refresh: storage.getItem(SESSION_REFRESH_KEY) ?? undefined,
      };
    },
    write(tokens: TokenPair): void {
      storage.setItem(SESSION_ACCESS_KEY, tokens.access);
      storage.setItem(SESSION_REFRESH_KEY, tokens.refresh);
    },
    clear(): void {
      storage.removeItem(SESSION_ACCESS_KEY);
      storage.removeItem(SESSION_REFRESH_KEY);
    },
  };
}

export const sessionStore = createSessionStore();
