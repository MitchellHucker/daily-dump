import "@testing-library/jest-dom";

// Jest in this repo doesn't provide the Web Response API by default, but our Route Handlers
// use `Response.json(...)`. This minimal shim is enough for unit-testing our route logic.
if (!globalThis.Response) {
  class TestResponse {
    status: number;
    private body: unknown;

    constructor(body: unknown, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status ?? 200;
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

