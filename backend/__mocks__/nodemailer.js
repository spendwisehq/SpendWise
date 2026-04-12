// Auto-mock for nodemailer — prevents real emails in tests
const sendMail = jest.fn().mockResolvedValue({ messageId: 'test-msg-id' });

const createTransport = jest.fn().mockReturnValue({ sendMail });

module.exports = { createTransport };
