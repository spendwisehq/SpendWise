// Manual mock for otplib — avoids @scure/base ESM issue in Jest
const authenticator = {
  generateSecret: () => 'JBSWY3DPEHPK3PXP',
  generate: () => '123456',
  verify: ({ token }) => token === '123456',
  keyuri: (user, service, secret) => `otpauth://totp/${service}:${user}?secret=${secret}&issuer=${service}`,
};

module.exports = { authenticator };
