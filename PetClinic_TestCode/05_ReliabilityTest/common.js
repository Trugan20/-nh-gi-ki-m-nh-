/**
 * common.js – HÀM DÙNG CHUNG CHO KIỂM THỬ HIỆU NĂNG
 * ------------------------------------------------
 * autocannon là công cụ "bắn" thật nhiều yêu cầu HTTP cùng lúc vào ứng dụng để đo:
 *   - latency (thời gian phản hồi): p50 = một nửa số yêu cầu nhanh hơn mức này;
 *                                  p99 = 99% số yêu cầu nhanh hơn mức này (chỉ số chính để so với yêu cầu ≤ 3 giây)
 *   - rps (requests per second): số yêu cầu máy chủ xử lý được mỗi giây (thông lượng)
 *   - errors / timeouts / non2xx: yêu cầu lỗi kết nối / quá 10 giây không trả lời / trả mã lỗi HTTP
 * File này gói autocannon thành hàm run() dùng được với async/await, rồi rút gọn kết quả để in và lưu JSON.
 */
const autocannon = require("autocannon");
const fs = require("fs");
const path = require("path");

// Địa chỉ ứng dụng cần đo (nên là bản production: npm run build && npm start).
const BASE = process.env.BASE_URL || "http://localhost:5000";
// Thư mục lưu file kết quả JSON.
const OUT_DIR = process.env.RESULT_DIR || path.join(__dirname, "..", "07_KetQua", "reliability");
fs.mkdirSync(OUT_DIR, { recursive: true });

/**
 * Chạy một đợt đo bằng autocannon.
 * opts: { connections: số người dùng đồng thời, duration: số giây, path: API cần gọi
 *         hoặc requests: danh sách API gọi luân phiên }. timeout 10 giây/yêu cầu.
 */
function run(opts) {
  return new Promise((resolve, reject) => {
    const inst = autocannon({ url: BASE, timeout: 10, ...opts }, (err, res) => (err ? reject(err) : resolve(res)));
    autocannon.track(inst, { renderProgressBar: false, renderResultsTable: false, renderLatencyTable: false });
  });
}

// Rút gọn kết quả autocannon thành các chỉ số dùng trong báo cáo (đơn vị thời gian: mili giây).
// errorRatePct = (lỗi + timeout + mã HTTP không phải 2xx) / tổng yêu cầu × 100.
function summarize(name, res) {
  const total = res.requests.total;
  const failed = res.errors + res.timeouts + res.non2xx;
  return {
    name,
    connections: res.connections,
    durationS: res.duration,
    requests: total,
    rps: Math.round(res.requests.average),
    latencyAvgMs: Math.round(res.latency.average),
    latencyP50Ms: res.latency.p50,
    latencyP90Ms: res.latency.p90,
    latencyP99Ms: res.latency.p99,
    latencyMaxMs: res.latency.max,
    errors: res.errors,
    timeouts: res.timeouts,
    non2xx: res.non2xx,
    errorRatePct: total + res.errors ? +((failed / (total + res.errors)) * 100).toFixed(2) : 0,
  };
}

/** Ghi kết quả ra file JSON trong thư mục OUT_DIR. */
function save(file, data) {
  fs.writeFileSync(path.join(OUT_DIR, file), JSON.stringify(data, null, 2));
}

/** In một dòng tóm tắt kết quả ra màn hình. */
function printRow(s) {
  console.log(
    `${s.name.padEnd(42)} conn=${String(s.connections).padStart(4)}  req=${String(s.requests).padStart(7)}  rps=${String(s.rps).padStart(5)}  ` +
      `p50=${String(s.latencyP50Ms).padStart(5)}ms  p99=${String(s.latencyP99Ms).padStart(5)}ms  max=${String(s.latencyMaxMs).padStart(5)}ms  lỗi=${s.errorRatePct}%`,
  );
}

module.exports = { BASE, OUT_DIR, run, summarize, save, printRow };
