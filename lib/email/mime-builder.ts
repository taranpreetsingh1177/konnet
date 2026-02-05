/**
 * Creates a multipart MIME email message with HTML body and PDF attachment
 */
export function createEmailWithAttachment(
  from: string,
  to: string,
  subject: string,
  htmlBody: string,
  pdfBuffer: Buffer,
  pdfFilename: string,
): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;

  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    `Content-Type: text/html; charset=utf-8`,
    `Content-Transfer-Encoding: 7bit`,
    "",
    htmlBody,
    "",
    `--${boundary}`,
    `Content-Type: application/pdf; name="${pdfFilename}"`,
    `Content-Disposition: attachment; filename="${pdfFilename}"`,
    `Content-Transfer-Encoding: base64`,
    "",
    pdfBuffer.toString("base64"),
    "",
    `--${boundary}--`,
  ].join("\r\n");

  return message;
}
