import { readiness, requireMethod, sendJson } from "../_dual.js";

export default async function handler(req, res) {
  if (!requireMethod(req, res, "GET")) return;
  sendJson(res, 200, readiness());
}
