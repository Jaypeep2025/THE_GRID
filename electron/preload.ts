import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('kioskAPI', {
  send: (channel: string, data: any) => {
    // secure IPC bridge placeholder
  }
});
