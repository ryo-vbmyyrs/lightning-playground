import type { CompileRequest, CompileResponse } from '../../shared/types';
import { generatedUrl } from './assets';

/** Promise-based wrapper around the LWC compiler worker (public/generated/compiler.worker.js). */
export class CompilerClient {
  private readonly worker: Worker;
  private nextId = 1;
  private readonly pending = new Map<number, (response: CompileResponse) => void>();

  constructor() {
    this.worker = new Worker(generatedUrl('compiler.worker.js'), { type: 'module' });
    this.worker.addEventListener('message', (event: MessageEvent<CompileResponse>) => {
      const resolve = this.pending.get(event.data.id);
      this.pending.delete(event.data.id);
      resolve?.(event.data);
    });
  }

  compile(request: Omit<CompileRequest, 'id'>): Promise<CompileResponse> {
    const id = this.nextId++;
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.worker.postMessage({ ...request, id } satisfies CompileRequest);
    });
  }

  dispose(): void {
    this.worker.terminate();
    this.pending.clear();
  }
}
