// backend/src/utils/parseUserAgent.js
// Lightweight UA parser — no external dependency needed.
// Extracts browser, OS, and device type from the User-Agent header string.

/**
 * @param {string} ua  - req.headers['user-agent']
 * @returns {{ browser, os, device, isMobile }}
 */
const parseUserAgent = (ua = '') => {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', device: 'Unknown device', isMobile: false };

  // ── OS ──────────────────────────────────────────────────────────────────────
  let os = 'Unknown';
  if (/Windows NT 10/i.test(ua))        os = 'Windows 10';
  else if (/Windows NT 11/i.test(ua))   os = 'Windows 11';
  else if (/Windows NT 6\.3/i.test(ua)) os = 'Windows 8.1';
  else if (/Windows NT 6\.1/i.test(ua)) os = 'Windows 7';
  else if (/Windows/i.test(ua))         os = 'Windows';
  else if (/iPhone OS ([\d_]+)/i.test(ua)) {
    const v = ua.match(/iPhone OS ([\d_]+)/i)[1].replace(/_/g, '.');
    os = `iOS ${v}`;
  }
  else if (/iPad.*OS ([\d_]+)/i.test(ua)) {
    const v = ua.match(/iPad.*OS ([\d_]+)/i)[1].replace(/_/g, '.');
    os = `iPadOS ${v}`;
  }
  else if (/Android ([\d.]+)/i.test(ua)) {
    const v = ua.match(/Android ([\d.]+)/i)[1];
    os = `Android ${v}`;
  }
  else if (/Mac OS X ([\d_]+)/i.test(ua)) {
    const v = ua.match(/Mac OS X ([\d_]+)/i)[1].replace(/_/g, '.');
    os = `macOS ${v}`;
  }
  else if (/Linux/i.test(ua))            os = 'Linux';

  // ── Browser ─────────────────────────────────────────────────────────────────
  let browser = 'Unknown';
  // Order matters — Edge identifies as Chrome too, check it first
  if (/Edg\/([\d.]+)/i.test(ua)) {
    browser = `Edge ${ua.match(/Edg\/([\d.]+)/i)[1].split('.')[0]}`;
  } else if (/OPR\/([\d.]+)/i.test(ua) || /Opera\/([\d.]+)/i.test(ua)) {
    const v = (ua.match(/OPR\/([\d.]+)/i) || ua.match(/Opera\/([\d.]+)/i))[1];
    browser = `Opera ${v.split('.')[0]}`;
  } else if (/Chrome\/([\d.]+)/i.test(ua) && !/Chromium/i.test(ua)) {
    browser = `Chrome ${ua.match(/Chrome\/([\d.]+)/i)[1].split('.')[0]}`;
  } else if (/Firefox\/([\d.]+)/i.test(ua)) {
    browser = `Firefox ${ua.match(/Firefox\/([\d.]+)/i)[1].split('.')[0]}`;
  } else if (/Safari\/([\d.]+)/i.test(ua) && /Version\/([\d.]+)/i.test(ua)) {
    browser = `Safari ${ua.match(/Version\/([\d.]+)/i)[1].split('.')[0]}`;
  } else if (/Chromium\/([\d.]+)/i.test(ua)) {
    browser = `Chromium ${ua.match(/Chromium\/([\d.]+)/i)[1].split('.')[0]}`;
  }

  // ── Mobile ──────────────────────────────────────────────────────────────────
  const isMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  // ── Human-readable device string ────────────────────────────────────────────
  const device = `${browser} on ${os}`;

  return { browser, os, device, isMobile };
};

module.exports = parseUserAgent;