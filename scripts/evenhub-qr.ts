// We explicitly pass `--ip` because evenhub's default IP detection can be incorrect
// in some environments.
import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";

function getLocalIpv4(): string | null {
	const nets = networkInterfaces();
	for (const interfaces of Object.values(nets)) {
		if (!interfaces) continue;
		for (const net of interfaces) {
			const familyV4Value = net.family === "IPv4";
			if (familyV4Value && !net.internal) {
				return net.address;
			}
		}
	}
	return null;
}

const ip = getLocalIpv4();

if (!ip) {
	console.error(
		"Failed to detect a local IP address. Please check your network connection.",
	);
	process.exit(1);
}

const extraArgs = process.argv.slice(2);
const args = [
	"qr",
	"--port",
	"5173",
	"--path",
	"/even-aozora-reader/",
	"--ip",
	ip,
	...extraArgs,
];

const child = spawn("evenhub", args, {
	stdio: "inherit",
	shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal);
		return;
	}
	process.exit(code ?? 0);
});
