/**
 * Web Worker for /admin/experiments: runs the seeded simulations off the main
 * thread, so a large rerun (up to 20,000 customers per arm with 5,000
 * relabellings) never freezes the page. Same code as the server and the
 * calibration script (src/lib/experiments/runs.ts).
 */
import { handleWorkerRequest, type WorkerRequest } from "@/lib/experiments/runs";

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (message: unknown) => void;
};

scope.onmessage = (event) => {
  scope.postMessage(handleWorkerRequest(event.data));
};
