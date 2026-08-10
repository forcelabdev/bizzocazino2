const nodemailer = require("nodemailer");
const SiteSettings = require("../database/models/SiteSettings");

// Default token TTL in minutes (also used for default link expiry text)
const DEFAULT_TOKEN_EXPIRES_IN_MINUTES = 30;

// Lazy / cached transport. Recreated when SMTP env values change.
let cachedTransporter = null;
let cachedTransporterKey = "";

const buildTransporter = () => {
	const host = (process.env.EMAIL_SMTP_HOST || "").trim();
	const portRaw = (process.env.EMAIL_SMTP_PORT || "").toString().trim();
	const user = (process.env.EMAIL_SMTP_USER || "").trim();
	const pass = (process.env.EMAIL_SMTP_PASSWORD || "").trim();

	if (!host || !portRaw) {
		throw new Error(
			"SMTP yapılandırması eksik. backend/.env dosyasında EMAIL_SMTP_HOST ve EMAIL_SMTP_PORT tanımlı olmalı."
		);
	}

	const port = Number.parseInt(portRaw, 10);
	if (!Number.isFinite(port) || port <= 0) {
		throw new Error("Geçersiz SMTP portu.");
	}

	const key = `${host}|${port}|${user}`;
	if (cachedTransporter && cachedTransporterKey === key) {
		return cachedTransporter;
	}

	cachedTransporter = nodemailer.createTransport({
		host,
		port,
		secure: port === 465,
		auth: user || pass ? { user, pass } : undefined,
	});
	cachedTransporterKey = key;

	return cachedTransporter;
};

const escapeHtml = (value) =>
	String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

// Replace {{key}} placeholders. URL-like values are inserted verbatim,
// other values are HTML-escaped to avoid template injection from user input.
const renderTemplate = (template, vars = {}) => {
	if (!template || typeof template !== "string") return "";

	const safeVars = vars || {};
	const urlLikeKeys = new Set([
		"verifyUrl",
		"resetUrl",
		"changeEmailUrl",
		"siteUrl",
		"token",
	]);

	return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key) => {
		const value = safeVars[key];
		if (value === undefined || value === null) return "";
		if (urlLikeKeys.has(key)) return String(value);
		return escapeHtml(value);
	});
};

const stripHtml = (html) =>
	String(html || "")
		.replace(/<style[\s\S]*?<\/style>/gi, "")
		.replace(/<script[\s\S]*?<\/script>/gi, "")
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();

const getEmailTemplatesConfig = async () => {
	const settings = await SiteSettings.findOne()
		.select("emailTemplates seo")
		.lean();
	const tpl = (settings && settings.emailTemplates) || {};
	const defaultTemplates = new SiteSettings().emailTemplates || {};
	const fallbackName =
		tpl.fromName ||
		process.env.EMAIL_FROM_NAME ||
		(settings && settings.seo && settings.seo.title) ||
		"";

	return {
		fromName: fallbackName,
		fromAddress: tpl.fromAddress || process.env.EMAIL_FROM || "",
		tokenExpiresInMinutes:
			Number.isFinite(tpl.tokenExpiresInMinutes) &&
			tpl.tokenExpiresInMinutes > 0
				? tpl.tokenExpiresInMinutes
				: DEFAULT_TOKEN_EXPIRES_IN_MINUTES,
		templates: {
			verifyEmail: tpl.verifyEmail || defaultTemplates.verifyEmail || {},
			resetPassword: tpl.resetPassword || defaultTemplates.resetPassword || {},
			changeEmail: tpl.changeEmail || defaultTemplates.changeEmail || {},
			emailOtp: tpl.emailOtp || defaultTemplates.emailOtp || {},
		},
		siteName: fallbackName,
	};
};

// Low-level send. Backwards compatible with old emailSend(to, subject, message)
// that passed a plain text message.
const sendEmail = async ({ to, subject, html, text, from } = {}) => {
	if (!to) throw new Error("E-posta alıcısı (to) belirtilmelidir.");
	if (!subject) throw new Error("E-posta konusu (subject) belirtilmelidir.");
	if (!html && !text) {
		throw new Error("E-posta içeriği (html veya text) belirtilmelidir.");
	}

	const transporter = buildTransporter();

	let resolvedFrom = from;
	if (!resolvedFrom) {
		const fromName = (process.env.EMAIL_FROM_NAME || "").trim();
		const fromAddress = (process.env.EMAIL_FROM || "").trim();
		if (!fromAddress) {
			throw new Error(
				"Gönderici adresi tanımlı değil. backend/.env dosyasında EMAIL_FROM ayarlanmalı."
			);
		}
		resolvedFrom = fromName ? `${fromName} <${fromAddress}>` : fromAddress;
	}

	const options = {
		from: resolvedFrom,
		to,
		subject,
		...(text ? { text } : {}),
		...(html ? { html } : {}),
	};

	if (html && !text) {
		options.text = stripHtml(html);
	}

	return transporter.sendMail(options);
};

// Backwards-compatible helper used by older code paths.
const emailSend = (to, subject, message) =>
	sendEmail({ to, subject, text: message });

const TEMPLATE_KEYS = {
	verifyEmail: "verifyEmail",
	resetPassword: "resetPassword",
	changeEmail: "changeEmail",
	emailOtp: "emailOtp",
};

const sendTemplatedEmail = async ({ to, type, vars = {} } = {}) => {
	if (!to) throw new Error("E-posta alıcısı belirtilmelidir.");
	if (!TEMPLATE_KEYS[type]) {
		throw new Error(`Bilinmeyen e-posta şablonu: ${type}`);
	}

	const config = await getEmailTemplatesConfig();
	const template = config.templates[TEMPLATE_KEYS[type]] || {};

	const mergedVars = {
		...vars,
		siteName: vars.siteName || config.siteName,
		expiresInMinutes:
			vars.expiresInMinutes != null
				? vars.expiresInMinutes
				: config.tokenExpiresInMinutes,
	};

	const subject = renderTemplate(template.subject || "", mergedVars);
	const html = renderTemplate(template.html || "", mergedVars);

	if (!subject || !html) {
		throw new Error(
			`E-posta şablonu boş: ${type}. Lütfen admin panelinden tanımlayın.`
		);
	}

	let from;
	if (config.fromAddress) {
		from = config.fromName
			? `${config.fromName} <${config.fromAddress}>`
			: config.fromAddress;
	}

	return sendEmail({ to, subject, html, from });
};

module.exports = {
	emailSend,
	sendEmail,
	sendTemplatedEmail,
	renderTemplate,
	getEmailTemplatesConfig,
	DEFAULT_TOKEN_EXPIRES_IN_MINUTES,
};
