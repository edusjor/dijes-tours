const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const PUBLIC_BASE_URL = normalizeBaseUrl(process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`);

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const FROM_EMAIL = process.env.FROM_EMAIL || process.env.SMTP_FROM || SMTP_USER || 'reservas@localhost';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'pagos@dijestours.com';
const SUPPORT_WHATSAPP = process.env.SUPPORT_WHATSAPP || '+50670000000';

const PAYMENT_SINPE = process.env.PAYMENT_SINPE || '+50688887777';
const PAYMENT_OWNER = process.env.PAYMENT_OWNER || 'Dijes Tours CR S.A.';
const PAYMENT_BANK = process.env.PAYMENT_BANK || 'Banco Nacional';
const PAYMENT_IBAN_USD = process.env.PAYMENT_IBAN_USD || '';
const PAYMENT_IBAN_CRC = process.env.PAYMENT_IBAN_CRC || process.env.PAYMENT_IBAN || 'CR23015108410026012345';
const EXCHANGE_RATE_CRC_PER_USD = Number(process.env.EXCHANGE_RATE_CRC_PER_USD || 470);

const PROJECT_ROOT = __dirname;
const RECEIPTS_DIR = path.join(PROJECT_ROOT, 'comprobantes');
const TOURS_DIR = path.join(PROJECT_ROOT, 'tours');
const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.pdf']);
const TOUR_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif']);
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
]);

fs.mkdirSync(RECEIPTS_DIR, { recursive: true });
fs.mkdirSync(TOURS_DIR, { recursive: true });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/comprobantes', express.static(RECEIPTS_DIR));
app.use('/tours', express.static(TOURS_DIR));
app.use(express.static(PROJECT_ROOT));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.get('/api/tours/images', (_req, res) => {
  try {
    const tours = listTourImagesByFolder();
    res.json({ ok: true, tours });
  } catch (error) {
    console.error('Error en /api/tours/images:', error);
    res.status(500).json({
      ok: false,
      message: 'No se pudieron listar las imagenes de tours.',
    });
  }
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, RECEIPTS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueName = buildUniqueTimestampFilename(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 6 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const isValidType = ALLOWED_MIME_TYPES.has(file.mimetype) && ALLOWED_EXTENSIONS.has(extension);

    if (!isValidType) {
      cb(new Error('Formato de comprobante no permitido. Usa PNG, JPG, WEBP o PDF.'));
      return;
    }

    cb(null, true);
  },
});

app.post('/api/reservations', upload.single('proofFile'), async (req, res) => {
  try {
    assertSmtpConfig();

    const requiredFields = ['name', 'whatsapp', 'email', 'tour', 'date', 'people', 'paymentMethod'];
    const missingFields = requiredFields.filter((field) => !String(req.body[field] || '').trim());

    if (missingFields.length) {
      res.status(400).json({
        ok: false,
        message: `Faltan campos obligatorios: ${missingFields.join(', ')}`,
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        ok: false,
        message: 'Debes subir la captura del comprobante para enviar la solicitud.',
      });
      return;
    }

    const reservation = buildReservationPayload(req.body, req.file.filename);

    await sendReservationEmails(reservation);

    res.status(201).json({
      ok: true,
      reservationId: reservation.reservationId,
      proofUrl: reservation.proofUrl,
      message: 'Solicitud enviada. El cliente y el administrador recibieron el correo.',
    });
  } catch (error) {
    console.error('Error en /api/reservations:', error);

    res.status(500).json({
      ok: false,
      message: 'No pudimos enviar la solicitud por correo. Revisa configuracion SMTP o intenta de nuevo.',
    });
  }
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(PROJECT_ROOT, 'index.html'));
});

app.use((error, _req, res, _next) => {
  const isMulterError = error instanceof multer.MulterError;

  if (isMulterError) {
    res.status(400).json({
      ok: false,
      message: 'Error al cargar el comprobante. Verifica tamano o formato.',
    });
    return;
  }

  res.status(400).json({
    ok: false,
    message: error.message || 'Solicitud invalida.',
  });
});

app.listen(PORT, () => {
  console.log(`Servidor listo en ${PUBLIC_BASE_URL}`);
});

function normalizeBaseUrl(url) {
  if (!url) {
    return '';
  }

  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function assertSmtpConfig() {
  const required = [
    ['SMTP_HOST', SMTP_HOST],
    ['SMTP_USER', SMTP_USER],
    ['SMTP_PASS', SMTP_PASS],
    ['ADMIN_EMAIL', ADMIN_EMAIL],
  ];

  const missing = required.filter(([, value]) => !value).map(([name]) => name);

  if (missing.length) {
    throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`);
  }
}

