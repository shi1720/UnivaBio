import { mkdtemp, copyFile, readFile, writeFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// Firebase restricts rule paths to its config's project directory. Stage an exact
// copy in a disposable local project, while testing the real application modules.
const checkout = resolve(process.env.LOOPLIGHT_CHECKOUT || process.cwd());
const config = JSON.parse(
  await readFile(join(checkout, "firebase/config.json"), "utf8"),
);
const temporaryProject = await mkdtemp(join(tmpdir(), "looplight-emulators-"));
const require = createRequire(join(checkout, "package.json"));
const quote = (value) => "'" + value.replaceAll("'", "'\\''") + "'";
let child;
const stop = (signal) => child?.kill(signal);
const onInterrupt = () => stop("SIGINT");
const onTerminate = () => stop("SIGTERM");
process.on("SIGINT", onInterrupt);
process.on("SIGTERM", onTerminate);
try {
  await copyFile(
    join(checkout, "firebase/firestore.rules"),
    join(temporaryProject, "firestore.rules"),
  );
  await copyFile(
    join(checkout, "firebase/firestore.indexes.json"),
    join(temporaryProject, "firestore.indexes.json"),
  );
  const template = JSON.parse(
    await readFile(join(checkout, "tests/firebase/emulators.json"), "utf8"),
  );
  await writeFile(
    join(temporaryProject, "firebase.json"),
    JSON.stringify(template, null, 2) + "\n",
  );
  const command = [
    quote(process.execPath),
    "--import",
    quote(require.resolve("tsx")),
    quote(join(checkout, "tests/firebase/integration.mts")),
    "--emulator",
    ...(process.argv.includes("--quota-cap") ? ["--quota-cap"] : []),
  ].join(" ");
  const exitCode = await new Promise((resolveExit, reject) => {
    child = spawn(
      process.platform === "win32" ? "npx.cmd" : "npx",
      [
        "--yes",
        "firebase-tools@15.30.1",
        "emulators:exec",
        "--config",
        join(temporaryProject, "firebase.json"),
        "--project",
        config.projectId,
        "--only",
        "auth,firestore",
        command,
      ],
      {
        cwd: checkout,
        stdio: "inherit",
        env: { ...process.env, LOOPLIGHT_CHECKOUT: checkout },
      },
    );
    child.once("error", reject);
    child.once("exit", (code) => resolveExit(code ?? 1));
  });
  process.exitCode = Number(exitCode);
} finally {
  process.off("SIGINT", onInterrupt);
  process.off("SIGTERM", onTerminate);
  await rm(temporaryProject, { recursive: true, force: true });
}
