// The module build/data.ts serves to Vite and Vitest.
declare module 'virtual:quickened/data' {
  export const data: import('../build/data.ts').QuickenedData;
}