function buildReservationPayload(body, filename) {
  const reservationId = `RSV-${Date.now()}`;
  const depositUsd = Number(body.depositUsd || body.deposit || 0);
  const depositCrc = Number(body.depositCrc || Math.round(depositUsd * EXCHANGE_RATE_CRC_PER_USD));

  return {
    reservationId,
    status: 'Pendiente de validacion',
    createdAt: new Date().toISOString(),
    name: String(body.name || '').trim(),
    whatsapp: String(body.whatsapp || '').trim(),
    email: String(body.email || '').trim(),
    tour: String(body.tour || '').trim(),
    date: String(body.date || '').trim(),
    people: String(body.people || '').trim(),
    message: String(body.message || '').trim(),
    paymentMethod: String(body.paymentMethod || '').trim(),
    depositUsd,
    depositCrc,
    proofFileName: filename,
    proofUrl: `${PUBLIC_BASE_URL}/comprobantes/${filename}`,
    paymentInfo: {
      sinpe: PAYMENT_SINPE,
      owner: PAYMENT_OWNER,
      bank: PAYMENT_BANK,
      ibanUsd: PAYMENT_IBAN_USD,
      ibanCrc: PAYMENT_IBAN_CRC,
      exchangeRate: EXCHANGE_RATE_CRC_PER_USD,
    },
    support: {
      email: SUPPORT_EMAIL,
      whatsapp: SUPPORT_WHATSAPP,
    },
  };
}

function createTransporter() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

async function sendReservationEmails(reservation) {
  const transporter = createTransporter();

  const adminMail = {
    from: FROM_EMAIL,
    to: ADMIN_EMAIL,
    subject: `Nueva reserva ${reservation.reservationId} - ${reservation.tour}`,
    html: buildAdminEmailHtml(reservation),
  };

  const customerMail = {
    from: FROM_EMAIL,
    to: reservation.email,
    subject: `Gracias por tu orden ${reservation.reservationId}`,
    html: buildCustomerEmailHtml(reservation),
  };

  await Promise.all([
    transporter.sendMail(adminMail),
    transporter.sendMail(customerMail),
  ]);
}

function buildCustomerEmailHtml(data) {
  const messageRow = data.message
    ? `<tr><td style="padding:8px;border:1px solid #dce3ef;">Comentarios</td><td style="padding:8px;border:1px solid #dce3ef;">${escapeHtml(data.message)}</td></tr>`
    : '';

  return `
    <div style="font-family:Arial,sans-serif;color:#1f3252;line-height:1.6;max-width:720px;">
      <h2 style="margin:0 0 10px;">Gracias por tu orden</h2>
      <p>Hola ${escapeHtml(data.name)}, recibimos tu solicitud de reserva y vamos a validar tu pago.</p>

      <h3 style="margin:22px 0 8px;">Resumen de tu solicitud</h3>
      <table style="border-collapse:collapse;width:100%;">
        <tr><td style="padding:8px;border:1px solid #dce3ef;">Codigo</td><td style="padding:8px;border:1px solid #dce3ef;">${escapeHtml(data.reservationId)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #dce3ef;">Tour</td><td style="padding:8px;border:1px solid #dce3ef;">${escapeHtml(data.tour)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #dce3ef;">Fecha</td><td style="padding:8px;border:1px solid #dce3ef;">${escapeHtml(data.date)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #dce3ef;">Personas</td><td style="padding:8px;border:1px solid #dce3ef;">${escapeHtml(data.people)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #dce3ef;">Metodo de pago</td><td style="padding:8px;border:1px solid #dce3ef;">${escapeHtml(data.paymentMethod)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #dce3ef;">Monto a depositar</td><td style="padding:8px;border:1px solid #dce3ef;">${escapeHtml(formatDepositDisplay(data.depositUsd, data.depositCrc, data.paymentInfo.exchangeRate))}</td></tr>
        ${messageRow}
      </table>

      <h3 style="margin:22px 0 8px;">Datos para pago</h3>
      <p style="margin:0;">SINPE: <strong>${escapeHtml(data.paymentInfo.sinpe)}</strong></p>
      <p style="margin:0;">Titular: <strong>${escapeHtml(data.paymentInfo.owner)}</strong></p>
      <p style="margin:0;">Banco: <strong>${escapeHtml(data.paymentInfo.bank)}</strong></p>
      <p style="margin:0;">IBAN USD: <strong>${escapeHtml(data.paymentInfo.ibanUsd || 'No configurada')}</strong></p>
      <p style="margin:0 0 12px;">IBAN CRC: <strong>${escapeHtml(data.paymentInfo.ibanCrc || 'No configurada')}</strong></p>

      <p>Si aun no has realizado el pago, por favor hazlo a la cuenta indicada y envia comprobante a <strong>${escapeHtml(data.support.email)}</strong> o al WhatsApp <strong>${escapeHtml(data.support.whatsapp)}</strong>.</p>
      <p>Comprobante recibido: <a href="${escapeHtml(data.proofUrl)}" target="_blank" rel="noopener">${escapeHtml(data.proofUrl)}</a></p>
      <p>Nosotros te contactaremos para confirmar la reserva. Tambien puedes escribirnos directamente si lo prefieres.</p>

      <p style="margin-top:18px;">Equipo Dijes Tours</p>
    </div>
  `;
}

