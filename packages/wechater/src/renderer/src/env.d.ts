/// <reference types="vite/client" />

interface Window {
  electron: {
    ipcRenderer: {
      invoke(channel: string, ...args: any[]): Promise<any>;
      send(channel: string, ...args: any[]): void;
    };
  };
  api: {
    readKeysToml: () => Promise<string>;
    openDatabase: (dbPath: string, key: string) => Promise<string>;
  };
}
