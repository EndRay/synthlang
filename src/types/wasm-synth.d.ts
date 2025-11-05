declare module '/wasm/synth.mjs' {
  export interface Module {
    init_synth(count: number): void;
    set_sample_rate?(sr: number): void;     // optional if you compiled it
    get_osc_count(): number;
    getBuffer(): number[];                  // 512 numbers
    getOscSample(id: number): number;
  }

  export default function createModule(opts?: {
    locateFile?: (p: string) => string;
  }): Promise<Module>;
}