import { spawn } from "node:child_process";

const port = Number(process.env.SMOKE_PORT ?? 3100);
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
let child;
let output = "";

const appendOutput = (chunk) => {
  output = `${output}${chunk}`.slice(-4000);
};

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

try {
  child = spawn(npmCommand, ["run", "start", "--", "-p", String(port)], {
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", NEXT_TEST_WASM: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", appendOutput);
  child.stderr.on("data", appendOutput);

  const deadline = Date.now() + 30_000;
  let response;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`next start exited with code ${child.exitCode}`);
    try {
      response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) break;
    } catch {
      // The server is still starting.
    }
    await wait(250);
  }

  if (!response?.ok) throw new Error(`GET / did not become ready (last status: ${response?.status ?? "none"})`);
  const body = await response.text();
  if (!body.toLowerCase().includes("timberline")) throw new Error("GET / returned an unexpected page");
  console.log(`Smoke check passed: GET / returned ${response.status}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  if (output) console.error(output);
  process.exitCode = 1;
} finally {
  if (child && child.exitCode === null) child.kill();
}
