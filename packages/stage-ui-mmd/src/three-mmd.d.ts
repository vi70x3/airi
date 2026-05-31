// NOTICE: Workaround for tsdown build chunk hash mismatch in node_modules/@moeru/three-mmd.
// Since the package builds with randomized/hashed declaration filename (e.g. index-DzUC1QSk.d.ts)
// and lacks a stable index.d.ts, we provide fallback type definitions to avoid compile errors.
declare module '@moeru/three-mmd' {
  export type MMD = any
  export const buildAnimation: any
  export class VMDLoader {
    constructor(manager?: any)
    load(url: string, onLoad: (object: any) => void, onProgress?: any, onError?: any): void
    loadAsync(url: string, onProgress?: any): Promise<any>
  }
  export class MMDLoader {
    constructor(plugins?: any, manager?: any)
    load(url: string, onLoad: (mmd: any) => void, onProgress?: any, onError?: any): void
    loadAsync(url: string, onProgress?: any): Promise<any>
    loadAnimation(url: string, object: any, onLoad: (animation: any) => void, onProgress?: any, onError?: any): void
    loadAnimationAsync(url: string, object: any, onProgress?: any): Promise<any>
  }
}
