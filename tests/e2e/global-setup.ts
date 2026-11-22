import { createServer, preview } from "vite";

export default async function globalSetup() {
  const options = { host: "127.0.0.1", port: 5190, strictPort: true };
  if (process.env.PLAYWRIGHT_TEST_BUILD === "1") {
    const server = await preview({ preview: options });
    return async () => { await new Promise<void>(resolve => server.httpServer.close(() => resolve())); };
  }
  const server = await createServer({ server: options });
  await server.listen();
  return async () => { await server.close(); };
}
