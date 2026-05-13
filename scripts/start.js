import fs from "fs/promises";
import path from "path";
import net from "net";
import { spawn } from "child_process";

const projectRoot = process.cwd();
const frontendEnvPath = path.join(projectRoot, "frontend", ".env");

const isPortFree = (port) =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (err) => {
      server.close();
      resolve(false);
    });
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });

const findFreePort = async (startPort) => {
  let port = startPort;
  while (!(await isPortFree(port))) {
    port += 1;
  }
  return port;
};

const writeFrontendEnv = async (backendPort) => {
  const content = `VITE_API_BASE=http://localhost:${backendPort}/api\n`;
  await fs.writeFile(frontendEnvPath, content, "utf8");
};

const runCommand = (command, args, options) => {
  const isWindows = process.platform === "win32";
  const executable = isWindows ? process.env.comspec || "cmd.exe" : command;
  const executableArgs = isWindows ? ["/c", command, ...args] : args;

  const child = spawn(executable, executableArgs, {
    stdio: ["inherit", "pipe", "pipe"],
    shell: false,
    ...options,
  });

  child.stdout.on("data", (data) => process.stdout.write(data));
  child.stderr.on("data", (data) => process.stderr.write(data));

  child.on("error", (error) => {
    console.error(`Failed to start ${command}:`, error);
    process.exit(1);
  });

  child.on("exit", (code) => {
    if (code !== 0) {
      process.stdout.write(`\nProcess ${command} exited with code ${code}.\n`);
    }
    process.exit(code);
  });

  return child;
};

const normalizeHost = (host) => {
  if (host === "127.0.0.1") {
    return "0.0.0.0";
  }
  return host;
};

const parseCliArgs = () => {
  const args = process.argv.slice(2);
  const result = { host: "0.0.0.0", frontendPort: null, backendPort: null };
  args.forEach((value, index) => {
    if (value === "--host") {
      result.host = args[index + 1] || result.host;
    }
    if (value === "--port") {
      const parsed = Number(args[index + 1]);
      if (!Number.isNaN(parsed)) {
        result.frontendPort = parsed;
      }
    }
    if (value === "--backend-port") {
      const parsed = Number(args[index + 1]);
      if (!Number.isNaN(parsed)) {
        result.backendPort = parsed;
      }
    }
  });
  return result;
};

const main = async () => {
  const { host: requestedHost, frontendPort: requestedFrontendPort, backendPort: requestedBackendPort } = parseCliArgs();
  const backendPort = requestedBackendPort || (await findFreePort(4000));
  const frontendPort = requestedFrontendPort || (await findFreePort(4173));
  const host = normalizeHost(requestedHost);

  await writeFrontendEnv(backendPort);

  console.log(`Starting backend on port ${backendPort}`);
  console.log(`Starting frontend on port ${frontendPort}`);
  console.log(`Writing frontend API base to ${frontendEnvPath}`);

  const env = { ...process.env, PORT: String(backendPort) };

  const backend = runCommand("npm", ["--prefix", "backend", "run", "dev"], { env });
  const frontend = runCommand(
    "npm",
    ["--prefix", "frontend", "run", "dev", "--", "--host", host, "--port", String(frontendPort)],
    { env }
  );

  const cleanup = () => {
    if (!backend.killed) backend.kill();
    if (!frontend.killed) frontend.kill();
    process.exit(0);
  };

  backend.on("exit", cleanup);
  frontend.on("exit", cleanup);
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
