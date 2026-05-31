import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const projectRoot = path.resolve(import.meta.dirname, "..");
const publicRoot = path.join(projectRoot, "public");
const port = Number(process.env.PORT || 4317);
const baseUrl = `http://127.0.0.1:${port}`;
const dataRoot = path.join(projectRoot, ".tmp", `smoke-data-${Date.now()}-${Math.random().toString(16).slice(2)}`);

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadBrowserData(fileName, exportName) {
  const code = await fs.readFile(path.join(publicRoot, fileName), "utf8");
  const context = {
    window: {},
    globalThis: {}
  };
  vm.createContext(context);
  vm.runInContext(code, context, { filename: fileName });
  return context.window[exportName];
}

async function waitForHealth(deadlineMs = 15000) {
  const startedAt = Date.now();
  let lastError = "unknown error";
  while (Date.now() - startedAt < deadlineMs) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        return response.json();
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error.message;
    }
    await delay(250);
  }
  throw new Error(`Server did not become healthy in time: ${lastError}`);
}

async function runSmokeSuite() {
  const challenges = await loadBrowserData("challenges.js", "CHALLENGES");
  const solutions = await loadBrowserData("solutions.js", "SOLUTIONS");

  assert(Array.isArray(challenges), "Expected CHALLENGES to be an array");
  assert.equal(challenges.length, 18, "Expected 18 challenges");

  const server = spawn(process.execPath, ["server.js"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(port),
      DATA_ROOT: dataRoot
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stderr = "";
  server.stderr.on("data", chunk => {
    stderr += chunk.toString("utf8");
  });

  try {
    const health = await waitForHealth();
    assert.equal(health.ok, true, "Health endpoint should report ok");
    assert.equal(health.challenges, challenges.length, "Health endpoint challenge count mismatch");
    console.log(`[smoke] health ok on ${baseUrl}`);

    const indexResponse = await fetch(`${baseUrl}/`);
    const indexHtml = await indexResponse.text();
    assert(indexHtml.includes("monaco-editor"), "Expected Monaco editor loader in index.html");
    assert(indexHtml.includes("finishDialog"), "Expected finish dialog markup in index.html");
    console.log("[smoke] static shell served");

    const username = `smoke_${Date.now().toString(36)}`;
    const password = "smoke-pass-123";
    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        password,
        state: {
          unlocked: 3,
          current: 2,
          passed: [1],
          codes: { 1: "int main(){}" }
        }
      })
    });
    const cookie = registerResponse.headers.get("set-cookie")?.split(";")[0];
    const registerData = await registerResponse.json();
    assert.equal(registerResponse.status, 201, "Registration should succeed");
    assert.equal(registerData.user.username, username, "Registered username mismatch");
    assert(cookie, "Registration should set an auth cookie");

    const stateResponse = await fetch(`${baseUrl}/api/state`, {
      headers: { Cookie: cookie }
    });
    const stateData = await stateResponse.json();
    assert.equal(stateResponse.status, 200, "Authenticated state read should succeed");
    assert.equal(stateData.state.unlocked, 3, "Initial account state should be saved");

    const updatedState = {
      unlocked: 4,
      current: 3,
      passed: [1, 2],
      codes: { 2: "cout << 120;" }
    };
    const updateResponse = await fetch(`${baseUrl}/api/state`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie
      },
      body: JSON.stringify({ state: updatedState })
    });
    const updateData = await updateResponse.json();
    assert.equal(updateResponse.status, 200, "Authenticated state update should succeed");
    assert.deepEqual(updateData.state.passed, [1, 2], "Updated account progress should persist");

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        password,
        state: {
          unlocked: 5,
          current: 4,
          passed: [1, 3],
          codes: { 3: "merged local draft" }
        }
      })
    });
    const loginData = await loginResponse.json();
    assert.equal(loginResponse.status, 200, "Login should succeed");
    assert.equal(loginData.state.unlocked, 5, "Login should merge local progress into account state");
    assert.deepEqual(loginData.state.passed, [1, 2, 3], "Login should merge passed levels");
    assert.equal(loginData.state.codes[3], "merged local draft", "Login should merge local code drafts");
    console.log("[smoke] account auth and progress sync passed");

    for (const challenge of challenges) {
      const code = solutions[challenge.id];
      assert(code, `Missing reference solution for challenge ${challenge.id}`);

      const response = await fetch(`${baseUrl}/api/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: challenge.id,
          code
        })
      });
      const result = await response.json();
      assert.equal(
        result.passed,
        true,
        `Challenge ${challenge.id} should pass with the bundled reference solution.\n${JSON.stringify(result, null, 2)}`
      );
      console.log(`[smoke] challenge ${String(challenge.id).padStart(2, "0")} passed`);
    }

    console.log("[smoke] all bundled challenge solutions passed");
  } finally {
    server.kill();
    await new Promise(resolve => server.once("exit", resolve));
    await fs.rm(dataRoot, { recursive: true, force: true }).catch(() => {});
    if (stderr.trim()) {
      console.log("[smoke] server stderr:");
      console.log(stderr.trim());
    }
  }
}

runSmokeSuite().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