function buildAdminEmailHtml(data) {
  const messageRow = data.message
    ? `<tr><td style="padding:8px;border:1px solid #dce3ef;">Comentarios</td><td style="padding:8px;border:1px solid #dce3ef;">${escapeHtml(data.message)}</td></tr>`
    : '';

  return `
    <div style="font-family:Arial,sans-serif;color:#1f3252;line-height:1.6;max-width:760px;">
      <h2 style="margin:0 0 10px;">Nueva solicitud de reserva</h2>
      <p>Se recibio una nueva reserva y se envio correo de confirmacion al cliente.</p>

      <table style="border-collapse:collapse;width:100%;">
        <tr><td style="padding:8px;border:1px solid #dce3ef;">Codigo</td><td style="padding:8px;border:1px solid #dce3ef;">${escapeHtml(data.reservationId)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #dce3ef;">Estado</td><td style="padding:8px;border:1px solid #dce3ef;">${escapeHtml(data.status)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #dce3ef;">Tour</td><td style="padding:8px;border:1px solid #dce3ef;">${escapeHtml(data.tour)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #dce3ef;">Fecha</td><td style="padding:8px;border:1px solid #dce3ef;">${escapeHtml(data.date)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #dce3ef;">Personas</td><td style="padding:8px;border:1px solid #dce3ef;">${escapeHtml(data.people)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #dce3ef;">Metodo de pago</td><td style="padding:8px;border:1px solid #dce3ef;">${escapeHtml(data.paymentMethod)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #dce3ef;">Monto a depositar</td><td style="padding:8px;border:1px solid #dce3ef;">${escapeHtml(formatDepositDisplay(data.depositUsd, data.depositCrc, data.paymentInfo.exchangeRate))}</td></tr>
        <tr><td style="padding:8px;border:1px solid #dce3ef;">Cliente</td><td style="padding:8px;border:1px solid #dce3ef;">${escapeHtml(data.name)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #dce3ef;">WhatsApp</td><td style="padding:8px;border:1px solid #dce3ef;">${escapeHtml(data.whatsapp)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #dce3ef;">Correo</td><td style="padding:8px;border:1px solid #dce3ef;">${escapeHtml(data.email)}</td></tr>
        ${messageRow}
      </table>

      <h3 style="margin:22px 0 8px;">Comprobante</h3>
      <p style="margin:0;">Archivo: <strong>${escapeHtml(data.proofFileName)}</strong></p>
      <p style="margin:0;">Enlace publico: <a href="${escapeHtml(data.proofUrl)}" target="_blank" rel="noopener">${escapeHtml(data.proofUrl)}</a></p>

      <h3 style="margin:22px 0 8px;">Datos de pago configurados</h3>
      <p style="margin:0;">SINPE: <strong>${escapeHtml(data.paymentInfo.sinpe)}</strong></p>
      <p style="margin:0;">Titular: <strong>${escapeHtml(data.paymentInfo.owner)}</strong></p>
      <p style="margin:0;">Banco: <strong>${escapeHtml(data.paymentInfo.bank)}</strong></p>
      <p style="margin:0;">IBAN USD: <strong>${escapeHtml(data.paymentInfo.ibanUsd || 'No configurada')}</strong></p>
      <p style="margin:0;">IBAN CRC: <strong>${escapeHtml(data.paymentInfo.ibanCrc || 'No configurada')}</strong></p>
    </div>
  `;
}

function formatCrc(value) {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatUsd(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDepositDisplay(usdValue, crcValue, exchangeRate) {
  const usd = formatUsd(usdValue);
  const crc = formatCrc(crcValue);
  return `${usd} (${crc} aprox. a TC ${exchangeRate})`;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildUniqueTimestampFilename(originalName) {
  const extension = path.extname(originalName).toLowerCase();
  const safeExtension = ALLOWED_EXTENSIONS.has(extension) ? extension : '.bin';

  const now = new Date();
  const day = pad(now.getDate());
  const month = pad(now.getMonth() + 1);
  const year = now.getFullYear();
  const hour = pad(now.getHours());
  const minute = pad(now.getMinutes());
  const second = pad(now.getSeconds());

  const base = `${day}${month}${year}${hour}${minute}${second}`;
  let candidate = `${base}${safeExtension}`;
  let counter = 1;

  while (fs.existsSync(path.join(RECEIPTS_DIR, candidate))) {
    candidate = `${base}-${counter}${safeExtension}`;
    counter += 1;
  }

  return candidate;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function listTourImagesByFolder() {
  if (!fs.existsSync(TOURS_DIR)) {
    return {};
  }

  const folders = fs
    .readdirSync(TOURS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  return folders.reduce((acc, folderName) => {
    const folderPath = path.join(TOURS_DIR, folderName);

    const images = fs
      .readdirSync(folderPath, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => TOUR_IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' }))
      .map((fileName) => {
        const encodedFolder = encodeURIComponent(folderName);
        const encodedFile = encodeURIComponent(fileName);
        return `${PUBLIC_BASE_URL}/tours/${encodedFolder}/${encodedFile}`;
      });

    acc[folderName] = images;
    return acc;
  }, {});
}
