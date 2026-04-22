import "@testing-library/jest-dom";

import { TextDecoder, TextEncoder } from "node:util";
import { ReadableStream } from "node:stream/web";

if (!globalThis.TextEncoder) globalThis.TextEncoder = TextEncoder as unknown as typeof globalThis.TextEncoder;
if (!globalThis.TextDecoder) globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
if (!globalThis.ReadableStream) globalThis.ReadableStream = ReadableStream as unknown as typeof globalThis.ReadableStream;

// Jest in this repo doesn't provide the Web Response API by default, but our Route Handlers
// use `Response.json(...)`. This minimal shim is enough for unit-testing our route logic.
if (!globalThis.Response) {
  class TestResponse {
    status: number;
    body: unknown;
    headers: Record<string, string>;

    constructor(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body;
      this.status = init?.status ?? 200;
      this.headers = init?.headers ?? {};
    }

    async json() {
      return this.body;
    }

    static json(body: unknown, init?: { status?: number }) {
      return new TestResponse(body, init);
    }
  }

  globalThis.Response = TestResponse as unknown as typeof globalThis.Response;
}

