const User = require("../database/models/User");
const CallScenarioTemplate = require("../database/models/CallScenarioTemplate");
const CallScenarioAssignment = require("../database/models/CallScenarioAssignment");
const {
	createAdminManualAdjustment,
} = require("./adminManualAdjustmentService");
const { RIVO_WALLET } = require("../utils/rivoWallet");

const CATEGORY = "CALL SENARYO BONUSU";
const SOURCE = "call_scenario";

const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;

// ---------------------------------------------------------------------
// Şablon (Template) işlemleri
// ---------------------------------------------------------------------

const listTemplates = async ({ activeOnly = false } = {}) => {
	const filter = {};
	if (activeOnly) filter.active = true;
	return CallScenarioTemplate.find(filter).sort({ createdAt: -1 }).lean();
};

const getTemplate = async (templateId) => {
	const template = await CallScenarioTemplate.findById(templateId);
	if (!template) throw new Error("TEMPLATE_NOT_FOUND");
	return template;
};

const TEMPLATE_FIELDS = [
	"name",
	"bonusAmount",
	"requiredDepositAmount",
	"wageringMultiplier",
	"minWithdrawalAmount",
	"maxWithdrawalAmount",
	"allowedProviders",
	"excludedCategories",
	"rulesText",
	"preventDuplicatePerUser",
	"active",
];

const createTemplate = async (payload = {}, actorUser = null) => {
	const name = String(payload.name || "").trim();
	if (!name) throw new Error("INVALID_TEMPLATE_NAME");

	const existing = await CallScenarioTemplate.findOne({ name });
	if (existing) throw new Error("TEMPLATE_NAME_ALREADY_EXISTS");

	const data = {};
	for (const field of TEMPLATE_FIELDS) {
		if (payload[field] !== undefined) data[field] = payload[field];
	}
	data.name = name;
	data.createdBy = actorUser?._id || null;

	return CallScenarioTemplate.create(data);
};

const updateTemplate = async (templateId, payload = {}) => {
	const template = await getTemplate(templateId);

	if (payload.name !== undefined) {
		const name = String(payload.name || "").trim();
		if (!name) throw new Error("INVALID_TEMPLATE_NAME");
		if (name !== template.name) {
			const existing = await CallScenarioTemplate.findOne({ name });
			if (existing) throw new Error("TEMPLATE_NAME_ALREADY_EXISTS");
		}
		template.name = name;
	}

	for (const field of TEMPLATE_FIELDS) {
		if (field === "name") continue;
		if (payload[field] !== undefined) template[field] = payload[field];
	}

	await template.save();
	return template;
};

// ---------------------------------------------------------------------
// Atama (Assignment) işlemleri
// ---------------------------------------------------------------------

const getUserExistingAssignment = async (userId, templateId) =>
	CallScenarioAssignment.findOne({
		user: userId,
		template: templateId,
		status: { $ne: "cancelled" },
	}).sort({ createdAt: -1 });

/**
 * Bir üyenin, verilen şablonu daha önce (iptal edilmemiş şekilde) alıp
 * almadığını döner. Admin panelindeki atama formu, kullanıcı+şablon
 * seçildiğinde bu kontrolü çağırıp butonu pasifleştirir.
 */
const checkDuplicate = async (userId, templateId) => {
	const template = await CallScenarioTemplate.findById(templateId).lean();
	if (!template) throw new Error("TEMPLATE_NOT_FOUND");

	if (!template.preventDuplicatePerUser) {
		return { blocked: false, template };
	}

	const existing = await getUserExistingAssignment(userId, templateId);
	return { blocked: Boolean(existing), template, existing };
};

/**
 * Admin/temsilci tarafından bir üyeye bir çağrı senaryosu ataması
 * oluşturur ve bonus tutarını cüzdana kredi olarak işler.
 *
 * "Tekrar verilmez" kuralı: preventDuplicatePerUser=true olan şablonlarda,
 * aynı üye+şablon için status != 'cancelled' bir kayıt varsa yeni atama
 * reddedilir (USER_ALREADY_HAS_SCENARIO).
 */
