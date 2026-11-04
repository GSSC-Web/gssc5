import { loadConfig, type Config } from "./config";

export type MailMessage = {
  to: string;
  from: string;
  subject: string;
  text: string;
};

export type MailTransporter = {
  sendMail(message: MailMessage): Promise<void>;
};

export type SmtpExchange = {
  write(data: string): void;
  readReply(): Promise<string>;
  close(): void;
};

export type SmtpConnect = (options: {
  hostname: string;
  port: number;
}) => Promise<SmtpExchange>;

let transporterOverride: MailTransporter | undefined;
let connectOverride: SmtpConnect | undefined;

export function setMailTransporter(transporter: MailTransporter | undefined): void {
  transporterOverride = transporter;
}

export function setSmtpConnect(connect: SmtpConnect | undefined): void {
  connectOverride = connect;
}

export function getMailTransporter(config: Config = loadConfig()): MailTransporter {
  if (transporterOverride) return transporterOverride;
  return createSmtpTransporter(config, connectOverride);
}

// @relation(GSSC-BLLR-246, scope=range_start, role=Implementation)
export function createSmtpTransporter(
  config: Config,
  connect: SmtpConnect | undefined = connectOverride,
): MailTransporter {
  return {
    async sendMail(message) {
      const host = config.SMTP_HOST.trim();
      if (host === "" || !connect) throw new Error("SMTP host is not configured");
      const from = message.from.trim() || config.SMTP_FROM.trim();
      if (from === "") throw new Error("SMTP from address is not configured");

      const exchange = await connect({ hostname: host, port: config.SMTP_PORT });
      try {
        await expectCode(exchange, 220);
        await command(exchange, "EHLO localhost\r\n", 250);
        const user = config.SMTP_USER.trim();
        if (user !== "") {
          await command(exchange, "AUTH LOGIN\r\n", 334);
          await command(exchange, `${b64(user)}\r\n`, 334);
          await command(exchange, `${b64(config.SMTP_PASSWORD)}\r\n`, 235);
        }
        await command(exchange, `MAIL FROM:<${from}>\r\n`, 250);
        await command(exchange, `RCPT TO:<${message.to}>\r\n`, 250);
        await command(exchange, "DATA\r\n", 354);
        const payload =
          `From: ${from}\r\n` +
          `To: ${message.to}\r\n` +
          `Subject: ${message.subject}\r\n` +
          `Content-Type: text/plain; charset=utf-8\r\n` +
          `\r\n` +
          `${message.text.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..")}\r\n` +
          `.\r\n`;
        await command(exchange, payload, 250);
        await command(exchange, "QUIT\r\n", 221);
      } finally {
        exchange.close();
      }
    },
  };
}
// @relation(GSSC-BLLR-246, scope=range_end, role=Implementation)

async function command(exchange: SmtpExchange, data: string, expected: number): Promise<string> {
  exchange.write(data);
  return expectCode(exchange, expected);
}

async function expectCode(exchange: SmtpExchange, expected: number): Promise<string> {
  const reply = await exchange.readReply();
  const code = Number(reply.slice(0, 3));
  if (code !== expected) throw new Error(`SMTP expected ${expected}, got ${reply.trim()}`);
  return reply;
}

function b64(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}
