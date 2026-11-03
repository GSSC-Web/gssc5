import { afterEach, expect, test } from "bun:test";

import { loadConfig } from "./config";
import {
  createSmtpTransporter,
  setMailTransporter,
  setSmtpConnect,
  type SmtpExchange,
} from "./mail";

afterEach(() => {
  setMailTransporter(undefined);
  setSmtpConnect(undefined);
});

// @relation(GSSC-BLLR-246, scope=range_start, role=Test)
test("GSSC-BLLR-246 SMTP Configuration defaults", () => {
  const config = loadConfig({ envFile: "/tmp/missing-gssc-env", processEnv: {} });
  expect(config.SMTP_HOST).toBe("");
  expect(config.SMTP_PORT).toBe(587);
  expect(config.SMTP_USER).toBe("");
  expect(config.SMTP_PASSWORD).toBe("");
  expect(config.SMTP_FROM).toBe("");
});

test("GSSC-BLLR-246 SMTP transporter uses mocked exchange", async () => {
  const writes: string[] = [];
  const replies = [
    "220 ready\r\n",
    "250 ok\r\n",
    "250 ok\r\n",
    "250 ok\r\n",
    "354 go\r\n",
    "250 queued\r\n",
    "221 bye\r\n",
  ];
  let index = 0;
  const exchange: SmtpExchange = {
    write(data) {
      writes.push(data);
    },
    async readReply() {
      const reply = replies[index++];
      if (!reply) throw new Error("no reply");
      return reply;
    },
    close() {},
  };

  const config = {
    ...loadConfig({ envFile: "/tmp/missing-gssc-env", processEnv: {} }),
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: 2525,
    SMTP_FROM: "noreply@example.com",
  };
  const transporter = createSmtpTransporter(config, async () => exchange);
  await transporter.sendMail({
    to: "member@example.com",
    from: "",
    subject: "Recovery",
    text: "token-value",
  });
  expect(writes.some((chunk) => chunk.includes("MAIL FROM:<noreply@example.com>"))).toBe(true);
  expect(writes.some((chunk) => chunk.includes("RCPT TO:<member@example.com>"))).toBe(true);
  expect(writes.some((chunk) => chunk.includes("token-value"))).toBe(true);
});

test("GSSC-BLLR-246 empty SMTP host fails send", async () => {
  const config = loadConfig({ envFile: "/tmp/missing-gssc-env", processEnv: {} });
  const transporter = createSmtpTransporter(config, async () => {
    throw new Error("should not connect");
  });
  await expect(
    transporter.sendMail({
      to: "member@example.com",
      from: "noreply@example.com",
      subject: "Recovery",
      text: "token",
    }),
  ).rejects.toThrow("SMTP host is not configured");
});
// @relation(GSSC-BLLR-246, scope=range_end, role=Test)