const createAssignment = async ({ userId, templateId, actorUser, note }) => {
	const user = await User.findById(userId);
	if (!user) throw new Error("USER_NOT_FOUND");

	const template = await CallScenarioTemplate.findById(templateId);
	if (!template) throw new Error("TEMPLATE_NOT_FOUND");
	if (!template.active) throw new Error("TEMPLATE_NOT_ACTIVE");

	if (template.preventDuplicatePerUser) {
		const existing = await getUserExistingAssignment(user._id, template._id);
		if (existing) throw new Error("USER_ALREADY_HAS_SCENARIO");
	}

	const assignment = await CallScenarioAssignment.create({
		template: template._id,
		templateNameSnapshot: template.name,
		user: user._id,
		userSnapshot: {
			username: user.username || "",
			name: user.name || "",
			email: user.local?.email || "",
		},
		bonusAmount: roundMoney(template.bonusAmount),
		requiredDepositAmount: roundMoney(template.requiredDepositAmount),
		wageringMultiplier: Number(template.wageringMultiplier || 0),
		minWithdrawalAmount: roundMoney(template.minWithdrawalAmount),
		maxWithdrawalAmount: roundMoney(template.maxWithdrawalAmount),
		allowedProviders: template.allowedProviders || "",
		excludedCategories: template.excludedCategories || "",
		rulesText: template.rulesText || "",
		status: "active",
		note: String(note || "").trim(),
		createdBy: actorUser?._id || null,
	});

	// Bonus tutarı > 0 ise cüzdana kredi olarak işlenir (audit izli).
	if (Number(template.bonusAmount) > 0) {
		try {
			const result = await createAdminManualAdjustment({
				targetUser: user,
				actorUser,
				wallet: RIVO_WALLET,
				kind: "bonus",
				direction: "credit",
				category: CATEGORY,
				note: `Çağrı Senaryosu: ${template.name}`,
				amount: template.bonusAmount,
				source: SOURCE,
				sourceRef: { assignmentId: assignment._id, templateId: template._id },
			});

			assignment.adjustmentRef = result.adjustment._id;
			await assignment.save();
		} catch (err) {
			// Bonus kredisi başarısız olursa atamayı geri al ki tekrar
			// denenebilsin (kural ihlali/dublicate olarak sayılmasın).
			await CallScenarioAssignment.findByIdAndDelete(assignment._id);
			throw err;
		}
	}

	return assignment;
};

const listAssignments = async ({
	userId,
	templateId,
	status,
	page = 1,
	limit = 20,
} = {}) => {
	const filter = {};
	if (userId) filter.user = userId;
	if (templateId) filter.template = templateId;
	if (status) filter.status = status;

	const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
	const [items, total] = await Promise.all([
		CallScenarioAssignment.find(filter)
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(Math.max(1, Number(limit)))
			.populate("template", "name")
			.lean(),
		CallScenarioAssignment.countDocuments(filter),
	]);

	return { items, total, page: Number(page), limit: Number(limit) };
};

const getUserSummary = async (userId) => {
	const assignments = await CallScenarioAssignment.find({ user: userId })
		.sort({ createdAt: -1 })
		.populate("template", "name")
		.lean();

	return { assignments };
};

const cancelAssignment = async (assignmentId, actorUser, reason = "") => {
	const assignment = await CallScenarioAssignment.findById(assignmentId);
	if (!assignment) throw new Error("ASSIGNMENT_NOT_FOUND");
	if (assignment.status !== "active") throw new Error("ASSIGNMENT_NOT_ACTIVE");

	assignment.status = "cancelled";
	assignment.cancelledBy = actorUser?._id || null;
	assignment.cancelledAt = new Date();
	assignment.cancellationReason = String(reason || "").trim();
	await assignment.save();

	return assignment;
};

/**
 * "Kural ihlali durumunda bakiye ve kazanç iptal edilir" maddesi için:
 * atamayı "violated" olarak işaretler. Otomatik bir çevrim/kazanç motoru
 * kurulmadığından, bakiye/kazancın gerçek iptali finans/temsilci
 * tarafından manuel işlem (manuel bakiye düzeltmesi) ile yapılır; burada
 * sadece senaryo kaydı işaretlenir ve audit not tutulur.
 */
const markViolated = async (assignmentId, actorUser, reason = "") => {
	const assignment = await CallScenarioAssignment.findById(assignmentId);
	if (!assignment) throw new Error("ASSIGNMENT_NOT_FOUND");
	if (assignment.status !== "active") throw new Error("ASSIGNMENT_NOT_ACTIVE");

	assignment.status = "violated";
	assignment.violatedBy = actorUser?._id || null;
	assignment.violatedAt = new Date();
	assignment.violationReason = String(reason || "").trim();
	await assignment.save();

	return assignment;
};

const completeAssignment = async (assignmentId, actorUser) => {
	const assignment = await CallScenarioAssignment.findById(assignmentId);
	if (!assignment) throw new Error("ASSIGNMENT_NOT_FOUND");
	if (assignment.status !== "active") throw new Error("ASSIGNMENT_NOT_ACTIVE");

	assignment.status = "completed";
	assignment.completedAt = new Date();
	await assignment.save();
	void actorUser;

	return assignment;
};

module.exports = {
	listTemplates,
	getTemplate,
	createTemplate,
	updateTemplate,
	checkDuplicate,
	createAssignment,
	listAssignments,
	getUserSummary,
	cancelAssignment,
	markViolated,
	completeAssignment,
};
