declare module '@moeru/three-mmd' {
  export type MMD = any
  export const buildAnimation: any
  export const VMDLoader: any
  export class MMDLoader {
    constructor(manager?: any)
    load(
      url: string,
      onLoad: (mmd: any) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: ErrorEvent) => void,
    ): void
    loadAsync(url: string, onProgress?: (event: ProgressEvent) => void): Promise<any>
  }
}
