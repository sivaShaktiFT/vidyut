import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { PanchangaCalculator, type PanchangaOptions } from './index.ts';

/**
 * Creates a calculator in Node without changing process-global `fetch`.
 * The browser entry stays free of Node specifiers; callers still choose their
 * ephemeris data source through `ephemerisUrl` or `offline`.
 */
export async function createNodeCalculator(
  options: PanchangaOptions = {},
): Promise<PanchangaCalculator> {
  const wasmPath = join(
    dirname(createRequire(import.meta.url).resolve('sweph-wasm')),
    'wasm',
    'swisseph.wasm',
  );
  const wasm = await readFile(wasmPath);
  return PanchangaCalculator.create({
    ...options,
    wasmUrl: `data:application/wasm;base64,${wasm.toString('base64')}`,
  });
}

export * from './index.ts';
