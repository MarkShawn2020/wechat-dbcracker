import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  readKeysToml: (): Promise<string> => ipcRenderer.invoke('read-keys-toml')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      ...electronAPI,
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
        send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args)
      }
    })
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = {
    ...electronAPI,
    ipcRenderer: {
      invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
      send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args)
    }
  }
  // @ts-ignore (define in dts)
  window.api = api
}
