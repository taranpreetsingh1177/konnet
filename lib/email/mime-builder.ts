// lib/email/mime-builder.ts

export function createEmailWithAttachment(
  from: string,
  to: string,
  subject: string,
  htmlBody: string,
  pdfBuffer: Buffer,
  pdfFilename: string,
): string {
  const boundary = `__BOUNDARY_${Date.now()}_${Math.random().toString(36).substring(2)}__`;

  // Encode subject if necessary (RFC 2047)
  const encodedSubject = /[^\0-\x7F]/.test(subject)
    ? '=?utf-8?B?' + Buffer.from(subject).toString('base64') + '?='
    : subject;

  // Encode body to base64 to avoid encoding issues
  const encodedBody = Buffer.from(htmlBody).toString('base64');
  // Initial PDF chunks are already a buffer, so we just to base64 it
  const encodedPdf = pdfBuffer.toString('base64');

  const messageParts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    `Content-Type: text/html; charset=utf-8`,
    `Content-Transfer-Encoding: base64`,
    "",
    encodedBody,
    "",
    `--${boundary}`,
    `Content-Type: application/pdf; name="${pdfFilename}"`,
    `Content-Disposition: attachment; filename="${pdfFilename}"`,
    `Content-Transfer-Encoding: base64`,
    "",
    encodedPdf,
    "",
    `--${boundary}--`,
    ""
  ];

  return messageParts.join("\r\n");
}
