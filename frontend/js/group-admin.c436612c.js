"use strict";
(self["webpackChunkrivobit_frontend"] = self["webpackChunkrivobit_frontend"] || []).push([
	[638],
	{
		1128: function (t, e, i) {
			i.r(e),
				i.d(e, {
					default: function () {
						return Q;
					},
				});
			var n = i(20641),
				s = i(53751),
				a = i(90033),
				o = i(41864);
			const r = {class: "admin-cashier"},
				l = {class: "cashier-list"},
				d = {class: "list-content"},
				c = {class: "content-loading", key: "loading"},
				h = {class: "content-list", key: "data"},
				u = {class: "content-empty", key: "empty"},
				m = {class: "list-pagination"},
				p = ["disabled"],
				g = {class: "pagination-info"},
				f = {class: "text-green-gradient"},
				v = ["disabled"],
				b = {class: "cashier-filters"},
				k = {class: "filters-generate"};
			function x(t, e, i, x, L, _) {
				const y = (0, n.g2)("LoadingAnimation"),
					w = (0, n.g2)("AdminCashierElement"),
					C = (0, n.g2)("AdminFilterSearch"),
					S = (0, n.g2)("AdminFilterAmount");
				return (
					(0, n.uX)(),
					(0, n.CE)("div", r, [
						(0, n.Lk)("div", l, [
							e[8] ||
								(e[8] = (0, n.Fv)(
									'<div class="list-header" data-v-69f3b044><div class="header-user" data-v-69f3b044>USERNAME</div><div class="header-method" data-v-69f3b044>METHOD</div><div class="header-type" data-v-69f3b044>TYPE</div><div class="header-amount" data-v-69f3b044>AMOUNT</div><div class="header-option" data-v-69f3b044>OPTION</div></div>',
									1
								)),
							(0, n.Lk)("div", d, [
								(0, n.bF)(
									s.eB,
									{name: "fade", mode: "out-in"},
									{
										default: (0, n.k6)(() => [
											null === t.adminCashierList.data || !0 === t.adminCashierList.loading
												? ((0, n.uX)(), (0, n.CE)("div", c, [(0, n.bF)(y)]))
												: t.adminCashierList.data.length > 0
												? ((0, n.uX)(),
												  (0, n.CE)("div", h, [
														((0, n.uX)(!0),
														(0, n.CE)(
															n.FK,
															null,
															(0, n.pI)(t.adminCashierList.data, (t) => ((0, n.uX)(), (0, n.Wv)(w, {key: t._id, transaction: t}, null, 8, ["transaction"]))),
															128
														)),
												  ]))
												: ((0, n.uX)(), (0, n.CE)("div", u, "No transactions found.")),
										]),
										_: 1,
									}
								),
							]),
							(0, n.Lk)("div", m, [
								(0, n.Lk)(
									"button",
									{onClick: e[0] || (e[0] = (e) => _.adminSetPage(t.adminCashierList.page - 1)), class: "button-prev", disabled: t.adminCashierList.page <= 1},
									e[5] ||
										(e[5] = [
											(0, n.Lk)(
												"div",
												{class: "button-inner"},
												[
													(0, n.Lk)("svg", {width: "12", height: "11", viewBox: "0 0 12 11", fill: "none", xmlns: "http://www.w3.org/2000/svg"}, [
														(0, n.Lk)("path", {
															d: "M11.2788 4.30337C11.2297 4.2954 11.18 4.29173 11.1302 4.29237H2.66447L2.84907 4.20651C3.02951 4.12111 3.19366 4.00487 3.33417 3.86307L5.70819 1.48906C6.02085 1.19059 6.07339 0.710444 5.83269 0.351417C5.55254 -0.0311676 5.0153 -0.114237 4.63269 0.165907C4.60178 0.188552 4.5724 0.213237 4.54479 0.2398L0.251817 4.53278C-0.0836794 4.8679 -0.0839745 5.41152 0.251146 5.74702C0.251361 5.74723 0.251602 5.74747 0.251817 5.74769L4.54479 10.0407C4.88056 10.3755 5.42418 10.3747 5.75903 10.039C5.78538 10.0125 5.80999 9.98443 5.83269 9.95481C6.07339 9.59578 6.02085 9.11564 5.70819 8.81717L3.33847 6.43886C3.21249 6.31275 3.06766 6.20701 2.90917 6.12547L2.65159 6.00956H11.083C11.5216 6.02585 11.9064 5.71946 11.9888 5.28834C12.0647 4.82027 11.7468 4.3793 11.2788 4.30337Z",
														}),
													]),
												],
												-1
											),
										]),
									8,
									p
								),
								(0, n.Lk)("div", g, [
									e[6] || (e[6] = (0, n.eW)(" PAGE ", -1)),
									(0, n.Lk)("span", f, (0, a.v_)(t.adminCashierList.page), 1),
									(0, n.eW)(" / " + (0, a.v_)(Math.ceil(t.adminCashierList.count / 12) <= 0 ? "1" : Math.ceil(t.adminCashierList.count / 12)), 1),
								]),
								(0, n.Lk)(
									"button",
									{onClick: e[1] || (e[1] = (e) => _.adminSetPage(t.adminCashierList.page + 1)), class: "button-next", disabled: t.adminCashierList.page >= Math.ceil(t.adminCashierList.count / 12)},
									e[7] ||
										(e[7] = [
											(0, n.Lk)(
												"div",
												{class: "button-inner"},
												[
													(0, n.Lk)("svg", {width: "12", height: "11", viewBox: "0 0 12 11", fill: "none", xmlns: "http://www.w3.org/2000/svg"}, [
														(0, n.Lk)("path", {
															d: "M0.721245 4.30337C0.770346 4.2954 0.820037 4.29173 0.869755 4.29237H9.33553L9.15093 4.20651C8.97049 4.12111 8.80634 4.00487 8.66583 3.86307L6.29181 1.48906C5.97915 1.19059 5.92661 0.710444 6.16731 0.351417C6.44746 -0.0311676 6.9847 -0.114237 7.36731 0.165907C7.39822 0.188552 7.4276 0.213237 7.45521 0.2398L11.7482 4.53278C12.0837 4.8679 12.084 5.41152 11.7489 5.74702C11.7486 5.74723 11.7484 5.74747 11.7482 5.74769L7.45521 10.0407C7.11944 10.3755 6.57582 10.3747 6.24097 10.039C6.21462 10.0125 6.19001 9.98443 6.16731 9.95481C5.92661 9.59578 5.97915 9.11564 6.29181 8.81717L8.66153 6.43886C8.78751 6.31275 8.93234 6.20701 9.09083 6.12547L9.34841 6.00956H0.917005C0.478396 6.02585 0.0935841 5.71946 0.0111866 5.28834C-0.0647192 4.82027 0.253177 4.3793 0.721245 4.30337Z",
														}),
													]),
												],
												-1
											),
										]),
									8,
									v
								),
							]),
						]),
						(0, n.Lk)("div", b, [
							(0, n.bF)(C),
							(0, n.Lk)("div", k, [
								(0, n.bF)(S),
								(0, n.bo)((0, n.Lk)("input", {"onUpdate:modelValue": e[2] || (e[2] = (t) => (L.adminCount = t)), type: "number", placeholder: "Enter card count..."}, null, 512), [
									[s.Jo, L.adminCount],
								]),
								(0, n.bo)((0, n.Lk)("textarea", {"onUpdate:modelValue": e[3] || (e[3] = (t) => (_.adminGetCodes = t)), rows: "10", disabled: ""}, null, 512), [[s.Jo, _.adminGetCodes]]),
								(0, n.Lk)("button", {onClick: e[4] || (e[4] = (t) => _.adminGenerateButton())}, "GENERATE GIFT CARD"),
							]),
							e[9] ||
								(e[9] = (0, n.Fv)(
									'<div class="filters-stats" data-v-69f3b044><div class="stats-deposit" data-v-69f3b044><div class="deposit-title" data-v-69f3b044>DEPOSIT QUEUE</div><div class="deposit-amount" data-v-69f3b044><img src="' +
										o +
										'" alt="icon" data-v-69f3b044><span class="gradient-green" data-v-69f3b044>0</span></div></div><div class="stats-withdraw" data-v-69f3b044><div class="withdraw-title" data-v-69f3b044>WITHDRAW QUEUE</div><div class="withdraw-amount" data-v-69f3b044><img src="' +
										o +
										'" alt="icon" data-v-69f3b044><span data-v-69f3b044>0</span></div></div></div>',
									1
								)),
						]),
					])
				);
			}
			var L = i(66278),
				_ = i(87069);
			const y = {class: "admin-cashier-element"},
				w = {class: "element-section section-user"},
				C = {class: "section-content"},
				S = {class: "content-avatar"},
				A = ["innerHTML"],
				M = {class: "element-section section-method"},
				F = {class: "section-content"},
				D = {class: "section-content"},
				E = {class: "element-section section-amount"},
				T = {class: "section-content"},
				P = {class: "content-value"},
				I = {class: "element-section section-option"},
				B = {class: "section-content"};
			function O(t, e, i, s, r, l) {
				const d = (0, n.g2)("AvatarImage");
				return (
					(0, n.uX)(),
					(0, n.CE)("div", y, [
						(0, n.Lk)("div", w, [
							e[2] || (e[2] = (0, n.Lk)("div", {class: "section-title"}, "USERNAME", -1)),
							(0, n.Lk)("div", C, [
								(0, n.Lk)("div", S, [(0, n.bF)(d, {image: i.transaction.user.avatar}, null, 8, ["image"])]),
								(0, n.Lk)("div", {innerHTML: i.transaction.user.username, class: "content-username"}, null, 8, A),
								(0, n.Lk)("div", {class: (0, a.C4)(["content-rank", ["rank-" + i.transaction.user.rank]])}, (0, a.v_)(i.transaction.user.rank.toUpperCase()), 3),
							]),
						]),
						(0, n.Lk)("div", M, [
							e[3] || (e[3] = (0, n.Lk)("div", {class: "section-title"}, "METHOD", -1)),
							(0, n.Lk)("div", F, (0, a.v_)(i.transaction.method.charAt(0).toUpperCase() + i.transaction.method.slice(1)), 1),
						]),
						(0, n.Lk)(
							"div",
							{class: (0, a.C4)(["element-section section-type", ["type-" + i.transaction.type]])},
							[e[4] || (e[4] = (0, n.Lk)("div", {class: "section-title"}, "TYPE", -1)), (0, n.Lk)("div", D, (0, a.v_)(i.transaction.type.charAt(0).toUpperCase() + i.transaction.type.slice(1)), 1)],
							2
						),
						(0, n.Lk)("div", E, [
							e[6] || (e[6] = (0, n.Lk)("div", {class: "section-title"}, "AMOUNT", -1)),
							(0, n.Lk)("div", T, [
								e[5] || (e[5] = (0, n.Lk)("img", {src: o, alt: "icon"}, null, -1)),
								(0, n.Lk)("div", P, [
									(0, n.Lk)("span", null, (0, a.v_)(l.adminFormatValue(i.transaction.amount).split(".")[0]), 1),
									(0, n.eW)("." + (0, a.v_)(l.adminFormatValue(i.transaction.amount).split(".")[1]), 1),
								]),
							]),
						]),
						(0, n.Lk)("div", I, [
							e[7] || (e[7] = (0, n.Lk)("div", {class: "section-title"}, "OPTION", -1)),
							(0, n.Lk)("div", B, [
								"crypto" === i.transaction.method
									? ((0, n.uX)(), (0, n.CE)("button", {key: 0, onClick: e[0] || (e[0] = (t) => l.adminApproveButton())}, " APPROVE "))
									: ((0, n.uX)(), (0, n.CE)("button", {key: 1, onClick: e[1] || (e[1] = (t) => l.adminCancelButton())}, " CANCEL ")),
							]),
						]),
					])
				);
			}
			var R = i(10838),
				V = {
					name: "AdminCashierElement",
					props: ["transaction"],
					components: {AvatarImage: R.A},
					methods: {
						...(0, L.i0)(["modalsSetData", "modalsSetShow", "adminSendCashierCancelSocket"]),
						adminFormatValue(t) {
							return parseFloat(Math.floor(t / 10) / 100)
								.toFixed(2)
								.toString()
								.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
						},
						adminApproveButton() {
							this.modalsSetData({transaction: this.transaction}), this.modalsSetShow("AdminCrypto");
						},
						adminCancelButton() {
							this.modalsSetData({typeConfirm: "robuxCancel", messageConfirm: "Please confirm that you want cancel the robux transaction.", data: {offerId: this.transaction._id}}),
								this.modalsSetShow("AdminConfirm");
						},
					},
					computed: {...(0, L.L8)(["socketSendLoading"])},
				},
				N = i(66262);
			const z = (0, N.A)(V, [
				["render", O],
				["__scopeId", "data-v-09f4b849"],
			]);
			var W = z,
				H = i(41167);
			const U = {class: "button-value"},
				X = {class: "gradient-green"},
				G = {class: "amount-menu"},
				j = {class: "menu-inner"};
			function $(t, e, i, s, o, r) {
				return (
					(0, n.uX)(),
					(0, n.CE)(
						"div",
						{class: (0, a.C4)(["admin-filter-amount", {"amount-open": !0 === o.adminDropdown}])},
						[
							(0, n.Lk)("button", {onClick: e[0] || (e[0] = (...t) => r.adminToggleDropdown && r.adminToggleDropdown(...t)), class: "button-toggle"}, [
								(0, n.Lk)("div", U, [e[9] || (e[9] = (0, n.eW)(" Amount: ", -1)), (0, n.Lk)("span", X, "$" + (0, a.v_)(t.adminFilterAmount), 1)]),
								e[10] ||
									(e[10] = (0, n.Lk)(
										"svg",
										{width: "10", height: "6", viewBox: "0 0 10 6", fill: "none", xmlns: "http://www.w3.org/2000/svg"},
										[
											(0, n.Lk)("path", {
												d: "M9.5176 1.66411e-06L0.482354 8.43375e-08C0.0547936 9.58042e-09 -0.16302 0.516304 0.143533 0.822859L4.66115 5.34052C4.8467 5.52607 5.15325 5.52607 5.33888 5.34052L9.8565 0.822861C10.163 0.516306 9.94516 1.73887e-06 9.5176 1.66411e-06Z",
											}),
										],
										-1
									)),
							]),
							(0, n.Lk)("div", G, [
								(0, n.Lk)("div", j, [
									(0, n.Lk)("button", {onClick: e[1] || (e[1] = (t) => r.adminSetButton("3"))}, "$3 GIFT CARD"),
									(0, n.Lk)("button", {onClick: e[2] || (e[2] = (t) => r.adminSetButton("5"))}, "$5 GIFT CARD"),
									(0, n.Lk)("button", {onClick: e[3] || (e[3] = (t) => r.adminSetButton("10"))}, "$10 GIFT CARD"),
									(0, n.Lk)("button", {onClick: e[4] || (e[4] = (t) => r.adminSetButton("25"))}, "$25 GIFT CARD"),
									(0, n.Lk)("button", {onClick: e[5] || (e[5] = (t) => r.adminSetButton("50"))}, "$50 GIFT CARD"),
									(0, n.Lk)("button", {onClick: e[6] || (e[6] = (t) => r.adminSetButton("100"))}, "$100 GIFT CARD"),
									(0, n.Lk)("button", {onClick: e[7] || (e[7] = (t) => r.adminSetButton("250"))}, "$250 GIFT CARD"),
									(0, n.Lk)("button", {onClick: e[8] || (e[8] = (t) => r.adminSetButton("500"))}, "$500 GIFT CARD"),
								]),
							]),
						],
						2
					)
				);
			}
			var Y = {
				name: "AdminFilterAmount",
				data() {
					return {adminDropdown: !1};
				},
				methods: {
					...(0, L.i0)(["adminSetFilterAmount"]),
					adminToggleDropdown() {
						this.adminDropdown = !this.adminDropdown;
					},
					adminSetButton(t) {
						this.adminSetFilterAmount(t), this.adminToggleDropdown();
					},
				},
				computed: {...(0, L.L8)(["adminFilterAmount"])},
				created() {
					let t = this;
					document.addEventListener("click", function (e) {
						t.$el.contains(e.target) || 1 != t.adminDropdown || t.adminToggleDropdown();
					});
				},
			};
			const K = (0, N.A)(Y, [
				["render", $],
				["__scopeId", "data-v-2f72300c"],
			]);
			var q = K,
				J = {
					name: "AdminAffiliates",
					components: {LoadingAnimation: _.A, AdminCashierElement: W, AdminFilterSearch: H.A, AdminFilterAmount: q},
					data() {
						return {adminCount: null};
					},
					methods: {
						...(0, L.i0)(["notificationShow", "adminSetFilterSearch", "adminSetCashierListPage", "adminGetCashierListSocket", "adminSendCashierCreateSocket"]),
						adminSetPage(t) {
							if (this.adminCashierList.page === t) return;
							if (t < 1 || t > Math.ceil(this.adminCashierList.count / 12)) return;
							this.adminSetCashierListPage(t);
							const e = {page: this.adminCashierList.page, search: this.adminFilterSearch};
							this.adminGetCashierListSocket(e);
						},
						adminGenerateButton() {
							const t = Math.floor(1e3 * Number(this.adminFilterAmount));
							if (!0 === isNaN(this.adminCount) || this.adminCount <= 0) return void this.notificationShow({type: "error", message: "Your entered card count is invalid."});
							const e = {reward: t, count: this.adminCount};
							this.adminSendCashierCreateSocket(e);
						},
					},
					computed: {
						...(0, L.L8)(["adminFilterSearch", "adminFilterAmount", "adminCashierList"]),
						adminGetCodes() {
							let t = "";
							if (null !== this.adminCashierList.codes)
								for (const e of this.adminCashierList.codes) {
									const i = e.code.substring(0, 4) + "-" + e.code.substring(4, 8) + "-" + e.code.substring(8, 12) + "-" + e.code.substring(12, 16);
									t = 0 !== t.length ? t + ",\n" + i : i;
								}
							return t;
						},
					},
					created() {
						if (!1 === this.adminCashierList.loading) {
							const t = {page: this.adminCashierList.page, search: this.adminFilterSearch};
							this.adminGetCashierListSocket(t);
						}
					},
					beforeRouteLeave(t, e, i) {
						this.adminSetFilterSearch(""), i();
					},
				};
			const Z = (0, N.A)(J, [
				["render", x],
				["__scopeId", "data-v-69f3b044"],
			]);
			var Q = Z;
		},
		3338: function (t, e, i) {
			i.d(e, {
				A: function () {
					return m;
				},
			});
			var n = i(20641),
				s = i(90033);
			const a = {class: "button-value"},
				o = {class: "sort-menu"},
				r = {class: "menu-inner"};
			function l(t, e, i, l, d, c) {
				return (
					(0, n.uX)(),
					(0, n.CE)(
						"div",
						{class: (0, s.C4)(["admin-filter-sort", {"sort-open": !0 === d.adminDropdown}])},
						[
							(0, n.Lk)("button", {onClick: e[0] || (e[0] = (...t) => c.adminToggleDropdown && c.adminToggleDropdown(...t)), class: "button-toggle"}, [
								(0, n.Lk)("div", a, [e[5] || (e[5] = (0, n.eW)(" Sort by: ", -1)), (0, n.Lk)("span", null, (0, s.v_)(t.adminFilterSort), 1)]),
								e[6] ||
									(e[6] = (0, n.Lk)(
										"svg",
										{width: "10", height: "6", viewBox: "0 0 10 6", fill: "none", xmlns: "http://www.w3.org/2000/svg"},
										[
											(0, n.Lk)("path", {
												d: "M9.5176 1.66411e-06L0.482354 8.43375e-08C0.0547936 9.58042e-09 -0.16302 0.516304 0.143533 0.822859L4.66115 5.34052C4.8467 5.52607 5.15325 5.52607 5.33888 5.34052L9.8565 0.822861C10.163 0.516306 9.94516 1.73887e-06 9.5176 1.66411e-06Z",
											}),
										],
										-1
									)),
							]),
							(0, n.Lk)("div", o, [
								(0, n.Lk)("div", r, [
									(0, n.Lk)("button", {onClick: e[1] || (e[1] = (t) => c.adminSetButton("Newest"))}, "Newest"),
									(0, n.Lk)("button", {onClick: e[2] || (e[2] = (t) => c.adminSetButton("Oldest"))}, "Oldest"),
									(0, n.Lk)("button", {onClick: e[3] || (e[3] = (t) => c.adminSetButton("Balance"))}, "Balance"),
									(0, n.Lk)("button", {onClick: e[4] || (e[4] = (t) => c.adminSetButton("Rank"))}, "Rank"),
								]),
							]),
						],
						2
					)
				);
			}
			var d = i(66278),
				c = {
					name: "AdminFilterSort",
					data() {
						return {adminDropdown: !1};
					},
					methods: {
						...(0, d.i0)(["adminSetFilterSort", "adminSetUserListPage", "adminGetUserListSocket", "adminSetAffiliateListPage", "adminGetAffiliateListSocket"]),
						adminToggleDropdown() {
							this.adminDropdown = !this.adminDropdown;
						},
						adminSetButton(t) {
							if ((this.adminSetFilterSort(t), this.adminToggleDropdown(), "AdminUsers" === this.$route.name)) {
								this.adminSetUserListPage(1);
								const t = {page: 1, search: this.adminFilterSearch, sort: this.adminFilterSort.toLowerCase(), select: this.adminFilterSelect.toLowerCase()};
								this.adminGetUserListSocket(t);
							} else if ("AdminAffiliates" === this.$route.name) {
								this.adminSetAffiliateListPage(1);
								const t = {page: 1, search: this.adminFilterSearch, sort: this.adminFilterSort.toLowerCase()};
								this.adminGetAffiliateListSocket(t);
							}
						},
					},
					computed: {...(0, d.L8)(["adminFilterSort", "adminFilterSelect", "adminFilterSearch"])},
					created() {
						let t = this;
						document.addEventListener("click", function (e) {
							t.$el.contains(e.target) || 1 != t.adminDropdown || t.adminToggleDropdown();
						});
					},
				},
				h = i(66262);
			const u = (0, h.A)(c, [
				["render", l],
				["__scopeId", "data-v-8a355cda"],
			]);
			var m = u;
		},
		5054: function (t, e, i) {
			i.r(e),
				i.d(e, {
					default: function () {
						return v;
					},
				});
			var n = i(20641),
				s = i(53751),
				a = i(90033);
			const o = {class: "admin-bonus"},
				r = ["src"],
				l = ["onClick"],
				d = ["onClick"],
				c = {key: 0, class: "modal"},
				h = {class: "modal-content"};
			function u(t, e, i, u, m, p) {
				return (
					(0, n.uX)(),
					(0, n.CE)("div", o, [
						e[21] || (e[21] = (0, n.Lk)("h1", null, "Bonus Management", -1)),
						(0, n.Lk)(
							"form",
							{onSubmit: e[6] || (e[6] = (0, s.D$)((...t) => p.addBonus && p.addBonus(...t), ["prevent"])), enctype: "multipart/form-data"},
							[
								e[16] || (e[16] = (0, n.Lk)("h2", null, "Add New Bonus", -1)),
								(0, n.bo)((0, n.Lk)("input", {"onUpdate:modelValue": e[0] || (e[0] = (t) => (m.newBonus.title = t)), type: "text", placeholder: "Bonus Title", required: ""}, null, 512), [
									[s.Jo, m.newBonus.title],
								]),
								(0, n.bo)((0, n.Lk)("input", {"onUpdate:modelValue": e[1] || (e[1] = (t) => (m.newBonus.description = t)), type: "text", placeholder: "Bonus Description", required: ""}, null, 512), [
									[s.Jo, m.newBonus.description],
								]),
								(0, n.bo)((0, n.Lk)("textarea", {"onUpdate:modelValue": e[2] || (e[2] = (t) => (m.newBonus.modalDescription = t)), placeholder: "Modal Description", required: ""}, null, 512), [
									[s.Jo, m.newBonus.modalDescription],
								]),
								(0, n.bo)((0, n.Lk)("input", {"onUpdate:modelValue": e[3] || (e[3] = (t) => (m.newBonus.percentage = t)), type: "number", placeholder: "Bonus Percentage", required: ""}, null, 512), [
									[s.Jo, m.newBonus.percentage],
								]),
								(0, n.Lk)("input", {type: "file", onChange: e[4] || (e[4] = (...t) => p.onFileChange && p.onFileChange(...t)), accept: "image/*", required: ""}, null, 32),
								(0, n.bo)(
									(0, n.Lk)(
										"select",
										{"onUpdate:modelValue": e[5] || (e[5] = (t) => (m.newBonus.bonusType = t)), required: ""},
										e[15] || (e[15] = [(0, n.Lk)("option", {value: "welcome"}, "Welcome Bonus", -1), (0, n.Lk)("option", {value: "freespin"}, "Free Spin Bonus", -1)]),
										512
									),
									[[s.u1, m.newBonus.bonusType]]
								),
								e[17] || (e[17] = (0, n.Lk)("button", {type: "submit"}, "Add Bonus", -1)),
							],
							32
						),
						e[22] || (e[22] = (0, n.Lk)("h2", null, "Bonus List", -1)),
						(0, n.Lk)("table", null, [
							e[18] ||
								(e[18] = (0, n.Lk)(
									"thead",
									null,
									[
										(0, n.Lk)("tr", null, [
											(0, n.Lk)("th", null, "Title"),
											(0, n.Lk)("th", null, "Description"),
											(0, n.Lk)("th", null, "Modal Description"),
											(0, n.Lk)("th", null, "Percentage"),
											(0, n.Lk)("th", null, "Bonus Type"),
											(0, n.Lk)("th", null, "Image"),
											(0, n.Lk)("th", null, "Actions"),
										]),
									],
									-1
								)),
							(0, n.Lk)("tbody", null, [
								((0, n.uX)(!0),
								(0, n.CE)(
									n.FK,
									null,
									(0, n.pI)(
										m.bonuses,
										(e) => (
											(0, n.uX)(),
											(0, n.CE)("tr", {key: e._id}, [
												(0, n.Lk)("td", null, (0, a.v_)(e.title), 1),
												(0, n.Lk)("td", null, (0, a.v_)(e.description), 1),
												(0, n.Lk)("td", null, (0, a.v_)(e.modalDescription), 1),
												(0, n.Lk)("td", null, (0, a.v_)(e.percentage) + "%", 1),
												(0, n.Lk)("td", null, (0, a.v_)(e.bonusType), 1),
												(0, n.Lk)("td", null, [(0, n.Lk)("img", {src: e.img, alt: "Bonus Image", width: "100"}, null, 8, r)]),
												(0, n.Lk)("td", null, [(0, n.Lk)("button", {onClick: (i) => t.editBonus(e)}, "Edit", 8, l), (0, n.Lk)("button", {onClick: (t) => p.deleteBonus(e._id)}, "Delete", 8, d)]),
											])
										)
									),
									128
								)),
							]),
						]),
						m.editMode
							? ((0, n.uX)(),
							  (0, n.CE)("div", c, [
									(0, n.Lk)("div", h, [
										e[20] || (e[20] = (0, n.Lk)("h3", null, "Edit Bonus", -1)),
										(0, n.bo)((0, n.Lk)("input", {"onUpdate:modelValue": e[7] || (e[7] = (t) => (m.editBonusData.title = t)), type: "text", placeholder: "Title", required: ""}, null, 512), [
											[s.Jo, m.editBonusData.title],
										]),
										(0, n.bo)(
											(0, n.Lk)("input", {"onUpdate:modelValue": e[8] || (e[8] = (t) => (m.editBonusData.description = t)), type: "text", placeholder: "Description", required: ""}, null, 512),
											[[s.Jo, m.editBonusData.description]]
										),
										(0, n.bo)(
											(0, n.Lk)("textarea", {"onUpdate:modelValue": e[9] || (e[9] = (t) => (m.editBonusData.modalDescription = t)), placeholder: "Modal Description", required: ""}, null, 512),
											[[s.Jo, m.editBonusData.modalDescription]]
										),
										(0, n.bo)(
											(0, n.Lk)("input", {"onUpdate:modelValue": e[10] || (e[10] = (t) => (m.editBonusData.percentage = t)), type: "number", placeholder: "Percentage", required: ""}, null, 512),
											[[s.Jo, m.editBonusData.percentage]]
										),
										(0, n.Lk)("input", {type: "file", onChange: e[11] || (e[11] = (...t) => p.onFileChangeEdit && p.onFileChangeEdit(...t)), accept: "image/*"}, null, 32),
										(0, n.bo)(
											(0, n.Lk)(
												"select",
												{"onUpdate:modelValue": e[12] || (e[12] = (t) => (m.editBonusData.bonusType = t)), required: ""},
												e[19] || (e[19] = [(0, n.Lk)("option", {value: "welcome"}, "Welcome Bonus", -1), (0, n.Lk)("option", {value: "freespin"}, "Free Spin Bonus", -1)]),
												512
											),
											[[s.u1, m.editBonusData.bonusType]]
										),
										(0, n.Lk)("button", {onClick: e[13] || (e[13] = (...t) => p.updateBonus && p.updateBonus(...t))}, "Save Changes"),
										(0, n.Lk)("button", {onClick: e[14] || (e[14] = (...t) => p.cancelEdit && p.cancelEdit(...t))}, "Cancel"),
									]),
							  ]))
							: (0, n.Q3)("", !0),
					])
				);
			}
			var m = i(94335),
				p = {
					data() {
						return {
							bonuses: [],
							newBonus: {title: "", description: "", modalDescription: "", percentage: 0, bonusType: "welcome", img: null},
							editBonusData: null,
							editMode: !1,
							selectedImageFile: null,
							selectedEditImageFile: null,
						};
					},
					mounted() {
						this.fetchBonuses();
					},
					methods: {
						async fetchBonuses() {
							try {
								const t = await m.A.get("https://api.guotai9189.com/bonus");
								this.bonuses = t.data;
							} catch (t) {
								console.error("Error fetching bonuses:", t);
							}
						},
						onFileChange(t) {
							this.selectedImageFile = t.target.files[0];
						},
						async addBonus() {
							try {
								const t = new FormData();
								t.append("title", this.newBonus.title),
									t.append("description", this.newBonus.description),
									t.append("modalDescription", this.newBonus.modalDescription),
									t.append("percentage", this.newBonus.percentage),
									t.append("bonusType", this.newBonus.bonusType),
									t.append("img", this.selectedImageFile),
									await m.A.post("https://api.guotai9189.com/bonus/add", t, {headers: {"Content-Type": "multipart/form-data"}}),
									this.fetchBonuses(),
									this.resetForm();
							} catch (t) {
								console.error("Error adding bonus:", t);
							}
						},
						onFileChangeEdit(t) {
							this.selectedEditImageFile = t.target.files[0];
						},
						async updateBonus() {
							try {
								const t = new FormData();
								t.append("title", this.editBonusData.title),
									t.append("description", this.editBonusData.description),
									t.append("modalDescription", this.editBonusData.modalDescription),
									t.append("percentage", this.editBonusData.percentage),
									t.append("bonusType", this.editBonusData.bonusType),
									this.selectedEditImageFile && t.append("img", this.selectedEditImageFile),
									await m.A.put(`https://api.guotai9189.com/bonus/${this.editBonusData._id}`, t, {headers: {"Content-Type": "multipart/form-data"}}),
									this.fetchBonuses(),
									(this.editMode = !1);
							} catch (t) {
								console.error("Error updating bonus:", t);
							}
						},
						async deleteBonus(t) {
							try {
								await m.A.delete(`https://api.guotai9189.com/bonus/${t}`), this.fetchBonuses();
							} catch (e) {
								console.error("Error deleting bonus:", e);
							}
						},
						resetForm() {
							(this.newBonus = {title: "", description: "", modalDescription: "", percentage: 0, bonusType: "welcome", img: null}), (this.selectedImageFile = null);
						},
						cancelEdit() {
							(this.editMode = !1), (this.selectedEditImageFile = null);
						},
					},
				},
				g = i(66262);
			const f = (0, g.A)(p, [
				["render", u],
				["__scopeId", "data-v-4faa3fe5"],
			]);
			var v = f;
		},
		12073: function (t, e, i) {
			i.r(e),
				i.d(e, {
					default: function () {
						return b;
					},
				});
			var n = i(20641),
				s = i(53751),
				a = i(90033);
			const o = {class: "games-container"},
				r = {class: "search-bar"},
				l = {class: "games-table"},
				d = ["src"],
				c = ["onClick"],
				h = {key: 0, class: "modal"},
				u = {class: "modal-content"};
			function m(t, e, i, m, p, g) {
				return (
					(0, n.uX)(),
					(0, n.CE)("div", o, [
						e[20] || (e[20] = (0, n.Lk)("h1", null, "Oyun Yönetimi", -1)),
						(0, n.Lk)("div", r, [
							(0, n.bo)(
								(0, n.Lk)(
									"input",
									{"onUpdate:modelValue": e[0] || (e[0] = (t) => (p.searchQuery.game_name = t)), placeholder: "Oyun Adı Ara", onInput: e[1] || (e[1] = (...t) => g.fetchGames && g.fetchGames(...t))},
									null,
									544
								),
								[[s.Jo, p.searchQuery.game_name]]
							),
							(0, n.bo)(
								(0, n.Lk)(
									"input",
									{
										"onUpdate:modelValue": e[2] || (e[2] = (t) => (p.searchQuery.provider_code = t)),
										placeholder: "Sağlayıcı Kodu Ara",
										onInput: e[3] || (e[3] = (...t) => g.fetchGames && g.fetchGames(...t)),
									},
									null,
									544
								),
								[[s.Jo, p.searchQuery.provider_code]]
							),
						]),
						(0, n.Lk)("table", l, [
							e[11] ||
								(e[11] = (0, n.Lk)(
									"thead",
									null,
									[
										(0, n.Lk)("tr", null, [
											(0, n.Lk)("th", null, "Banner"),
											(0, n.Lk)("th", null, "İsim"),
											(0, n.Lk)("th", null, "Kod"),
											(0, n.Lk)("th", null, "Sağlayıcı Kodu"),
											(0, n.Lk)("th", null, "Tür"),
											(0, n.Lk)("th", null, "Durum"),
											(0, n.Lk)("th", null, "Oluşturulma Tarihi"),
											(0, n.Lk)("th", null, "Güncellenme Tarihi"),
											(0, n.Lk)("th", null, "İşlem"),
										]),
									],
									-1
								)),
							(0, n.Lk)("tbody", null, [
								((0, n.uX)(!0),
								(0, n.CE)(
									n.FK,
									null,
									(0, n.pI)(
										p.games,
										(t) => (
											(0, n.uX)(),
											(0, n.CE)("tr", {key: t._id}, [
												(0, n.Lk)("td", null, [(0, n.Lk)("img", {src: t.banner_url, alt: "Banner", class: "game-banner"}, null, 8, d)]),
												(0, n.Lk)("td", null, (0, a.v_)(t.game_name), 1),
												(0, n.Lk)("td", null, (0, a.v_)(t.game_code), 1),
												(0, n.Lk)("td", null, (0, a.v_)(t.provider_code), 1),
												(0, n.Lk)("td", null, (0, a.v_)(t.game_type), 1),
												(0, n.Lk)("td", null, (0, a.v_)(t.status), 1),
												(0, n.Lk)("td", null, (0, a.v_)(g.formatDate(t.createdAt)), 1),
												(0, n.Lk)("td", null, (0, a.v_)(g.formatDate(t.updatedAt)), 1),
												(0, n.Lk)("td", null, [(0, n.Lk)("button", {onClick: (e) => g.editGame(t)}, "Düzenle", 8, c)]),
											])
										)
									),
									128
								)),
							]),
						]),
						p.selectedGame
							? ((0, n.uX)(),
							  (0, n.CE)("div", h, [
									(0, n.Lk)("div", u, [
										e[19] || (e[19] = (0, n.Lk)("h2", null, "Oyun Düzenle", -1)),
										(0, n.Lk)(
											"form",
											{onSubmit: e[10] || (e[10] = (0, s.D$)((...t) => g.updateGame && g.updateGame(...t), ["prevent"]))},
											[
												(0, n.Lk)("label", null, [
													e[12] || (e[12] = (0, n.eW)(" İsim: ", -1)),
													(0, n.bo)((0, n.Lk)("input", {"onUpdate:modelValue": e[4] || (e[4] = (t) => (p.selectedGame.game_name = t))}, null, 512), [[s.Jo, p.selectedGame.game_name]]),
												]),
												(0, n.Lk)("label", null, [
													e[13] || (e[13] = (0, n.eW)(" Kod: ", -1)),
													(0, n.bo)((0, n.Lk)("input", {"onUpdate:modelValue": e[5] || (e[5] = (t) => (p.selectedGame.game_code = t))}, null, 512), [[s.Jo, p.selectedGame.game_code]]),
												]),
												(0, n.Lk)("label", null, [
													e[14] || (e[14] = (0, n.eW)(" Sağlayıcı Kodu: ", -1)),
													(0, n.bo)((0, n.Lk)("input", {"onUpdate:modelValue": e[6] || (e[6] = (t) => (p.selectedGame.provider_code = t))}, null, 512), [[s.Jo, p.selectedGame.provider_code]]),
												]),
												(0, n.Lk)("label", null, [
													e[15] || (e[15] = (0, n.eW)(" Tür: ", -1)),
													(0, n.bo)((0, n.Lk)("input", {"onUpdate:modelValue": e[7] || (e[7] = (t) => (p.selectedGame.game_type = t))}, null, 512), [[s.Jo, p.selectedGame.game_type]]),
												]),
												(0, n.Lk)("label", null, [
													e[17] || (e[17] = (0, n.eW)(" Durum: ", -1)),
													(0, n.bo)(
														(0, n.Lk)(
															"select",
															{"onUpdate:modelValue": e[8] || (e[8] = (t) => (p.selectedGame.status = t))},
															e[16] || (e[16] = [(0, n.Lk)("option", {value: "active"}, "Aktif", -1), (0, n.Lk)("option", {value: "inactive"}, "Pasif", -1)]),
															512
														),
														[[s.u1, p.selectedGame.status]]
													),
												]),
												e[18] || (e[18] = (0, n.Lk)("button", {type: "submit"}, "Kaydet", -1)),
												(0, n.Lk)("button", {onClick: e[9] || (e[9] = (t) => (p.selectedGame = null))}, "Kapat"),
											],
											32
										),
									]),
							  ]))
							: (0, n.Q3)("", !0),
					])
				);
			}
			var p = i(94335),
				g = {
					data() {
						return {games: [], searchQuery: {game_name: "", provider_code: ""}, selectedGame: null};
					},
					methods: {
						async fetchGames() {
							try {
								const t = await p.A.get("/games/search", {params: this.searchQuery});
								this.games = t.data.data;
							} catch (t) {
								console.error("Oyunlar alınamadı:", t);
							}
						},
						async updateGame() {
							try {
								await p.A.put(`/games/${this.selectedGame._id}`, this.selectedGame);
								this.fetchGames(), (this.selectedGame = null);
							} catch (t) {
								console.error("Oyun güncellenemedi:", t);
							}
						},
						editGame(t) {
							this.selectedGame = {...t};
						},
						formatDate(t) {
							return new Date(t).toLocaleDateString();
						},
					},
					mounted() {
						this.fetchGames();
					},
				},
				f = i(66262);
			const v = (0, f.A)(g, [["render", m]]);
			var b = v;
		},
		13113: function (t, e, i) {
			i.r(e),
				i.d(e, {
					default: function () {
						return m;
					},
				});
			var n = i(20641),
				s = i(53751);
			const a = {class: "admin-notice"},
				o = {class: "form-group"},
				r = {class: "form-group"};
			function l(t, e, i, l, d, c) {
				return (
					(0, n.uX)(),
					(0, n.CE)("div", a, [
						e[7] || (e[7] = (0, n.Lk)("h1", {class: "title"}, "Bildirim Gönder", -1)),
						(0, n.Lk)(
							"form",
							{class: "bulk-form", onSubmit: e[2] || (e[2] = (0, s.D$)((...t) => c.sendBulkNotice && c.sendBulkNotice(...t), ["prevent"]))},
							[
								e[5] || (e[5] = (0, n.Lk)("h2", {class: "form-header"}, "Toplu Bildirim Gönder", -1)),
								(0, n.Lk)("div", o, [
									e[3] || (e[3] = (0, n.Lk)("label", {for: "bulk-title"}, "Başlık:", -1)),
									(0, n.bo)((0, n.Lk)("input", {type: "text", "onUpdate:modelValue": e[0] || (e[0] = (t) => (d.bulkTitle = t)), id: "bulk-title", required: ""}, null, 512), [[s.Jo, d.bulkTitle]]),
								]),
								(0, n.Lk)("div", r, [
									e[4] || (e[4] = (0, n.Lk)("label", {for: "bulk-message"}, "Mesaj:", -1)),
									(0, n.bo)((0, n.Lk)("textarea", {"onUpdate:modelValue": e[1] || (e[1] = (t) => (d.bulkMessage = t)), id: "bulk-message", required: ""}, null, 512), [[s.Jo, d.bulkMessage]]),
								]),
								e[6] || (e[6] = (0, n.Lk)("button", {type: "submit", class: "bulk-button"}, "Tüm Kullanıcılara Gönder", -1)),
							],
							32
						),
					])
				);
			}
			i(18111), i(22489);
			var d = i(94335),
				c = {
					data() {
						return {users: [], bulkTitle: "", bulkMessage: "", individualTitle: "", individualMessage: "", showModal: !1, selectedUserId: null, searchQuery: ""};
					},
					mounted() {
						this.fetchUsers();
					},
					computed: {
						filteredUsers() {
							return this.users.filter((t) => t.username.toLowerCase().includes(this.searchQuery.toLowerCase()));
						},
					},
					methods: {
						async fetchUsers() {
							try {
								const t = await d.A.get("http://192.168.1.111:5000/notices/users");
								this.users = t.data;
							} catch (t) {
								console.error("Error fetching users:", t);
							}
						},
						async sendBulkNotice() {
							try {
								await d.A.post("http://192.168.1.111:5000/notices/bulk", {title: this.bulkTitle, message: this.bulkMessage}),
									alert("Toplu bildirim gönderildi."),
									(this.bulkTitle = ""),
									(this.bulkMessage = "");
							} catch (t) {
								console.error("Error sending bulk notice:", t);
							}
						},
						openModal(t) {
							(this.selectedUserId = t), (this.showModal = !0);
						},
						async sendIndividualNotice() {
							try {
								await d.A.post("http://192.168.1.111:5000/notices/individual", {title: this.individualTitle, message: this.individualMessage, recipientId: this.selectedUserId}),
									alert("Bireysel bildirim gönderildi."),
									(this.individualTitle = ""),
									(this.individualMessage = ""),
									(this.showModal = !1);
							} catch (t) {
								console.error("Error sending individual notice:", t);
							}
						},
					},
				},
				h = i(66262);
			const u = (0, h.A)(c, [
				["render", l],
				["__scopeId", "data-v-3e25a249"],
			]);
			var m = u;
		},
		22947: function (t, e, i) {
			i.r(e),
				i.d(e, {
					default: function () {
						return X;
					},
				});
			var n = i(20641),
				s = i(53751),
				a = i(90033);
			const o = {class: "admin-stats"},
				r = {class: "stats-list"},
				l = {class: "list-content"},
				d = {class: "content-loading", key: "loading"},
				c = {class: "content-list", key: "data"},
				h = {class: "content-empty", key: "empty"},
				u = {class: "list-pagination"},
				m = ["disabled"],
				p = {class: "pagination-info"},
				g = {class: "text-green-gradient"},
				f = ["disabled"];
			function v(t, e, i, v, b, k) {
				const x = (0, n.g2)("LoadingAnimation"),
					L = (0, n.g2)("AdminStatsElement");
				return (
					(0, n.uX)(),
					(0, n.CE)("div", o, [
						(0, n.Lk)("div", r, [
							e[5] ||
								(e[5] = (0, n.Fv)(
									'<div class="list-header" data-v-4e9efc28><div class="header-date" data-v-4e9efc28>DATE</div><div class="header-npc" data-v-4e9efc28>NPC</div><div class="header-limiteds" data-v-4e9efc28>LIMITEDS</div><div class="header-robux" data-v-4e9efc28>ROBUX</div><div class="header-steam" data-v-4e9efc28>STEAM</div><div class="header-gift" data-v-4e9efc28>GIFT CARDS</div><div class="header-crypto" data-v-4e9efc28>CRYPTO</div><div class="header-cc" data-v-4e9efc28>CC</div><div class="header-profit" data-v-4e9efc28>NET PROFIT</div></div>',
									1
								)),
							(0, n.Lk)("div", l, [
								(0, n.bF)(
									s.eB,
									{name: "fade", mode: "out-in"},
									{
										default: (0, n.k6)(() => [
											null === t.adminStatsList.data || !0 === t.adminStatsList.loading
												? ((0, n.uX)(), (0, n.CE)("div", d, [(0, n.bF)(x)]))
												: t.adminStatsList.data.length > 0
												? ((0, n.uX)(),
												  (0, n.CE)("div", c, [
														((0, n.uX)(!0),
														(0, n.CE)(
															n.FK,
															null,
															(0, n.pI)(t.adminStatsList.data, (t) => ((0, n.uX)(), (0, n.Wv)(L, {key: t._id, stat: t}, null, 8, ["stat"]))),
															128
														)),
												  ]))
												: ((0, n.uX)(), (0, n.CE)("div", h, "No stats found.")),
										]),
										_: 1,
									}
								),
							]),
							(0, n.Lk)("div", u, [
								(0, n.Lk)(
									"button",
									{onClick: e[0] || (e[0] = (e) => k.adminSetPage(t.adminStatsList.page - 1)), class: "button-prev", disabled: t.adminStatsList.page <= 1},
									e[2] ||
										(e[2] = [
											(0, n.Lk)(
												"div",
												{class: "button-inner"},
												[
													(0, n.Lk)("svg", {width: "12", height: "11", viewBox: "0 0 12 11", fill: "none", xmlns: "http://www.w3.org/2000/svg"}, [
														(0, n.Lk)("path", {
															d: "M11.2788 4.30337C11.2297 4.2954 11.18 4.29173 11.1302 4.29237H2.66447L2.84907 4.20651C3.02951 4.12111 3.19366 4.00487 3.33417 3.86307L5.70819 1.48906C6.02085 1.19059 6.07339 0.710444 5.83269 0.351417C5.55254 -0.0311676 5.0153 -0.114237 4.63269 0.165907C4.60178 0.188552 4.5724 0.213237 4.54479 0.2398L0.251817 4.53278C-0.0836794 4.8679 -0.0839745 5.41152 0.251146 5.74702C0.251361 5.74723 0.251602 5.74747 0.251817 5.74769L4.54479 10.0407C4.88056 10.3755 5.42418 10.3747 5.75903 10.039C5.78538 10.0125 5.80999 9.98443 5.83269 9.95481C6.07339 9.59578 6.02085 9.11564 5.70819 8.81717L3.33847 6.43886C3.21249 6.31275 3.06766 6.20701 2.90917 6.12547L2.65159 6.00956H11.083C11.5216 6.02585 11.9064 5.71946 11.9888 5.28834C12.0647 4.82027 11.7468 4.3793 11.2788 4.30337Z",
														}),
													]),
												],
												-1
											),
										]),
									8,
									m
								),
								(0, n.Lk)("div", p, [
									e[3] || (e[3] = (0, n.eW)(" PAGE ", -1)),
									(0, n.Lk)("span", g, (0, a.v_)(t.adminStatsList.page), 1),
									(0, n.eW)(" / " + (0, a.v_)(Math.ceil(t.adminStatsList.count / 12) <= 0 ? "1" : Math.ceil(t.adminStatsList.count / 12)), 1),
								]),
								(0, n.Lk)(
									"button",
									{onClick: e[1] || (e[1] = (e) => k.adminSetPage(t.adminStatsList.page + 1)), class: "button-next", disabled: t.adminStatsList.page >= Math.ceil(t.adminStatsList.count / 12)},
									e[4] ||
										(e[4] = [
											(0, n.Lk)(
												"div",
												{class: "button-inner"},
												[
													(0, n.Lk)("svg", {width: "12", height: "11", viewBox: "0 0 12 11", fill: "none", xmlns: "http://www.w3.org/2000/svg"}, [
														(0, n.Lk)("path", {
															d: "M0.721245 4.30337C0.770346 4.2954 0.820037 4.29173 0.869755 4.29237H9.33553L9.15093 4.20651C8.97049 4.12111 8.80634 4.00487 8.66583 3.86307L6.29181 1.48906C5.97915 1.19059 5.92661 0.710444 6.16731 0.351417C6.44746 -0.0311676 6.9847 -0.114237 7.36731 0.165907C7.39822 0.188552 7.4276 0.213237 7.45521 0.2398L11.7482 4.53278C12.0837 4.8679 12.084 5.41152 11.7489 5.74702C11.7486 5.74723 11.7484 5.74747 11.7482 5.74769L7.45521 10.0407C7.11944 10.3755 6.57582 10.3747 6.24097 10.039C6.21462 10.0125 6.19001 9.98443 6.16731 9.95481C5.92661 9.59578 5.97915 9.11564 6.29181 8.81717L8.66153 6.43886C8.78751 6.31275 8.93234 6.20701 9.09083 6.12547L9.34841 6.00956H0.917005C0.478396 6.02585 0.0935841 5.71946 0.0111866 5.28834C-0.0647192 4.82027 0.253177 4.3793 0.721245 4.30337Z",
														}),
													]),
												],
												-1
											),
										]),
									8,
									f
								),
							]),
						]),
					])
				);
			}
			var b = i(66278),
				k = i(87069),
				x = i(41864);
			const L = {class: "admin-stats-element"},
				_ = {class: "element-section section-date"},
				y = {class: "section-content"},
				w = {class: "element-section section-npc"},
				C = {class: "section-content"},
				S = {class: "element-section section-limiteds"},
				A = {class: "section-content"},
				M = {class: "content-value"},
				F = {class: "element-section section-robux"},
				D = {class: "section-content"},
				E = {class: "content-value"},
				T = {class: "section-content"},
				P = {class: "section-content"},
				I = {class: "section-content"},
				B = {class: "section-content"},
				O = {class: "section-content"};
			function R(t, e, i, s, o, r) {
				return (
					(0, n.uX)(),
					(0, n.CE)("div", L, [
						(0, n.Lk)("div", _, [e[0] || (e[0] = (0, n.Lk)("div", {class: "section-title"}, "DATE", -1)), (0, n.Lk)("div", y, (0, a.v_)(new Date(i.stat.createdAt).toLocaleDateString("en-US")), 1)]),
						(0, n.Lk)("div", w, [e[1] || (e[1] = (0, n.Lk)("div", {class: "section-title"}, "NPC", -1)), (0, n.Lk)("div", C, (0, a.v_)(i.stat.stats.total.user), 1)]),
						(0, n.Lk)("div", S, [
							e[3] || (e[3] = (0, n.Lk)("div", {class: "section-title"}, "LIMITEDS", -1)),
							(0, n.Lk)("div", A, [
								e[2] || (e[2] = (0, n.Lk)("img", {src: x, alt: "icon"}, null, -1)),
								(0, n.Lk)("div", M, [
									(0, n.Lk)("span", null, (0, a.v_)(r.adminFormatValue(i.stat.stats.limited.deposit).split(".")[0]), 1),
									(0, n.eW)("." + (0, a.v_)(r.adminFormatValue(i.stat.stats.limited.deposit - i.stat.stats.limited.withdraw).split(".")[1]), 1),
								]),
							]),
						]),
						(0, n.Lk)("div", F, [
							e[5] || (e[5] = (0, n.Lk)("div", {class: "section-title"}, "ROBUX", -1)),
							(0, n.Lk)("div", D, [
								e[4] || (e[4] = (0, n.Lk)("img", {src: x, alt: "icon"}, null, -1)),
								(0, n.Lk)("div", E, [
									(0, n.Lk)("span", null, (0, a.v_)(r.adminFormatValue(i.stat.stats.robux.deposit).split(".")[0]), 1),
									(0, n.eW)("." + (0, a.v_)(r.adminFormatValue(i.stat.stats.robux.deposit - i.stat.stats.robux.withdraw).split(".")[1]), 1),
								]),
							]),
						]),
						(0, n.Lk)(
							"div",
							{class: (0, a.C4)(["element-section section-steam", {"section-positive": i.stat.stats.steam.deposit - i.stat.stats.steam.withdraw >= 0}])},
							[
								e[6] || (e[6] = (0, n.Lk)("div", {class: "section-title"}, "STEAM", -1)),
								(0, n.Lk)("div", T, " $" + (0, a.v_)(r.adminFormatValue(i.stat.stats.steam.deposit - i.stat.stats.steam.withdraw)), 1),
							],
							2
						),
						(0, n.Lk)(
							"div",
							{class: (0, a.C4)(["element-section section-gift", {"section-positive": i.stat.stats.gift.deposit - i.stat.stats.gift.withdraw >= 0}])},
							[
								e[7] || (e[7] = (0, n.Lk)("div", {class: "section-title"}, "GIFT CARDS", -1)),
								(0, n.Lk)("div", P, " $" + (0, a.v_)(r.adminFormatValue(i.stat.stats.gift.deposit - i.stat.stats.gift.withdraw)), 1),
							],
							2
						),
						(0, n.Lk)(
							"div",
							{class: (0, a.C4)(["element-section section-crypto", {"section-positive": i.stat.stats.crypto.deposit - i.stat.stats.crypto.withdraw >= 0}])},
							[
								e[8] || (e[8] = (0, n.Lk)("div", {class: "section-title"}, "CRYPTO", -1)),
								(0, n.Lk)("div", I, " $" + (0, a.v_)(r.adminFormatValue(i.stat.stats.crypto.deposit - i.stat.stats.crypto.withdraw)), 1),
							],
							2
						),
						(0, n.Lk)(
							"div",
							{class: (0, a.C4)(["element-section section-cc", {"section-positive": i.stat.stats.credit.deposit - i.stat.stats.credit.withdraw >= 0}])},
							[
								e[9] || (e[9] = (0, n.Lk)("div", {class: "section-title"}, "CC", -1)),
								(0, n.Lk)("div", B, " $" + (0, a.v_)(r.adminFormatValue(i.stat.stats.credit.deposit - i.stat.stats.credit.withdraw)), 1),
							],
							2
						),
						(0, n.Lk)(
							"div",
							{class: (0, a.C4)(["element-section section-profit", {"section-positive": i.stat.stats.total.deposit - i.stat.stats.total.withdraw >= 0}])},
							[
								e[10] || (e[10] = (0, n.Lk)("div", {class: "section-title"}, "NET PROFIT", -1)),
								(0, n.Lk)("div", O, " $" + (0, a.v_)(r.adminFormatValue(i.stat.stats.total.deposit - i.stat.stats.total.withdraw)), 1),
							],
							2
						),
					])
				);
			}
			var V = {
					name: "AdminStatsElement",
					props: ["stat"],
					methods: {
						adminFormatValue(t) {
							return parseFloat(Math.floor(t / 10) / 100)
								.toFixed(2)
								.toString()
								.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
						},
					},
				},
				N = i(66262);
			const z = (0, N.A)(V, [
				["render", R],
				["__scopeId", "data-v-4c898b10"],
			]);
			var W = z,
				H = {
					name: "AdminStats",
					components: {LoadingAnimation: k.A, AdminStatsElement: W},
					methods: {
						...(0, b.i0)(["adminGetStatsListSocket", "adminSetStatsListPage"]),
						adminSetPage(t) {
							if (this.adminStatsList.page === t) return;
							if (t < 1 || t > Math.ceil(this.adminStatsList.count / 12)) return;
							this.adminSetStatsListPage(t);
							const e = {page: this.adminStatsList.page, search: this.adminFilterSearch};
							this.adminGetStatsListSocket(e);
						},
					},
					computed: {...(0, b.L8)(["adminStatsList"])},
					created() {
						if (!1 === this.adminStatsList.loading) {
							const t = {page: this.adminStatsList.page};
							this.adminGetStatsListSocket(t);
						}
					},
				};
			const U = (0, N.A)(H, [
				["render", v],
				["__scopeId", "data-v-4e9efc28"],
			]);
			var X = U;
		},
		23338: function (t, e, i) {
			i.r(e),
				i.d(e, {
					default: function () {
						return Y;
					},
				});
			var n = i(20641),
				s = i(53751),
				a = i(90033),
				o = i(41864);
			const r = {class: "admin-promo"},
				l = {class: "promo-list"},
				d = {class: "list-content"},
				c = {class: "content-loading", key: "loading"},
				h = {class: "content-list", key: "data"},
				u = {class: "content-empty", key: "empty"},
				m = {class: "list-pagination"},
				p = ["disabled"],
				g = {class: "pagination-info"},
				f = {class: "text-green-gradient"},
				v = ["disabled"],
				b = {class: "promo-filters"},
				k = {class: "filters-generate"},
				x = {class: "generate-input"},
				L = {class: "generate-input"},
				_ = {class: "generate-input input-reward"},
				y = {class: "generate-input"},
				w = {class: "button-content", key: "content"};
			function C(t, e, i, C, S, A) {
				const M = (0, n.g2)("LoadingAnimation"),
					F = (0, n.g2)("AdminPromoElement"),
					D = (0, n.g2)("AdminFilterSearch"),
					E = (0, n.g2)("ButtonLoading");
				return (
					(0, n.uX)(),
					(0, n.CE)("div", r, [
						(0, n.Lk)("div", l, [
							e[10] ||
								(e[10] = (0, n.Fv)(
									'<div class="list-header" data-v-060882f8><div class="header-code" data-v-060882f8>CODE</div><div class="header-reward" data-v-060882f8>REWARD</div><div class="header-redeemptions" data-v-060882f8>REDEEMPTIONS</div><div class="header-option" data-v-060882f8>OPTION</div></div>',
									1
								)),
							(0, n.Lk)("div", d, [
								(0, n.bF)(
									s.eB,
									{name: "fade", mode: "out-in"},
									{
										default: (0, n.k6)(() => [
											null === t.adminPromoList.data || !0 === t.adminPromoList.loading
												? ((0, n.uX)(), (0, n.CE)("div", c, [(0, n.bF)(M)]))
												: t.adminPromoList.data.length > 0
												? ((0, n.uX)(),
												  (0, n.CE)("div", h, [
														((0, n.uX)(!0),
														(0, n.CE)(
															n.FK,
															null,
															(0, n.pI)(t.adminPromoList.data, (t) => ((0, n.uX)(), (0, n.Wv)(F, {key: t._id, promo: t}, null, 8, ["promo"]))),
															128
														)),
												  ]))
												: ((0, n.uX)(), (0, n.CE)("div", u, "No promo codes found.")),
										]),
										_: 1,
									}
								),
							]),
							(0, n.Lk)("div", m, [
								(0, n.Lk)(
									"button",
									{onClick: e[0] || (e[0] = (e) => A.adminSetPage(t.adminPromoList.page - 1)), class: "button-prev", disabled: t.adminPromoList.page <= 1},
									e[7] ||
										(e[7] = [
											(0, n.Lk)(
												"div",
												{class: "button-inner"},
												[
													(0, n.Lk)("svg", {width: "12", height: "11", viewBox: "0 0 12 11", fill: "none", xmlns: "http://www.w3.org/2000/svg"}, [
														(0, n.Lk)("path", {
															d: "M11.2788 4.30337C11.2297 4.2954 11.18 4.29173 11.1302 4.29237H2.66447L2.84907 4.20651C3.02951 4.12111 3.19366 4.00487 3.33417 3.86307L5.70819 1.48906C6.02085 1.19059 6.07339 0.710444 5.83269 0.351417C5.55254 -0.0311676 5.0153 -0.114237 4.63269 0.165907C4.60178 0.188552 4.5724 0.213237 4.54479 0.2398L0.251817 4.53278C-0.0836794 4.8679 -0.0839745 5.41152 0.251146 5.74702C0.251361 5.74723 0.251602 5.74747 0.251817 5.74769L4.54479 10.0407C4.88056 10.3755 5.42418 10.3747 5.75903 10.039C5.78538 10.0125 5.80999 9.98443 5.83269 9.95481C6.07339 9.59578 6.02085 9.11564 5.70819 8.81717L3.33847 6.43886C3.21249 6.31275 3.06766 6.20701 2.90917 6.12547L2.65159 6.00956H11.083C11.5216 6.02585 11.9064 5.71946 11.9888 5.28834C12.0647 4.82027 11.7468 4.3793 11.2788 4.30337Z",
														}),
													]),
												],
												-1
											),
										]),
									8,
									p
								),
								(0, n.Lk)("div", g, [
									e[8] || (e[8] = (0, n.eW)(" PAGE ", -1)),
									(0, n.Lk)("span", f, (0, a.v_)(t.adminPromoList.page), 1),
									(0, n.eW)(" / " + (0, a.v_)(Math.ceil(t.adminPromoList.count / 12) <= 0 ? "1" : Math.ceil(t.adminPromoList.count / 12)), 1),
								]),
								(0, n.Lk)(
									"button",
									{onClick: e[1] || (e[1] = (e) => A.adminSetPage(t.adminPromoList.page + 1)), class: "button-next", disabled: t.adminPromoList.page >= Math.ceil(t.adminPromoList.count / 12)},
									e[9] ||
										(e[9] = [
											(0, n.Lk)(
												"div",
												{class: "button-inner"},
												[
													(0, n.Lk)("svg", {width: "12", height: "11", viewBox: "0 0 12 11", fill: "none", xmlns: "http://www.w3.org/2000/svg"}, [
														(0, n.Lk)("path", {
															d: "M0.721245 4.30337C0.770346 4.2954 0.820037 4.29173 0.869755 4.29237H9.33553L9.15093 4.20651C8.97049 4.12111 8.80634 4.00487 8.66583 3.86307L6.29181 1.48906C5.97915 1.19059 5.92661 0.710444 6.16731 0.351417C6.44746 -0.0311676 6.9847 -0.114237 7.36731 0.165907C7.39822 0.188552 7.4276 0.213237 7.45521 0.2398L11.7482 4.53278C12.0837 4.8679 12.084 5.41152 11.7489 5.74702C11.7486 5.74723 11.7484 5.74747 11.7482 5.74769L7.45521 10.0407C7.11944 10.3755 6.57582 10.3747 6.24097 10.039C6.21462 10.0125 6.19001 9.98443 6.16731 9.95481C5.92661 9.59578 5.97915 9.11564 6.29181 8.81717L8.66153 6.43886C8.78751 6.31275 8.93234 6.20701 9.09083 6.12547L9.34841 6.00956H0.917005C0.478396 6.02585 0.0935841 5.71946 0.0111866 5.28834C-0.0647192 4.82027 0.253177 4.3793 0.721245 4.30337Z",
														}),
													]),
												],
												-1
											),
										]),
									8,
									v
								),
							]),
						]),
						(0, n.Lk)("div", b, [
							(0, n.bF)(D),
							(0, n.Lk)("div", k, [
								(0, n.Lk)("div", x, [
									(0, n.bo)((0, n.Lk)("input", {"onUpdate:modelValue": e[2] || (e[2] = (t) => (S.adminCode = t)), type: "text", placeholder: "Enter code here..."}, null, 512), [[s.Jo, S.adminCode]]),
								]),
								(0, n.Lk)("div", L, [
									(0, n.bo)((0, n.Lk)("input", {"onUpdate:modelValue": e[3] || (e[3] = (t) => (S.adminRedeemptions = t)), type: "text", placeholder: "Enter redeemptions here..."}, null, 512), [
										[s.Jo, S.adminRedeemptions],
									]),
								]),
								(0, n.Lk)("div", _, [
									e[11] || (e[11] = (0, n.Lk)("img", {src: o, alt: "icon"}, null, -1)),
									(0, n.bo)((0, n.Lk)("input", {"onUpdate:modelValue": e[4] || (e[4] = (t) => (S.adminReward = t)), type: "text", placeholder: "Enter reward here..."}, null, 512), [
										[s.Jo, S.adminReward],
									]),
								]),
								(0, n.Lk)("div", y, [
									(0, n.bo)((0, n.Lk)("input", {"onUpdate:modelValue": e[5] || (e[5] = (t) => (S.adminLevel = t)), type: "text", placeholder: "Enter min level here..."}, null, 512), [
										[s.Jo, S.adminLevel],
									]),
								]),
								(0, n.Lk)("button", {onClick: e[6] || (e[6] = (...t) => A.adminGenerateButton && A.adminGenerateButton(...t)), class: "button-generate"}, [
									(0, n.bF)(
										s.eB,
										{name: "fade", mode: "out-in"},
										{
											default: (0, n.k6)(() => [
												"AdminPromoCreate" === t.socketSendLoading ? ((0, n.uX)(), (0, n.Wv)(E, {key: "loading"})) : ((0, n.uX)(), (0, n.CE)("div", w, "GENERATE PROMO CODE")),
											]),
											_: 1,
										}
									),
								]),
							]),
						]),
					])
				);
			}
			var S = i(66278),
				A = i(87069),
				M = i(9629);
			const F = {class: "admin-promo-element"},
				D = {class: "element-section section-code"},
				E = {class: "section-content"},
				T = {class: "element-section section-reward"},
				P = {class: "section-content"},
				I = {class: "content-value"},
				B = {class: "element-section section-redeemptions"},
				O = {class: "section-content"},
				R = {class: "element-section section-option"},
				V = {class: "section-content"};
			function N(t, e, i, s, r, l) {
				return (
					(0, n.uX)(),
					(0, n.CE)("div", F, [
						(0, n.Lk)("div", D, [e[1] || (e[1] = (0, n.Lk)("div", {class: "section-title"}, "CODE", -1)), (0, n.Lk)("div", E, (0, a.v_)(i.promo.code), 1)]),
						(0, n.Lk)("div", T, [
							e[3] || (e[3] = (0, n.Lk)("div", {class: "section-title"}, "REWARD", -1)),
							(0, n.Lk)("div", P, [
								e[2] || (e[2] = (0, n.Lk)("img", {src: o, alt: "icon"}, null, -1)),
								(0, n.Lk)("div", I, [
									(0, n.Lk)("span", null, (0, a.v_)(l.adminFormatValue(i.promo.reward).split(".")[0]), 1),
									(0, n.eW)("." + (0, a.v_)(l.adminFormatValue(i.promo.reward).split(".")[1]), 1),
								]),
							]),
						]),
						(0, n.Lk)("div", B, [
							e[4] || (e[4] = (0, n.Lk)("div", {class: "section-title"}, "REDEEMPTIONS", -1)),
							(0, n.Lk)("div", O, (0, a.v_)(i.promo.redeemptionsTotal) + "/" + (0, a.v_)(i.promo.redeemptionsMax), 1),
						]),
						(0, n.Lk)("div", R, [
							e[6] || (e[6] = (0, n.Lk)("div", {class: "section-title"}, "OPTION", -1)),
							(0, n.Lk)("div", V, [
								(0, n.Lk)(
									"button",
									{onClick: e[0] || (e[0] = (...t) => l.adminRemoveButton && l.adminRemoveButton(...t))},
									e[5] ||
										(e[5] = [
											(0, n.Lk)(
												"svg",
												{xmlns: "http://www.w3.org/2000/svg", width: "11", viewBox: "0 0 448 512"},
												[
													(0, n.Lk)("path", {
														d: "M135.2 17.7C140.6 6.8 151.7 0 163.8 0H284.2c12.1 0 23.2 6.8 28.6 17.7L320 32h96c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 96 0 81.7 0 64S14.3 32 32 32h96l7.2-14.3zM32 128H416V448c0 35.3-28.7 64-64 64H96c-35.3 0-64-28.7-64-64V128zm96 64c-8.8 0-16 7.2-16 16V432c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16V432c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16V432c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16z",
													}),
												],
												-1
											),
											(0, n.eW)(" REMOVE ", -1),
										])
								),
							]),
						]),
					])
				);
			}
			var z = i(10838),
				W = {
					name: "AdminPromoElement",
					components: {AvatarImage: z.A},
					props: ["promo"],
					methods: {
						...(0, S.i0)(["adminSendPromoRemoveSocket"]),
						adminFormatValue(t) {
							return parseFloat(Math.floor(t / 10) / 100)
								.toFixed(2)
								.toString()
								.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
						},
						adminRemoveButton() {
							const t = {promoId: this.promo._id};
							this.adminSendPromoRemoveSocket(t);
						},
					},
				},
				H = i(66262);
			const U = (0, H.A)(W, [
				["render", N],
				["__scopeId", "data-v-5d54dad4"],
			]);
			var X = U,
				G = i(41167),
				j = {
					name: "AdminPromo",
					components: {LoadingAnimation: A.A, ButtonLoading: M.A, AdminPromoElement: X, AdminFilterSearch: G.A},
					data() {
						return {adminCode: null, adminReward: null, adminRedeemptions: null, adminLevel: null};
					},
					methods: {
						...(0, S.i0)(["notificationShow", "adminGetPromoListSocket", "adminSetPromoListPage", "adminSetFilterSearch", "adminSendPromoCreateSocket"]),
						adminSetPage(t) {
							if (this.adminPromoList.page === t) return;
							if (t < 1 || t > Math.ceil(this.adminPromoList.count / 12)) return;
							this.adminSetPromoListPage(t);
							const e = {page: this.adminPromoList.page, search: this.adminFilterSearch};
							this.adminGetPromoListSocket(e);
						},
						adminGenerateButton() {
							if (null === this.adminCode || "" === this.adminCode.trim()) return void this.notificationShow({type: "error", message: "Your entered code is invalid."});
							const t = Math.floor(1e3 * this.adminReward);
							if (null === t || !0 === isNaN(t) || t < 10) return void this.notificationShow({type: "error", message: "Your entered reward is invalid."});
							if (null === this.adminRedeemptions || !0 === isNaN(this.adminRedeemptions) || this.adminRedeemptions <= 0)
								return void this.notificationShow({type: "error", message: "Your entered redeemptions is invalid."});
							if (null === this.adminLevel || !0 === isNaN(this.adminLevel) || this.adminLevel < 0 || this.adminLevel > 100)
								return void this.notificationShow({type: "error", message: "Your entered min level is invalid."});
							const e = {code: this.adminCode, reward: t, redeemptions: this.adminRedeemptions, level: this.adminLevel};
							this.adminSendPromoCreateSocket(e);
						},
					},
					computed: {...(0, S.L8)(["socketSendLoading", "adminPromoList", "adminFilterSearch"])},
					created() {
						if (!1 === this.adminPromoList.loading) {
							const t = {page: this.adminPromoList.page, search: this.adminFilterSearch};
							this.adminGetPromoListSocket(t);
						}
					},
					beforeRouteLeave(t, e, i) {
						this.adminSetFilterSearch(""), i();
					},
				};
			const $ = (0, H.A)(j, [
				["render", C],
				["__scopeId", "data-v-060882f8"],
			]);
			var Y = $;
		},
		28402: function (t, e, i) {
			i.r(e),
				i.d(e, {
					default: function () {
						return ot;
					},
				});
			var n = i(20641),
				s = i(53751),
				a = i(90033);
			const o = {class: "admin-leaderboards"},
				r = {class: "leaderboards-list"},
				l = {class: "list-content"},
				d = {class: "content-loading", key: "loading"},
				c = {class: "content-list", key: "data"},
				h = {class: "content-empty", key: "empty"},
				u = {class: "list-pagination"},
				m = ["disabled"],
				p = {class: "pagination-info"},
				g = {class: "text-green-gradient"},
				f = ["disabled"],
				v = {class: "leaderboards-filters"},
				b = {class: "filters-create"},
				k = {class: "create-prize"};
			function x(t, e, i, x, L, _) {
				const y = (0, n.g2)("LoadingAnimation"),
					w = (0, n.g2)("AdminLeaderboardElement"),
					C = (0, n.g2)("AdminFilterSearch"),
					S = (0, n.g2)("AdminFilterType"),
					A = (0, n.g2)("AdminFilterDuration"),
					M = (0, n.g2)("AdminPrizeElement");
				return (
					(0, n.uX)(),
					(0, n.CE)("div", o, [
						(0, n.Lk)("div", r, [
							e[7] ||
								(e[7] = (0, n.Fv)(
									'<div class="list-header" data-v-60c325a8><div class="header-type" data-v-60c325a8>TYPE</div><div class="header-duration" data-v-60c325a8>DURATION</div><div class="header-state" data-v-60c325a8>STATE</div><div class="header-option" data-v-60c325a8>OPTION</div></div>',
									1
								)),
							(0, n.Lk)("div", l, [
								(0, n.bF)(
									s.eB,
									{name: "fade", mode: "out-in"},
									{
										default: (0, n.k6)(() => [
											null === t.adminLeaderboardList.data || !0 === t.adminLeaderboardList.loading
												? ((0, n.uX)(), (0, n.CE)("div", d, [(0, n.bF)(y)]))
												: t.adminLeaderboardList.data.length > 0
												? ((0, n.uX)(),
												  (0, n.CE)("div", c, [
														((0, n.uX)(!0),
														(0, n.CE)(
															n.FK,
															null,
															(0, n.pI)(t.adminLeaderboardList.data, (t) => ((0, n.uX)(), (0, n.Wv)(w, {key: t._id, leaderboard: t}, null, 8, ["leaderboard"]))),
															128
														)),
												  ]))
												: ((0, n.uX)(), (0, n.CE)("div", h, "No leaderboards found.")),
										]),
										_: 1,
									}
								),
							]),
							(0, n.Lk)("div", u, [
								(0, n.Lk)(
									"button",
									{onClick: e[0] || (e[0] = (e) => _.adminSetPage(t.adminLeaderboardList.page - 1)), class: "button-prev", disabled: t.adminLeaderboardList.page <= 1},
									e[4] ||
										(e[4] = [
											(0, n.Lk)(
												"div",
												{class: "button-inner"},
												[
													(0, n.Lk)("svg", {width: "12", height: "11", viewBox: "0 0 12 11", fill: "none", xmlns: "http://www.w3.org/2000/svg"}, [
														(0, n.Lk)("path", {
															d: "M11.2788 4.30337C11.2297 4.2954 11.18 4.29173 11.1302 4.29237H2.66447L2.84907 4.20651C3.02951 4.12111 3.19366 4.00487 3.33417 3.86307L5.70819 1.48906C6.02085 1.19059 6.07339 0.710444 5.83269 0.351417C5.55254 -0.0311676 5.0153 -0.114237 4.63269 0.165907C4.60178 0.188552 4.5724 0.213237 4.54479 0.2398L0.251817 4.53278C-0.0836794 4.8679 -0.0839745 5.41152 0.251146 5.74702C0.251361 5.74723 0.251602 5.74747 0.251817 5.74769L4.54479 10.0407C4.88056 10.3755 5.42418 10.3747 5.75903 10.039C5.78538 10.0125 5.80999 9.98443 5.83269 9.95481C6.07339 9.59578 6.02085 9.11564 5.70819 8.81717L3.33847 6.43886C3.21249 6.31275 3.06766 6.20701 2.90917 6.12547L2.65159 6.00956H11.083C11.5216 6.02585 11.9064 5.71946 11.9888 5.28834C12.0647 4.82027 11.7468 4.3793 11.2788 4.30337Z",
														}),
													]),
												],
												-1
											),
										]),
									8,
									m
								),
								(0, n.Lk)("div", p, [
									e[5] || (e[5] = (0, n.eW)(" PAGE ", -1)),
									(0, n.Lk)("span", g, (0, a.v_)(t.adminLeaderboardList.page), 1),
									(0, n.eW)(" / " + (0, a.v_)(Math.ceil(t.adminLeaderboardList.count / 12) <= 0 ? "1" : Math.ceil(t.adminLeaderboardList.count / 12)), 1),
								]),
								(0, n.Lk)(
									"button",
									{
										onClick: e[1] || (e[1] = (e) => _.adminSetPage(t.adminLeaderboardList.page + 1)),
										class: "button-next",
										disabled: t.adminLeaderboardList.page >= Math.ceil(t.adminLeaderboardList.count / 12),
									},
									e[6] ||
										(e[6] = [
											(0, n.Lk)(
												"div",
												{class: "button-inner"},
												[
													(0, n.Lk)("svg", {width: "12", height: "11", viewBox: "0 0 12 11", fill: "none", xmlns: "http://www.w3.org/2000/svg"}, [
														(0, n.Lk)("path", {
															d: "M0.721245 4.30337C0.770346 4.2954 0.820037 4.29173 0.869755 4.29237H9.33553L9.15093 4.20651C8.97049 4.12111 8.80634 4.00487 8.66583 3.86307L6.29181 1.48906C5.97915 1.19059 5.92661 0.710444 6.16731 0.351417C6.44746 -0.0311676 6.9847 -0.114237 7.36731 0.165907C7.39822 0.188552 7.4276 0.213237 7.45521 0.2398L11.7482 4.53278C12.0837 4.8679 12.084 5.41152 11.7489 5.74702C11.7486 5.74723 11.7484 5.74747 11.7482 5.74769L7.45521 10.0407C7.11944 10.3755 6.57582 10.3747 6.24097 10.039C6.21462 10.0125 6.19001 9.98443 6.16731 9.95481C5.92661 9.59578 5.97915 9.11564 6.29181 8.81717L8.66153 6.43886C8.78751 6.31275 8.93234 6.20701 9.09083 6.12547L9.34841 6.00956H0.917005C0.478396 6.02585 0.0935841 5.71946 0.0111866 5.28834C-0.0647192 4.82027 0.253177 4.3793 0.721245 4.30337Z",
														}),
													]),
												],
												-1
											),
										]),
									8,
									f
								),
							]),
						]),
						(0, n.Lk)("div", v, [
							(0, n.bF)(C),
							(0, n.Lk)("div", b, [
								(0, n.bF)(S),
								(0, n.bF)(A),
								(0, n.Lk)("div", k, [
									e[8] || (e[8] = (0, n.Lk)("div", {class: "prize-title"}, "PRIZES", -1)),
									((0, n.uX)(!0),
									(0, n.CE)(
										n.FK,
										null,
										(0, n.pI)(L.adminPrizes, (t, e) => ((0, n.uX)(), (0, n.Wv)(M, {key: e, pos: e, prize: t}, null, 8, ["pos", "prize"]))),
										128
									)),
								]),
								(0, n.Lk)("button", {onClick: e[2] || (e[2] = (t) => _.adminAddButton()), class: "button-add"}, "ADD PRIZE"),
								(0, n.Lk)("button", {onClick: e[3] || (e[3] = (t) => _.adminCreateButton()), class: "button-create"}, "CREATE LEADERBOARD"),
							]),
						]),
					])
				);
			}
			i(44114), i(18111), i(61701);
			var L = i(66278),
				_ = i(87069),
				y = i(41167);
			const w = {class: "button-value"},
				C = {class: "type-menu"},
				S = {class: "menu-inner"};
			function A(t, e, i, s, o, r) {
				return (
					(0, n.uX)(),
					(0, n.CE)(
						"div",
						{class: (0, a.C4)(["admin-filter-type", {"type-open": !0 === o.adminDropdown}])},
						[
							(0, n.Lk)("button", {onClick: e[0] || (e[0] = (...t) => r.adminToggleDropdown && r.adminToggleDropdown(...t)), class: "button-toggle"}, [
								(0, n.Lk)("div", w, [e[3] || (e[3] = (0, n.eW)(" Type: ", -1)), (0, n.Lk)("span", null, (0, a.v_)(t.adminFilterType), 1)]),
								e[4] ||
									(e[4] = (0, n.Lk)(
										"svg",
										{width: "10", height: "6", viewBox: "0 0 10 6", fill: "none", xmlns: "http://www.w3.org/2000/svg"},
										[
											(0, n.Lk)("path", {
												d: "M9.5176 1.66411e-06L0.482354 8.43375e-08C0.0547936 9.58042e-09 -0.16302 0.516304 0.143533 0.822859L4.66115 5.34052C4.8467 5.52607 5.15325 5.52607 5.33888 5.34052L9.8565 0.822861C10.163 0.516306 9.94516 1.73887e-06 9.5176 1.66411e-06Z",
											}),
										],
										-1
									)),
							]),
							(0, n.Lk)("div", C, [
								(0, n.Lk)("div", S, [
									(0, n.Lk)("button", {onClick: e[1] || (e[1] = (t) => r.adminSetButton("Wager"))}, "Wager"),
									(0, n.Lk)("button", {onClick: e[2] || (e[2] = (t) => r.adminSetButton("Deposit"))}, "Deposit"),
								]),
							]),
						],
						2
					)
				);
			}
			var M = {
					name: "AdminFilterType",
					data() {
						return {adminDropdown: !1};
					},
					methods: {
						...(0, L.i0)(["adminSetFilterType"]),
						adminToggleDropdown() {
							this.adminDropdown = !this.adminDropdown;
						},
						adminSetButton(t) {
							this.adminSetFilterType(t), this.adminToggleDropdown();
						},
					},
					computed: {...(0, L.L8)(["adminFilterType"])},
					created() {
						let t = this;
						document.addEventListener("click", function (e) {
							t.$el.contains(e.target) || 1 != t.adminDropdown || t.adminToggleDropdown();
						});
					},
				},
				F = i(66262);
			const D = (0, F.A)(M, [
				["render", A],
				["__scopeId", "data-v-ca7ba566"],
			]);
			var E = D;
			const T = {class: "button-value"},
				P = {class: "duration-menu"},
				I = {class: "menu-inner"};
			function B(t, e, i, s, o, r) {
				return (
					(0, n.uX)(),
					(0, n.CE)(
						"div",
						{class: (0, a.C4)(["admin-filter-duration", {"duration-open": !0 === o.adminDropdown}])},
						[
							(0, n.Lk)("button", {onClick: e[0] || (e[0] = (...t) => r.adminToggleDropdown && r.adminToggleDropdown(...t)), class: "button-toggle"}, [
								(0, n.Lk)("div", T, [e[4] || (e[4] = (0, n.eW)(" Duration: ", -1)), (0, n.Lk)("span", null, (0, a.v_)(t.adminFilterDuration) + " days", 1)]),
								e[5] ||
									(e[5] = (0, n.Lk)(
										"svg",
										{width: "10", height: "6", viewBox: "0 0 10 6", fill: "none", xmlns: "http://www.w3.org/2000/svg"},
										[
											(0, n.Lk)("path", {
												d: "M9.5176 1.66411e-06L0.482354 8.43375e-08C0.0547936 9.58042e-09 -0.16302 0.516304 0.143533 0.822859L4.66115 5.34052C4.8467 5.52607 5.15325 5.52607 5.33888 5.34052L9.8565 0.822861C10.163 0.516306 9.94516 1.73887e-06 9.5176 1.66411e-06Z",
											}),
										],
										-1
									)),
							]),
							(0, n.Lk)("div", P, [
								(0, n.Lk)("div", I, [
									(0, n.Lk)("button", {onClick: e[1] || (e[1] = (t) => r.adminSetButton("3"))}, "3 days"),
									(0, n.Lk)("button", {onClick: e[2] || (e[2] = (t) => r.adminSetButton("7"))}, "7 days"),
									(0, n.Lk)("button", {onClick: e[3] || (e[3] = (t) => r.adminSetButton("30"))}, "30 days"),
								]),
							]),
						],
						2
					)
				);
			}
			var O = {
				name: "AdminFilterDuration",
				data() {
					return {adminDropdown: !1};
				},
				methods: {
					...(0, L.i0)(["adminSetFilterDuration"]),
					adminToggleDropdown() {
						this.adminDropdown = !this.adminDropdown;
					},
					adminSetButton(t) {
						this.adminSetFilterDuration(t), this.adminToggleDropdown();
					},
				},
				computed: {...(0, L.L8)(["adminFilterDuration"])},
				created() {
					let t = this;
					document.addEventListener("click", function (e) {
						t.$el.contains(e.target) || 1 != t.adminDropdown || t.adminToggleDropdown();
					});
				},
			};
			const R = (0, F.A)(O, [
				["render", B],
				["__scopeId", "data-v-be51171e"],
			]);
			var V = R;
			const N = {class: "admin-leaderboard-element"},
				z = {class: "element-section section-type"},
				W = {class: "section-content"},
				H = {class: "element-section section-duration"},
				U = {class: "section-content"},
				X = {class: "section-content"},
				G = {class: "element-section section-option"},
				j = {class: "section-content"},
				$ = ["disabled"];
			function Y(t, e, i, s, o, r) {
				return (
					(0, n.uX)(),
					(0, n.CE)("div", N, [
						(0, n.Lk)("div", z, [e[1] || (e[1] = (0, n.Lk)("div", {class: "section-title"}, "TYPE", -1)), (0, n.Lk)("div", W, (0, a.v_)(i.leaderboard.type.toUpperCase()), 1)]),
						(0, n.Lk)("div", H, [e[2] || (e[2] = (0, n.Lk)("div", {class: "section-title"}, "DURATION", -1)), (0, n.Lk)("div", U, (0, a.v_)(i.leaderboard.duration) + " DAYS ", 1)]),
						(0, n.Lk)(
							"div",
							{class: (0, a.C4)(["element-section section-state", ["state-" + i.leaderboard.state]])},
							[e[3] || (e[3] = (0, n.Lk)("div", {class: "section-title"}, "STATE", -1)), (0, n.Lk)("div", X, (0, a.v_)(i.leaderboard.state.toUpperCase()), 1)],
							2
						),
						(0, n.Lk)("div", G, [
							e[5] || (e[5] = (0, n.Lk)("div", {class: "section-title"}, "OPTION", -1)),
							(0, n.Lk)("div", j, [
								(0, n.Lk)(
									"button",
									{onClick: e[0] || (e[0] = (t) => r.adminRemoveButton()), disabled: "AdminLeaderboardRemove" === t.socketSendLoading},
									[
										e[4] ||
											(e[4] = (0, n.Lk)(
												"svg",
												{xmlns: "http://www.w3.org/2000/svg", width: "12", viewBox: "0 0 512 512"},
												[
													(0, n.Lk)("path", {
														d: "M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM224 192V320c0 17.7-14.3 32-32 32s-32-14.3-32-32V192c0-17.7 14.3-32 32-32s32 14.3 32 32zm128 0V320c0 17.7-14.3 32-32 32s-32-14.3-32-32V192c0-17.7 14.3-32 32-32s32 14.3 32 32z",
													}),
												],
												-1
											)),
										(0, n.eW)(" " + (0, a.v_)("created" === i.leaderboard.state ? "REMOVE" : "STOP"), 1),
									],
									8,
									$
								),
							]),
						]),
					])
				);
			}
			var K = {
				name: "AdminLeaderboardElement",
				props: ["leaderboard"],
				methods: {
					...(0, L.i0)(["adminSendLeaderboardStopSocket"]),
					adminRemoveButton() {
						const t = {leaderboardId: this.leaderboard._id};
						this.adminSendLeaderboardStopSocket(t);
					},
				},
				computed: {...(0, L.L8)(["socketSendLoading"])},
			};
			const q = (0, F.A)(K, [
				["render", Y],
				["__scopeId", "data-v-519e0610"],
			]);
			var J = q;
			const Z = {class: "admin-prize-element"};
			function Q(t, e, i, a, o, r) {
				const l = (0, n.g2)("IconClose");
				return (
					(0, n.uX)(),
					(0, n.CE)("div", Z, [
						(0, n.bo)(
							(0, n.Lk)(
								"input",
								{"onUpdate:modelValue": e[0] || (e[0] = (t) => (i.prize.amount = t)), onInput: e[1] || (e[1] = (t) => r.adminValidateInput()), type: "text", placeholder: "ENTER PRICE..."},
								null,
								544
							),
							[[s.Jo, i.prize.amount]]
						),
						(0, n.Lk)("button", {onClick: e[2] || (e[2] = (e) => t.$parent.adminRemoveButton(i.pos)), class: "button-remove"}, [(0, n.bF)(l)]),
					])
				);
			}
			var tt = i(63261),
				et = {
					name: "AdminPrizeElement",
					components: {IconClose: tt.A},
					props: ["pos", "prize"],
					methods: {
						adminValidateInput() {
							(this.prize.amount = this.prize.amount.replace(",", ".").replace(/[^\d.]/g, "")),
								(this.prize.amount =
									this.prize.amount.indexOf(".") >= 0
										? this.prize.amount.substr(0, this.prize.amount.indexOf(".")) + "." + this.prize.amount.substr(this.prize.amount.indexOf(".") + 1, 2).replace(".", "")
										: this.prize.amount);
						},
					},
				};
			const it = (0, F.A)(et, [
				["render", Q],
				["__scopeId", "data-v-665c4075"],
			]);
			var nt = it,
				st = {
					name: "AdminLeaderboards",
					components: {LoadingAnimation: _.A, AdminFilterSearch: y.A, AdminFilterType: E, AdminFilterDuration: V, AdminLeaderboardElement: J, AdminPrizeElement: nt},
					data() {
						return {adminPrizes: [{amount: null}]};
					},
					methods: {
						...(0, L.i0)(["adminGetLeaderboardListSocket", "adminSetUserListPage", "adminSetFilterSearch", "adminSendLeaderboardCreateSocket"]),
						adminSetPage(t) {
							if (this.adminLeaderboardList.page === t) return;
							if (t < 1 || t > Math.ceil(this.adminLeaderboardList.count / 12)) return;
							this.adminSetLeaderboardListPage(t);
							const e = {page: this.adminUserList.page, search: this.adminFilterSearch};
							this.adminGetLeaderboardListSocket(e);
						},
						adminAddButton() {
							this.adminPrizes.push({amount: null});
						},
						adminRemoveButton(t) {
							this.adminPrizes.splice(t, 1);
						},
						adminCreateButton() {
							const t = this.adminPrizes.map((t) => ({amount: Math.floor(1e3 * t.amount)})),
								e = {type: this.adminFilterType.toLowerCase(), duration: this.adminFilterDuration, prizes: t};
							this.adminSendLeaderboardCreateSocket(e);
						},
					},
					computed: {...(0, L.L8)(["adminLeaderboardList", "adminFilterSearch", "adminFilterSort", "adminFilterType", "adminFilterDuration"])},
					created() {
						if (!1 === this.adminLeaderboardList.loading) {
							const t = {page: this.adminLeaderboardList.page, search: this.adminFilterSearch};
							this.adminGetLeaderboardListSocket(t);
						}
					},
					beforeRouteLeave(t, e, i) {
						this.adminSetFilterSearch(""), i();
					},
				};
			const at = (0, F.A)(st, [
				["render", x],
				["__scopeId", "data-v-60c325a8"],
			]);
			var ot = at;
		},
		29243: function (t, e, i) {
			i.r(e),
				i.d(e, {
					default: function () {
						return b;
					},
				});
			var n = i(20641),
				s = i(53751),
				a = i(90033);
			const o = {class: "admin-news"},
				r = {class: "news-table"},
				l = ["src"],
				d = ["onClick"],
				c = ["onClick"],
				h = {key: 0, class: "modal-overlay"},
				u = {class: "modal-content"};
			function m(t, e, i, m, p, g) {
				return (
					(0, n.uX)(),
					(0, n.CE)("div", o, [
						e[15] || (e[15] = (0, n.Lk)("h1", {class: "title"}, "News Management", -1)),
						(0, n.Lk)(
							"form",
							{onSubmit: e[4] || (e[4] = (0, s.D$)((...t) => g.addNews && g.addNews(...t), ["prevent"])), class: "news-form"},
							[
								e[11] || (e[11] = (0, n.Lk)("h2", null, "Add News", -1)),
								(0, n.bo)((0, n.Lk)("input", {"onUpdate:modelValue": e[0] || (e[0] = (t) => (p.newNews.title = t)), type: "text", placeholder: "Title", required: ""}, null, 512), [
									[s.Jo, p.newNews.title],
								]),
								(0, n.bo)((0, n.Lk)("input", {"onUpdate:modelValue": e[1] || (e[1] = (t) => (p.newNews.subtitle = t)), type: "text", placeholder: "Subtitle", required: ""}, null, 512), [
									[s.Jo, p.newNews.subtitle],
								]),
								(0, n.Lk)("input", {onChange: e[2] || (e[2] = (...t) => g.onFileChange && g.onFileChange(...t)), type: "file", accept: "image/*"}, null, 32),
								(0, n.bo)((0, n.Lk)("textarea", {"onUpdate:modelValue": e[3] || (e[3] = (t) => (p.newNews.content = t)), placeholder: "Content", required: ""}, null, 512), [
									[s.Jo, p.newNews.content],
								]),
								e[12] || (e[12] = (0, n.Lk)("button", {type: "submit", class: "add-button"}, "Add News", -1)),
							],
							32
						),
						e[16] || (e[16] = (0, n.Lk)("h2", null, "News List", -1)),
						(0, n.Lk)("table", r, [
							e[13] ||
								(e[13] = (0, n.Lk)(
									"thead",
									null,
									[(0, n.Lk)("tr", null, [(0, n.Lk)("th", null, "Image"), (0, n.Lk)("th", null, "Title"), (0, n.Lk)("th", null, "Subtitle"), (0, n.Lk)("th", null, "Actions")])],
									-1
								)),
							(0, n.Lk)("tbody", null, [
								((0, n.uX)(!0),
								(0, n.CE)(
									n.FK,
									null,
									(0, n.pI)(
										p.newsList,
										(t) => (
											(0, n.uX)(),
											(0, n.CE)("tr", {key: t._id}, [
												(0, n.Lk)("td", null, [(0, n.Lk)("img", {src: t.img, alt: "News Image", class: "news-img"}, null, 8, l)]),
												(0, n.Lk)("td", null, (0, a.v_)(t.title), 1),
												(0, n.Lk)("td", null, (0, a.v_)(t.subtitle), 1),
												(0, n.Lk)("td", null, [
													(0, n.Lk)("button", {onClick: (e) => g.editNews(t), class: "edit-button"}, "Edit", 8, d),
													(0, n.Lk)("button", {onClick: (e) => g.deleteNews(t._id), class: "delete-button"}, "Delete", 8, c),
												]),
											])
										)
									),
									128
								)),
							]),
						]),
						p.editMode
							? ((0, n.uX)(),
							  (0, n.CE)("div", h, [
									(0, n.Lk)("div", u, [
										e[14] || (e[14] = (0, n.Lk)("h3", null, "Edit News", -1)),
										(0, n.bo)((0, n.Lk)("input", {"onUpdate:modelValue": e[5] || (e[5] = (t) => (p.editNewsData.title = t)), type: "text", placeholder: "Title"}, null, 512), [
											[s.Jo, p.editNewsData.title],
										]),
										(0, n.bo)((0, n.Lk)("input", {"onUpdate:modelValue": e[6] || (e[6] = (t) => (p.editNewsData.subtitle = t)), type: "text", placeholder: "Subtitle"}, null, 512), [
											[s.Jo, p.editNewsData.subtitle],
										]),
										(0, n.Lk)("input", {onChange: e[7] || (e[7] = (...t) => g.onFileChange && g.onFileChange(...t)), type: "file", accept: "image/*"}, null, 32),
										(0, n.bo)((0, n.Lk)("textarea", {"onUpdate:modelValue": e[8] || (e[8] = (t) => (p.editNewsData.content = t)), placeholder: "Content"}, null, 512), [
											[s.Jo, p.editNewsData.content],
										]),
										(0, n.Lk)("button", {onClick: e[9] || (e[9] = (...t) => g.updateNews && g.updateNews(...t)), class: "save-button"}, "Save Changes"),
										(0, n.Lk)("button", {onClick: e[10] || (e[10] = (...t) => g.cancelEdit && g.cancelEdit(...t)), class: "close-button"}, "Cancel"),
									]),
							  ]))
							: (0, n.Q3)("", !0),
					])
				);
			}
			var p = i(94335),
				g = {
					data() {
						return {newsList: [], newNews: {title: "", subtitle: "", content: "", img: null}, editNewsData: null, editMode: !1};
					},
					mounted() {
						this.fetchNews();
					},
					methods: {
						async fetchNews() {
							const t = await p.A.get("https://api.guotai9189.com/news");
							this.newsList = t.data;
						},
						onFileChange(t) {
							const e = t.target.files[0];
							e && (this.newNews.img = e);
						},
						async addNews() {
							const t = new FormData();
							t.append("title", this.newNews.title),
								t.append("subtitle", this.newNews.subtitle),
								t.append("content", this.newNews.content),
								t.append("img", this.newNews.img),
								await p.A.post("https://api.guotai9189.com/news/add", t),
								this.fetchNews();
						},
						editNews(t) {
							(this.editNewsData = {...t}), (this.editMode = !0);
						},
						async updateNews() {
							const t = new FormData();
							t.append("title", this.editNewsData.title),
								t.append("subtitle", this.editNewsData.subtitle),
								t.append("content", this.editNewsData.content),
								this.editNewsData.img && t.append("img", this.editNewsData.img),
								await p.A.put(`https://api.guotai9189.com/news/${this.editNewsData._id}`, t),
								this.fetchNews(),
								(this.editMode = !1);
						},
						async deleteNews(t) {
							await p.A.delete(`https://api.guotai9189.com/news/${t}`), this.fetchNews();
						},
						cancelEdit() {
							this.editMode = !1;
						},
					},
				},
				f = i(66262);
			const v = (0, f.A)(g, [
				["render", m],
				["__scopeId", "data-v-762c89e4"],
			]);
			var b = v;
		},
		41167: function (t, e, i) {
			i.d(e, {
				A: function () {
					return h;
				},
			});
			var n = i(20641),
				s = i(53751);
			const a = {class: "admin-filter-search"};
			function o(t, e, i, o, r, l) {
				return (
					(0, n.uX)(),
					(0, n.CE)("div", a, [
						e[2] ||
							(e[2] = (0, n.Lk)(
								"svg",
								{width: "15", height: "15", viewBox: "0 0 15 15", fill: "none", xmlns: "http://www.w3.org/2000/svg"},
								[
									(0, n.Lk)("path", {
										d: "M10.7204 9.43396H10.0429L9.80274 9.2024C10.6432 8.2247 11.1492 6.9554 11.1492 5.57461C11.1492 2.49571 8.65352 0 5.57461 0C2.49571 0 0 2.49571 0 5.57461C0 8.65352 2.49571 11.1492 5.57461 11.1492C6.9554 11.1492 8.2247 10.6432 9.2024 9.80274L9.43396 10.0429V10.7204L13.7221 15L15 13.7221L10.7204 9.43396ZM5.57461 9.43396C3.43911 9.43396 1.71527 7.71012 1.71527 5.57461C1.71527 3.43911 3.43911 1.71527 5.57461 1.71527C7.71012 1.71527 9.43396 3.43911 9.43396 5.57461C9.43396 7.71012 7.71012 9.43396 5.57461 9.43396Z",
									}),
								],
								-1
							)),
						(0, n.bo)(
							(0, n.Lk)(
								"input",
								{
									onChange: e[0] || (e[0] = (...t) => l.adminSetValue && l.adminSetValue(...t)),
									"onUpdate:modelValue": e[1] || (e[1] = (t) => (r.adminValue = t)),
									type: "text",
									placeholder: "Search for keyword...",
								},
								null,
								544
							),
							[[s.Jo, r.adminValue]]
						),
					])
				);
			}
			var r = i(66278),
				l = {
					name: "AdminFilterSerach",
					data() {
						return {adminValue: ""};
					},
					methods: {
						...(0, r.i0)([
							"adminSetFilterSearch",
							"adminSetUserListPage",
							"adminGetUserListSocket",
							"adminSetAffiliateListPage",
							"adminGetAffiliateListSocket",
							"adminSetPromoListPage",
							"adminGetPromoListSocket",
							"adminSetTransactionListPage",
							"adminGetTransactionListSocket",
						]),
						adminSetValue() {
							if ((this.adminSetFilterSearch(this.adminValue), "AdminUsers" === this.$route.name)) {
								this.adminSetUserListPage(1);
								const t = {page: 1, search: this.adminValue, sort: this.adminFilterSort.toLowerCase(), select: this.adminFilterSelect.toLowerCase()};
								this.adminGetUserListSocket(t);
							} else if ("AdminAffiliates" === this.$route.name) {
								this.adminSetAffiliateListPage(1);
								const t = {page: 1, search: this.adminValue, sort: this.adminFilterSort.toLowerCase()};
								this.adminGetAffiliateListSocket(t);
							} else if ("AdminPromo" === this.$route.name) {
								this.adminSetPromoListPage(1);
								const t = {page: 1, search: this.adminValue};
								this.adminGetPromoListSocket(t);
							} else if ("AdminTransactions" === this.$route.name) {
								this.adminSetTransactionListPage(1);
								const t = {page: 1, search: this.adminValue, select: this.adminFilterSelect.toLowerCase()};
								this.adminGetTransactionListSocket(t);
							}
						},
					},
					computed: {...(0, r.L8)(["adminFilterSort", "adminFilterSelect"])},
				},
				d = i(66262);
			const c = (0, d.A)(l, [
				["render", o],
				["__scopeId", "data-v-f33d10b4"],
			]);
			var h = c;
		},
		43725: function (t, e, i) {
			i.r(e),
				i.d(e, {
					default: function () {
						return K;
					},
				});
			var n = i(20641),
				s = i(53751),
				a = i(90033),
				o = i(41864);
			const r = {class: "admin-rain"},
				l = {class: "rain-list"},
				d = {class: "list-content"},
				c = {class: "content-loading", key: "loading"},
				h = {class: "content-list", key: "data"},
				u = {class: "content-empty", key: "empty"},
				m = {class: "list-pagination"},
				p = ["disabled"],
				g = {class: "pagination-info"},
				f = {class: "text-green-gradient"},
				v = ["disabled"],
				b = {class: "rain-filters"},
				k = {class: "filter-actions"},
				x = {class: "actions-input"},
				L = ["disabled"],
				_ = ["disabled"],
				y = {class: "button-content", key: "content"},
				w = {class: "filter-stats"},
				C = {class: "stats-pot"},
				S = {class: "pot-amount"},
				A = {class: "amount-value"};
			function M(t, e, i, M, F, D) {
				const E = (0, n.g2)("LoadingAnimation"),
					T = (0, n.g2)("AdminRainElement"),
					P = (0, n.g2)("AdminFilterSearch"),
					I = (0, n.g2)("ButtonLoading");
				return (
					(0, n.uX)(),
					(0, n.CE)("div", r, [
						(0, n.Lk)("div", l, [
							e[7] ||
								(e[7] = (0, n.Fv)(
									'<div class="list-header" data-v-677e06ba><div class="header-type" data-v-677e06ba>TYPE</div><div class="header-amount" data-v-677e06ba>AMOUNT</div><div class="header-state" data-v-677e06ba>STATE</div><div class="header-option" data-v-677e06ba>OPTION</div></div>',
									1
								)),
							(0, n.Lk)("div", d, [
								(0, n.bF)(
									s.eB,
									{name: "fade", mode: "out-in"},
									{
										default: (0, n.k6)(() => [
											null === t.adminRainList.data || !0 === t.adminRainList.loading
												? ((0, n.uX)(), (0, n.CE)("div", c, [(0, n.bF)(E)]))
												: t.adminRainList.data.length > 0
												? ((0, n.uX)(),
												  (0, n.CE)("div", h, [
														((0, n.uX)(!0),
														(0, n.CE)(
															n.FK,
															null,
															(0, n.pI)(t.adminRainList.data, (t) => ((0, n.uX)(), (0, n.Wv)(T, {key: t._id, rain: t}, null, 8, ["rain"]))),
															128
														)),
												  ]))
												: ((0, n.uX)(), (0, n.CE)("div", u, "No rains found.")),
										]),
										_: 1,
									}
								),
							]),
							(0, n.Lk)("div", m, [
								(0, n.Lk)(
									"button",
									{onClick: e[0] || (e[0] = (e) => D.adminSetPage(t.adminRainList.page - 1)), class: "button-prev", disabled: t.adminRainList.page <= 1},
									e[4] ||
										(e[4] = [
											(0, n.Lk)(
												"div",
												{class: "button-inner"},
												[
													(0, n.Lk)("svg", {width: "12", height: "11", viewBox: "0 0 12 11", fill: "none", xmlns: "http://www.w3.org/2000/svg"}, [
														(0, n.Lk)("path", {
															d: "M11.2788 4.30337C11.2297 4.2954 11.18 4.29173 11.1302 4.29237H2.66447L2.84907 4.20651C3.02951 4.12111 3.19366 4.00487 3.33417 3.86307L5.70819 1.48906C6.02085 1.19059 6.07339 0.710444 5.83269 0.351417C5.55254 -0.0311676 5.0153 -0.114237 4.63269 0.165907C4.60178 0.188552 4.5724 0.213237 4.54479 0.2398L0.251817 4.53278C-0.0836794 4.8679 -0.0839745 5.41152 0.251146 5.74702C0.251361 5.74723 0.251602 5.74747 0.251817 5.74769L4.54479 10.0407C4.88056 10.3755 5.42418 10.3747 5.75903 10.039C5.78538 10.0125 5.80999 9.98443 5.83269 9.95481C6.07339 9.59578 6.02085 9.11564 5.70819 8.81717L3.33847 6.43886C3.21249 6.31275 3.06766 6.20701 2.90917 6.12547L2.65159 6.00956H11.083C11.5216 6.02585 11.9064 5.71946 11.9888 5.28834C12.0647 4.82027 11.7468 4.3793 11.2788 4.30337Z",
														}),
													]),
												],
												-1
											),
										]),
									8,
									p
								),
								(0, n.Lk)("div", g, [
									e[5] || (e[5] = (0, n.eW)(" PAGE ", -1)),
									(0, n.Lk)("span", f, (0, a.v_)(t.adminRainList.page), 1),
									(0, n.eW)(" / " + (0, a.v_)(Math.ceil(t.adminRainList.count / 12) <= 0 ? "1" : Math.ceil(t.adminRainList.count / 12)), 1),
								]),
								(0, n.Lk)(
									"button",
									{onClick: e[1] || (e[1] = (e) => D.adminSetPage(t.adminRainList.page + 1)), class: "button-next", disabled: t.adminRainList.page >= Math.ceil(t.adminRainList.count / 12)},
									e[6] ||
										(e[6] = [
											(0, n.Lk)(
												"div",
												{class: "button-inner"},
												[
													(0, n.Lk)("svg", {width: "12", height: "11", viewBox: "0 0 12 11", fill: "none", xmlns: "http://www.w3.org/2000/svg"}, [
														(0, n.Lk)("path", {
															d: "M0.721245 4.30337C0.770346 4.2954 0.820037 4.29173 0.869755 4.29237H9.33553L9.15093 4.20651C8.97049 4.12111 8.80634 4.00487 8.66583 3.86307L6.29181 1.48906C5.97915 1.19059 5.92661 0.710444 6.16731 0.351417C6.44746 -0.0311676 6.9847 -0.114237 7.36731 0.165907C7.39822 0.188552 7.4276 0.213237 7.45521 0.2398L11.7482 4.53278C12.0837 4.8679 12.084 5.41152 11.7489 5.74702C11.7486 5.74723 11.7484 5.74747 11.7482 5.74769L7.45521 10.0407C7.11944 10.3755 6.57582 10.3747 6.24097 10.039C6.21462 10.0125 6.19001 9.98443 6.16731 9.95481C5.92661 9.59578 5.97915 9.11564 6.29181 8.81717L8.66153 6.43886C8.78751 6.31275 8.93234 6.20701 9.09083 6.12547L9.34841 6.00956H0.917005C0.478396 6.02585 0.0935841 5.71946 0.0111866 5.28834C-0.0647192 4.82027 0.253177 4.3793 0.721245 4.30337Z",
														}),
													]),
												],
												-1
											),
										]),
									8,
									v
								),
							]),
						]),
						(0, n.Lk)("div", b, [
							(0, n.bF)(P),
							(0, n.Lk)("div", k, [
								(0, n.Lk)("div", x, [
									e[8] || (e[8] = (0, n.Lk)("img", {src: o, alt: "icon"}, null, -1)),
									(0, n.bo)(
										(0, n.Lk)(
											"input",
											{"onUpdate:modelValue": e[2] || (e[2] = (t) => (F.adminAmount = t)), type: "text", placeholder: "Enter rain amount here...", disabled: !1 === F.adminChange},
											null,
											8,
											L
										),
										[[s.Jo, F.adminAmount]]
									),
								]),
								(0, n.Lk)(
									"button",
									{
										onClick: e[3] || (e[3] = (t) => (!0 === F.adminChange ? D.adminUpdateButton() : D.adminSetChange(!F.adminChange))),
										class: (0, a.C4)(["button-update", [{"button-save": !0 === F.adminChange}]]),
										disabled: null !== t.socketSendLoading,
									},
									[
										(0, n.bF)(
											s.eB,
											{name: "fade", mode: "out-in"},
											{
												default: (0, n.k6)(() => [
													"AdminRainAmount" === t.socketSendLoading
														? ((0, n.uX)(), (0, n.Wv)(I, {key: "loading"}))
														: ((0, n.uX)(), (0, n.CE)("div", y, (0, a.v_)(!0 === F.adminChange ? "SAVE" : "UPDATE") + " RAIN AMOUNT", 1)),
												]),
												_: 1,
											}
										),
									],
									10,
									_
								),
							]),
							(0, n.Lk)("div", w, [
								(0, n.Lk)("div", C, [
									e[10] || (e[10] = (0, n.Lk)("div", {class: "pot-title"}, "RAIN POT", -1)),
									(0, n.Lk)("div", S, [
										e[9] || (e[9] = (0, n.Lk)("img", {src: o, alt: "icon"}, null, -1)),
										(0, n.Lk)("div", A, [
											(0, n.Lk)("span", null, (0, a.v_)(D.adminFormatValue(t.generalRain.site.amount).split(".")[0]), 1),
											(0, n.eW)("." + (0, a.v_)(D.adminFormatValue(t.generalRain.site.amount).split(".")[1]), 1),
										]),
									]),
								]),
							]),
						]),
					])
				);
			}
			var F = i(66278),
				D = i(87069),
				E = i(9629);
			const T = {class: "admin-rain-element"},
				P = {class: "element-section section-type"},
				I = {class: "section-content"},
				B = {class: "element-section section-amount"},
				O = {class: "section-content"},
				R = {class: "content-value"},
				V = {class: "section-content"},
				N = {class: "element-section section-option"},
				z = {class: "section-content"};
			function W(t, e, i, s, r, l) {
				return (
					(0, n.uX)(),
					(0, n.CE)("div", T, [
						(0, n.Lk)("div", P, [e[1] || (e[1] = (0, n.Lk)("div", {class: "section-title"}, "TYPE", -1)), (0, n.Lk)("div", I, (0, a.v_)(i.rain.type.toUpperCase()), 1)]),
						(0, n.Lk)("div", B, [
							e[3] || (e[3] = (0, n.Lk)("div", {class: "section-title"}, "AMOUNT", -1)),
							(0, n.Lk)("div", O, [
								e[2] || (e[2] = (0, n.Lk)("img", {src: o, alt: "icon"}, null, -1)),
								(0, n.Lk)("div", R, [
									(0, n.Lk)("span", null, (0, a.v_)(l.adminFormatValue(i.rain.amount).split(".")[0]), 1),
									(0, n.eW)("." + (0, a.v_)(l.adminFormatValue(i.rain.amount).split(".")[1]), 1),
								]),
							]),
						]),
						(0, n.Lk)(
							"div",
							{class: (0, a.C4)(["element-section section-state", ["state-" + i.rain.state]])},
							[e[4] || (e[4] = (0, n.Lk)("div", {class: "section-title"}, "STATE", -1)), (0, n.Lk)("div", V, (0, a.v_)(i.rain.state.toUpperCase()), 1)],
							2
						),
						(0, n.Lk)("div", N, [
							e[6] || (e[6] = (0, n.Lk)("div", {class: "section-title"}, "OPTION", -1)),
							(0, n.Lk)("div", z, [
								(0, n.Lk)(
									"button",
									{onClick: e[0] || (e[0] = (t) => l.adminViewButton())},
									e[5] ||
										(e[5] = [
											(0, n.Lk)(
												"svg",
												{width: "17", height: "10", viewBox: "0 0 17 10", fill: "none", xmlns: "http://www.w3.org/2000/svg"},
												[
													(0, n.Lk)("path", {
														d: "M8.5 0C5.25197 0 2.30648 1.7536 0.133016 4.60192C-0.0443388 4.83528 -0.0443388 5.16129 0.133016 5.39465C2.30648 8.2464 5.25197 10 8.5 10C11.748 10 14.6935 8.2464 16.867 5.39808C17.0443 5.16472 17.0443 4.83871 16.867 4.60535C14.6935 1.7536 11.748 0 8.5 0ZM8.733 8.52093C6.57691 8.65477 4.79641 6.90117 4.93203 4.77008C5.04332 3.01304 6.4865 1.58888 8.267 1.47907C10.4231 1.34523 12.2036 3.09883 12.068 5.22992C11.9532 6.98353 10.51 8.40769 8.733 8.52093ZM8.62519 6.8943C7.46369 6.96637 6.50389 6.02265 6.58039 4.87646C6.63951 3.92931 7.41848 3.16404 8.37829 3.10227C9.53979 3.0302 10.4996 3.97392 10.4231 5.12011C10.3605 6.07069 9.58152 6.83596 8.62519 6.8943Z",
													}),
												],
												-1
											),
											(0, n.eW)(" VIEW ", -1),
										])
								),
							]),
						]),
					])
				);
			}
			var H = {
					name: "AdminRainElement",
					props: ["rain"],
					methods: {
						adminFormatValue(t) {
							return parseFloat(Math.floor(t / 10) / 100)
								.toFixed(2)
								.toString()
								.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
						},
						adminViewButton() {
							alert("Surprise :D");
						},
					},
				},
				U = i(66262);
			const X = (0, U.A)(H, [
				["render", W],
				["__scopeId", "data-v-aedbab84"],
			]);
			var G = X,
				j = i(41167),
				$ = {
					name: "AdminRain",
					components: {LoadingAnimation: D.A, ButtonLoading: E.A, AdminRainElement: G, AdminFilterSearch: j.A},
					data() {
						return {adminChange: !1, adminAmount: null};
					},
					methods: {
						...(0, F.i0)(["adminGetRainListSocket", "adminSetRainListPage", "adminSetFilterSearch", "adminSendRainAmountSocket"]),
						adminFormatValue(t) {
							return parseFloat(Math.floor(t / 10) / 100)
								.toFixed(2)
								.toString()
								.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
						},
						adminSetPage(t) {
							if (this.adminRainList.page === t) return;
							if (t < 1 || t > Math.ceil(this.adminRainList.count / 12)) return;
							this.adminSetRainListPage(t);
							const e = {page: this.adminRainList.page, search: this.adminFilterSearch};
							this.adminGetRainListSocket(e);
						},
						adminSetChange(t) {
							this.adminChange = t;
						},
						adminUpdateButton() {
							const t = Math.floor(1e3 * this.adminAmount);
							if (null === t || !0 === isNaN(t) || t < 0) return void this.notificationShow({type: "error", message: "Your entered amount is invalid."});
							const e = {amount: t};
							this.adminSendRainAmountSocket(e), (this.adminChange = !1);
						},
					},
					computed: {...(0, F.L8)(["socketSendLoading", "adminRainList", "adminFilterSearch", "generalRain"])},
					watch: {
						"generalRain.site": {
							deep: !0,
							handler(t, e) {
								!1 === this.adminChange && (this.adminAmount = parseFloat(Math.floor(this.generalRain.site.amount / 10) / 100).toFixed(2));
							},
						},
					},
					created() {
						if (((this.adminAmount = parseFloat(Math.floor(this.generalRain.site.amount / 10) / 100).toFixed(2)), !1 === this.adminRainList.loading)) {
							const t = {page: this.adminRainList.page, search: this.adminFilterSearch};
							this.adminGetRainListSocket(t);
						}
					},
					beforeRouteLeave(t, e, i) {
						this.adminSetFilterSearch(""), i();
					},
				};
			const Y = (0, U.A)($, [
				["render", M],
				["__scopeId", "data-v-677e06ba"],
			]);
			var K = Y;
		},
		43910: function (t, e, i) {
			i.r(e),
				i.d(e, {
					default: function () {
						return Hl;
					},
				});
			var n = i(20641),
				s = i(90033);
			const a = {class: "admin-dashboard"},
				o = {class: "admin-profit"},
				r = {class: "admin-growth"},
				l = {class: "growth-header"},
				d = {class: "header-actions"},
				c = {class: "growth-content"},
				h = {class: "content-chart"};
			function u(t, e, i, u, m, p) {
				const g = (0, n.g2)("AdminProfitElement"),
					f = (0, n.g2)("LineChart");
				return (
					(0, n.uX)(),
					(0, n.CE)("div", a, [
						(0, n.Lk)("div", o, [
							(0, n.bF)(g, {type: "day", stats: null === t.adminStatsData.data ? null : t.adminStatsData.data.stats.daily}, null, 8, ["stats"]),
							(0, n.bF)(g, {type: "week", stats: null === t.adminStatsData.data ? null : t.adminStatsData.data.stats.weekly}, null, 8, ["stats"]),
							(0, n.bF)(g, {type: "month", stats: null === t.adminStatsData.data ? null : t.adminStatsData.data.stats.monthly}, null, 8, ["stats"]),
							(0, n.bF)(g, {type: "overall", stats: null === t.adminStatsData.data ? null : t.adminStatsData.data.stats.total}, null, 8, ["stats"]),
						]),
						(0, n.Lk)("div", r, [
							(0, n.Lk)("div", l, [
								e[3] || (e[3] = (0, n.Lk)("div", {class: "header-title"}, "GROWTH", -1)),
								(0, n.Lk)("div", d, [
									(0, n.Lk)("button", {onClick: e[0] || (e[0] = (t) => p.adminSetMode("daily")), class: (0, s.C4)({"button-active": "daily" === m.adminMode})}, "DAILY", 2),
									(0, n.Lk)("button", {onClick: e[1] || (e[1] = (t) => p.adminSetMode("weekly")), class: (0, s.C4)({"button-active": "weekly" === m.adminMode})}, "WEEKLY", 2),
									(0, n.Lk)("button", {onClick: e[2] || (e[2] = (t) => p.adminSetMode("monthly")), class: (0, s.C4)({"button-active": "monthly" === m.adminMode})}, "MONTHLY", 2),
								]),
							]),
							(0, n.Lk)("div", c, [
								(0, n.Lk)("div", h, [(0, n.bF)(f, {class: "chart-graph", chartOptions: m.adminChartOptions, chartData: p.adminGetChartData, height: 250}, null, 8, ["chartOptions", "chartData"])]),
							]),
						]),
					])
				);
			}
			var m = i(66278);
			function p(t, e, i, s, a, o) {
				const r = (0, n.g2)("LineChartGenerator");
				return (
					(0, n.uX)(),
					(0, n.Wv)(
						r,
						{
							"chart-options": i.chartOptions,
							"chart-data": i.chartData,
							"chart-id": i.chartId,
							"dataset-id-key": i.datasetIdKey,
							plugins: i.plugins,
							"css-classes": i.cssClasses,
							styles: i.styles,
							width: i.width,
							height: i.height,
						},
						null,
						8,
						["chart-options", "chart-data", "chart-id", "dataset-id-key", "plugins", "css-classes", "styles", "width", "height"]
					)
				);
			}
			/*!
			 * @kurkle/color v0.3.4
			 * https://github.com/kurkle/color#readme
			 * (c) 2024 Jukka Kurkela
			 * Released under the MIT License
			 */
			function g(t) {
				return (t + 0.5) | 0;
			}
			const f = (t, e, i) => Math.max(Math.min(t, i), e);
			function v(t) {
				return f(g(2.55 * t), 0, 255);
			}
			function b(t) {
				return f(g(255 * t), 0, 255);
			}
			function k(t) {
				return f(g(t / 2.55) / 100, 0, 1);
			}
			function x(t) {
				return f(g(100 * t), 0, 100);
			}
			const L = {0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, a: 10, b: 11, c: 12, d: 13, e: 14, f: 15},
				_ = [..."0123456789ABCDEF"],
				y = (t) => _[15 & t],
				w = (t) => _[(240 & t) >> 4] + _[15 & t],
				C = (t) => (240 & t) >> 4 === (15 & t),
				S = (t) => C(t.r) && C(t.g) && C(t.b) && C(t.a);
			function A(t) {
				var e,
					i = t.length;
				return (
					"#" === t[0] &&
						(4 === i || 5 === i
							? (e = {r: 255 & (17 * L[t[1]]), g: 255 & (17 * L[t[2]]), b: 255 & (17 * L[t[3]]), a: 5 === i ? 17 * L[t[4]] : 255})
							: (7 !== i && 9 !== i) || (e = {r: (L[t[1]] << 4) | L[t[2]], g: (L[t[3]] << 4) | L[t[4]], b: (L[t[5]] << 4) | L[t[6]], a: 9 === i ? (L[t[7]] << 4) | L[t[8]] : 255})),
					e
				);
			}
			const M = (t, e) => (t < 255 ? e(t) : "");
			function F(t) {
				var e = S(t) ? y : w;
				return t ? "#" + e(t.r) + e(t.g) + e(t.b) + M(t.a, e) : void 0;
			}
			const D = /^(hsla?|hwb|hsv)\(\s*([-+.e\d]+)(?:deg)?[\s,]+([-+.e\d]+)%[\s,]+([-+.e\d]+)%(?:[\s,]+([-+.e\d]+)(%)?)?\s*\)$/;
			function E(t, e, i) {
				const n = e * Math.min(i, 1 - i),
					s = (e, s = (e + t / 30) % 12) => i - n * Math.max(Math.min(s - 3, 9 - s, 1), -1);
				return [s(0), s(8), s(4)];
			}
			function T(t, e, i) {
				const n = (n, s = (n + t / 60) % 6) => i - i * e * Math.max(Math.min(s, 4 - s, 1), 0);
				return [n(5), n(3), n(1)];
			}
			function P(t, e, i) {
				const n = E(t, 1, 0.5);
				let s;
				for (e + i > 1 && ((s = 1 / (e + i)), (e *= s), (i *= s)), s = 0; s < 3; s++) (n[s] *= 1 - e - i), (n[s] += e);
				return n;
			}
			function I(t, e, i, n, s) {
				return t === s ? (e - i) / n + (e < i ? 6 : 0) : e === s ? (i - t) / n + 2 : (t - e) / n + 4;
			}
			function B(t) {
				const e = 255,
					i = t.r / e,
					n = t.g / e,
					s = t.b / e,
					a = Math.max(i, n, s),
					o = Math.min(i, n, s),
					r = (a + o) / 2;
				let l, d, c;
				return a !== o && ((c = a - o), (d = r > 0.5 ? c / (2 - a - o) : c / (a + o)), (l = I(i, n, s, c, a)), (l = 60 * l + 0.5)), [0 | l, d || 0, r];
			}
			function O(t, e, i, n) {
				return (Array.isArray(e) ? t(e[0], e[1], e[2]) : t(e, i, n)).map(b);
			}
			function R(t, e, i) {
				return O(E, t, e, i);
			}
			function V(t, e, i) {
				return O(P, t, e, i);
			}
			function N(t, e, i) {
				return O(T, t, e, i);
			}
			function z(t) {
				return ((t % 360) + 360) % 360;
			}
			function W(t) {
				const e = D.exec(t);
				let i,
					n = 255;
				if (!e) return;
				e[5] !== i && (n = e[6] ? v(+e[5]) : b(+e[5]));
				const s = z(+e[2]),
					a = +e[3] / 100,
					o = +e[4] / 100;
				return (i = "hwb" === e[1] ? V(s, a, o) : "hsv" === e[1] ? N(s, a, o) : R(s, a, o)), {r: i[0], g: i[1], b: i[2], a: n};
			}
			function H(t, e) {
				var i = B(t);
				(i[0] = z(i[0] + e)), (i = R(i)), (t.r = i[0]), (t.g = i[1]), (t.b = i[2]);
			}
			function U(t) {
				if (!t) return;
				const e = B(t),
					i = e[0],
					n = x(e[1]),
					s = x(e[2]);
				return t.a < 255 ? `hsla(${i}, ${n}%, ${s}%, ${k(t.a)})` : `hsl(${i}, ${n}%, ${s}%)`;
			}
			const X = {
					x: "dark",
					Z: "light",
					Y: "re",
					X: "blu",
					W: "gr",
					V: "medium",
					U: "slate",
					A: "ee",
					T: "ol",
					S: "or",
					B: "ra",
					C: "lateg",
					D: "ights",
					R: "in",
					Q: "turquois",
					E: "hi",
					P: "ro",
					O: "al",
					N: "le",
					M: "de",
					L: "yello",
					F: "en",
					K: "ch",
					G: "arks",
					H: "ea",
					I: "ightg",
					J: "wh",
				},
				G = {
					OiceXe: "f0f8ff",
					antiquewEte: "faebd7",
					aqua: "ffff",
					aquamarRe: "7fffd4",
					azuY: "f0ffff",
					beige: "f5f5dc",
					bisque: "ffe4c4",
					black: "0",
					blanKedOmond: "ffebcd",
					Xe: "ff",
					XeviTet: "8a2be2",
					bPwn: "a52a2a",
					burlywood: "deb887",
					caMtXe: "5f9ea0",
					KartYuse: "7fff00",
					KocTate: "d2691e",
					cSO: "ff7f50",
					cSnflowerXe: "6495ed",
					cSnsilk: "fff8dc",
					crimson: "dc143c",
					cyan: "ffff",
					xXe: "8b",
					xcyan: "8b8b",
					xgTMnPd: "b8860b",
					xWay: "a9a9a9",
					xgYF: "6400",
					xgYy: "a9a9a9",
					xkhaki: "bdb76b",
					xmagFta: "8b008b",
					xTivegYF: "556b2f",
					xSange: "ff8c00",
					xScEd: "9932cc",
					xYd: "8b0000",
					xsOmon: "e9967a",
					xsHgYF: "8fbc8f",
					xUXe: "483d8b",
					xUWay: "2f4f4f",
					xUgYy: "2f4f4f",
					xQe: "ced1",
					xviTet: "9400d3",
					dAppRk: "ff1493",
					dApskyXe: "bfff",
					dimWay: "696969",
					dimgYy: "696969",
					dodgerXe: "1e90ff",
					fiYbrick: "b22222",
					flSOwEte: "fffaf0",
					foYstWAn: "228b22",
					fuKsia: "ff00ff",
					gaRsbSo: "dcdcdc",
					ghostwEte: "f8f8ff",
					gTd: "ffd700",
					gTMnPd: "daa520",
					Way: "808080",
					gYF: "8000",
					gYFLw: "adff2f",
					gYy: "808080",
					honeyMw: "f0fff0",
					hotpRk: "ff69b4",
					RdianYd: "cd5c5c",
					Rdigo: "4b0082",
					ivSy: "fffff0",
					khaki: "f0e68c",
					lavFMr: "e6e6fa",
					lavFMrXsh: "fff0f5",
					lawngYF: "7cfc00",
					NmoncEffon: "fffacd",
					ZXe: "add8e6",
					ZcSO: "f08080",
					Zcyan: "e0ffff",
					ZgTMnPdLw: "fafad2",
					ZWay: "d3d3d3",
					ZgYF: "90ee90",
					ZgYy: "d3d3d3",
					ZpRk: "ffb6c1",
					ZsOmon: "ffa07a",
					ZsHgYF: "20b2aa",
					ZskyXe: "87cefa",
					ZUWay: "778899",
					ZUgYy: "778899",
					ZstAlXe: "b0c4de",
					ZLw: "ffffe0",
					lime: "ff00",
					limegYF: "32cd32",
					lRF: "faf0e6",
					magFta: "ff00ff",
					maPon: "800000",
					VaquamarRe: "66cdaa",
					VXe: "cd",
					VScEd: "ba55d3",
					VpurpN: "9370db",
					VsHgYF: "3cb371",
					VUXe: "7b68ee",
					VsprRggYF: "fa9a",
					VQe: "48d1cc",
					VviTetYd: "c71585",
					midnightXe: "191970",
					mRtcYam: "f5fffa",
					mistyPse: "ffe4e1",
					moccasR: "ffe4b5",
					navajowEte: "ffdead",
					navy: "80",
					Tdlace: "fdf5e6",
					Tive: "808000",
					TivedBb: "6b8e23",
					Sange: "ffa500",
					SangeYd: "ff4500",
					ScEd: "da70d6",
					pOegTMnPd: "eee8aa",
					pOegYF: "98fb98",
					pOeQe: "afeeee",
					pOeviTetYd: "db7093",
					papayawEp: "ffefd5",
					pHKpuff: "ffdab9",
					peru: "cd853f",
					pRk: "ffc0cb",
					plum: "dda0dd",
					powMrXe: "b0e0e6",
					purpN: "800080",
					YbeccapurpN: "663399",
					Yd: "ff0000",
					Psybrown: "bc8f8f",
					PyOXe: "4169e1",
					saddNbPwn: "8b4513",
					sOmon: "fa8072",
					sandybPwn: "f4a460",
					sHgYF: "2e8b57",
					sHshell: "fff5ee",
					siFna: "a0522d",
					silver: "c0c0c0",
					skyXe: "87ceeb",
					UXe: "6a5acd",
					UWay: "708090",
					UgYy: "708090",
					snow: "fffafa",
					sprRggYF: "ff7f",
					stAlXe: "4682b4",
					tan: "d2b48c",
					teO: "8080",
					tEstN: "d8bfd8",
					tomato: "ff6347",
					Qe: "40e0d0",
					viTet: "ee82ee",
					JHt: "f5deb3",
					wEte: "ffffff",
					wEtesmoke: "f5f5f5",
					Lw: "ffff00",
					LwgYF: "9acd32",
				};
			function j() {
				const t = {},
					e = Object.keys(G),
					i = Object.keys(X);
				let n, s, a, o, r;
				for (n = 0; n < e.length; n++) {
					for (o = r = e[n], s = 0; s < i.length; s++) (a = i[s]), (r = r.replace(a, X[a]));
					(a = parseInt(G[o], 16)), (t[r] = [(a >> 16) & 255, (a >> 8) & 255, 255 & a]);
				}
				return t;
			}
			let $;
			function Y(t) {
				$ || (($ = j()), ($.transparent = [0, 0, 0, 0]));
				const e = $[t.toLowerCase()];
				return e && {r: e[0], g: e[1], b: e[2], a: 4 === e.length ? e[3] : 255};
			}
			const K = /^rgba?\(\s*([-+.\d]+)(%)?[\s,]+([-+.e\d]+)(%)?[\s,]+([-+.e\d]+)(%)?(?:[\s,/]+([-+.e\d]+)(%)?)?\s*\)$/;
			function q(t) {
				const e = K.exec(t);
				let i,
					n,
					s,
					a = 255;
				if (e) {
					if (e[7] !== i) {
						const t = +e[7];
						a = e[8] ? v(t) : f(255 * t, 0, 255);
					}
					return (
						(i = +e[1]),
						(n = +e[3]),
						(s = +e[5]),
						(i = 255 & (e[2] ? v(i) : f(i, 0, 255))),
						(n = 255 & (e[4] ? v(n) : f(n, 0, 255))),
						(s = 255 & (e[6] ? v(s) : f(s, 0, 255))),
						{r: i, g: n, b: s, a: a}
					);
				}
			}
			function J(t) {
				return t && (t.a < 255 ? `rgba(${t.r}, ${t.g}, ${t.b}, ${k(t.a)})` : `rgb(${t.r}, ${t.g}, ${t.b})`);
			}
			const Z = (t) => (t <= 0.0031308 ? 12.92 * t : 1.055 * Math.pow(t, 1 / 2.4) - 0.055),
				Q = (t) => (t <= 0.04045 ? t / 12.92 : Math.pow((t + 0.055) / 1.055, 2.4));
			function tt(t, e, i) {
				const n = Q(k(t.r)),
					s = Q(k(t.g)),
					a = Q(k(t.b));
				return {r: b(Z(n + i * (Q(k(e.r)) - n))), g: b(Z(s + i * (Q(k(e.g)) - s))), b: b(Z(a + i * (Q(k(e.b)) - a))), a: t.a + i * (e.a - t.a)};
			}
			function et(t, e, i) {
				if (t) {
					let n = B(t);
					(n[e] = Math.max(0, Math.min(n[e] + n[e] * i, 0 === e ? 360 : 1))), (n = R(n)), (t.r = n[0]), (t.g = n[1]), (t.b = n[2]);
				}
			}
			function it(t, e) {
				return t ? Object.assign(e || {}, t) : t;
			}
			function nt(t) {
				var e = {r: 0, g: 0, b: 0, a: 255};
				return Array.isArray(t) ? t.length >= 3 && ((e = {r: t[0], g: t[1], b: t[2], a: 255}), t.length > 3 && (e.a = b(t[3]))) : ((e = it(t, {r: 0, g: 0, b: 0, a: 1})), (e.a = b(e.a))), e;
			}
			function st(t) {
				return "r" === t.charAt(0) ? q(t) : W(t);
			}
			class at {
				constructor(t) {
					if (t instanceof at) return t;
					const e = typeof t;
					let i;
					"object" === e ? (i = nt(t)) : "string" === e && (i = A(t) || Y(t) || st(t)), (this._rgb = i), (this._valid = !!i);
				}
				get valid() {
					return this._valid;
				}
				get rgb() {
					var t = it(this._rgb);
					return t && (t.a = k(t.a)), t;
				}
				set rgb(t) {
					this._rgb = nt(t);
				}
				rgbString() {
					return this._valid ? J(this._rgb) : void 0;
				}
				hexString() {
					return this._valid ? F(this._rgb) : void 0;
				}
				hslString() {
					return this._valid ? U(this._rgb) : void 0;
				}
				mix(t, e) {
					if (t) {
						const i = this.rgb,
							n = t.rgb;
						let s;
						const a = e === s ? 0.5 : e,
							o = 2 * a - 1,
							r = i.a - n.a,
							l = ((o * r === -1 ? o : (o + r) / (1 + o * r)) + 1) / 2;
						(s = 1 - l), (i.r = 255 & (l * i.r + s * n.r + 0.5)), (i.g = 255 & (l * i.g + s * n.g + 0.5)), (i.b = 255 & (l * i.b + s * n.b + 0.5)), (i.a = a * i.a + (1 - a) * n.a), (this.rgb = i);
					}
					return this;
				}
				interpolate(t, e) {
					return t && (this._rgb = tt(this._rgb, t._rgb, e)), this;
				}
				clone() {
					return new at(this.rgb);
				}
				alpha(t) {
					return (this._rgb.a = b(t)), this;
				}
				clearer(t) {
					const e = this._rgb;
					return (e.a *= 1 - t), this;
				}
				greyscale() {
					const t = this._rgb,
						e = g(0.3 * t.r + 0.59 * t.g + 0.11 * t.b);
					return (t.r = t.g = t.b = e), this;
				}
				opaquer(t) {
					const e = this._rgb;
					return (e.a *= 1 + t), this;
				}
				negate() {
					const t = this._rgb;
					return (t.r = 255 - t.r), (t.g = 255 - t.g), (t.b = 255 - t.b), this;
				}
				lighten(t) {
					return et(this._rgb, 2, t), this;
				}
				darken(t) {
					return et(this._rgb, 2, -t), this;
				}
				saturate(t) {
					return et(this._rgb, 1, t), this;
				}
				desaturate(t) {
					return et(this._rgb, 1, -t), this;
				}
				rotate(t) {
					return H(this._rgb, t), this;
				}
			}
			/*!
			 * Chart.js v4.5.0
			 * https://www.chartjs.org
			 * (c) 2025 Chart.js Contributors
			 * Released under the MIT License
			 */
			function ot() {}
			const rt = (() => {
				let t = 0;
				return () => t++;
			})();
			function lt(t) {
				return null === t || void 0 === t;
			}
			function dt(t) {
				if (Array.isArray && Array.isArray(t)) return !0;
				const e = Object.prototype.toString.call(t);
				return "[object" === e.slice(0, 7) && "Array]" === e.slice(-6);
			}
			function ct(t) {
				return null !== t && "[object Object]" === Object.prototype.toString.call(t);
			}
			function ht(t) {
				return ("number" === typeof t || t instanceof Number) && isFinite(+t);
			}
			function ut(t, e) {
				return ht(t) ? t : e;
			}
			function mt(t, e) {
				return "undefined" === typeof t ? e : t;
			}
			const pt = (t, e) => ("string" === typeof t && t.endsWith("%") ? (parseFloat(t) / 100) * e : +t);
			function gt(t, e, i) {
				if (t && "function" === typeof t.call) return t.apply(i, e);
			}
			function ft(t, e, i, n) {
				let s, a, o;
				if (dt(t))
					if (((a = t.length), n)) for (s = a - 1; s >= 0; s--) e.call(i, t[s], s);
					else for (s = 0; s < a; s++) e.call(i, t[s], s);
				else if (ct(t)) for (o = Object.keys(t), a = o.length, s = 0; s < a; s++) e.call(i, t[o[s]], o[s]);
			}
			function vt(t, e) {
				let i, n, s, a;
				if (!t || !e || t.length !== e.length) return !1;
				for (i = 0, n = t.length; i < n; ++i) if (((s = t[i]), (a = e[i]), s.datasetIndex !== a.datasetIndex || s.index !== a.index)) return !1;
				return !0;
			}
			function bt(t) {
				if (dt(t)) return t.map(bt);
				if (ct(t)) {
					const e = Object.create(null),
						i = Object.keys(t),
						n = i.length;
					let s = 0;
					for (; s < n; ++s) e[i[s]] = bt(t[i[s]]);
					return e;
				}
				return t;
			}
			function kt(t) {
				return -1 === ["__proto__", "prototype", "constructor"].indexOf(t);
			}
			function xt(t, e, i, n) {
				if (!kt(t)) return;
				const s = e[t],
					a = i[t];
				ct(s) && ct(a) ? Lt(s, a, n) : (e[t] = bt(a));
			}
			function Lt(t, e, i) {
				const n = dt(e) ? e : [e],
					s = n.length;
				if (!ct(t)) return t;
				i = i || {};
				const a = i.merger || xt;
				let o;
				for (let r = 0; r < s; ++r) {
					if (((o = n[r]), !ct(o))) continue;
					const e = Object.keys(o);
					for (let n = 0, s = e.length; n < s; ++n) a(e[n], t, o, i);
				}
				return t;
			}
			function _t(t, e) {
				return Lt(t, e, {merger: yt});
			}
			function yt(t, e, i) {
				if (!kt(t)) return;
				const n = e[t],
					s = i[t];
				ct(n) && ct(s) ? _t(n, s) : Object.prototype.hasOwnProperty.call(e, t) || (e[t] = bt(s));
			}
			const wt = {"": (t) => t, x: (t) => t.x, y: (t) => t.y};
			function Ct(t) {
				const e = t.split("."),
					i = [];
				let n = "";
				for (const s of e) (n += s), n.endsWith("\\") ? (n = n.slice(0, -1) + ".") : (i.push(n), (n = ""));
				return i;
			}
			function St(t) {
				const e = Ct(t);
				return (t) => {
					for (const i of e) {
						if ("" === i) break;
						t = t && t[i];
					}
					return t;
				};
			}
			function At(t, e) {
				const i = wt[e] || (wt[e] = St(e));
				return i(t);
			}
			function Mt(t) {
				return t.charAt(0).toUpperCase() + t.slice(1);
			}
			const Ft = (t) => "undefined" !== typeof t,
				Dt = (t) => "function" === typeof t,
				Et = (t, e) => {
					if (t.size !== e.size) return !1;
					for (const i of t) if (!e.has(i)) return !1;
					return !0;
				};
			function Tt(t) {
				return "mouseup" === t.type || "click" === t.type || "contextmenu" === t.type;
			}
			const Pt = Math.PI,
				It = 2 * Pt,
				Bt = It + Pt,
				Ot = Number.POSITIVE_INFINITY,
				Rt = Pt / 180,
				Vt = Pt / 2,
				Nt = Pt / 4,
				zt = (2 * Pt) / 3,
				Wt = Math.log10,
				Ht = Math.sign;
			function Ut(t, e, i) {
				return Math.abs(t - e) < i;
			}
			function Xt(t) {
				const e = Math.round(t);
				t = Ut(t, e, t / 1e3) ? e : t;
				const i = Math.pow(10, Math.floor(Wt(t))),
					n = t / i,
					s = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
				return s * i;
			}
			function Gt(t) {
				const e = [],
					i = Math.sqrt(t);
				let n;
				for (n = 1; n < i; n++) t % n === 0 && (e.push(n), e.push(t / n));
				return i === (0 | i) && e.push(i), e.sort((t, e) => t - e).pop(), e;
			}
			function jt(t) {
				return "symbol" === typeof t || ("object" === typeof t && null !== t && !(Symbol.toPrimitive in t || "toString" in t || "valueOf" in t));
			}
			function $t(t) {
				return !jt(t) && !isNaN(parseFloat(t)) && isFinite(t);
			}
			function Yt(t, e) {
				const i = Math.round(t);
				return i - e <= t && i + e >= t;
			}
			function Kt(t, e, i) {
				let n, s, a;
				for (n = 0, s = t.length; n < s; n++) (a = t[n][i]), isNaN(a) || ((e.min = Math.min(e.min, a)), (e.max = Math.max(e.max, a)));
			}
			function qt(t) {
				return t * (Pt / 180);
			}
			function Jt(t) {
				return t * (180 / Pt);
			}
			function Zt(t) {
				if (!ht(t)) return;
				let e = 1,
					i = 0;
				while (Math.round(t * e) / e !== t) (e *= 10), i++;
				return i;
			}
			function Qt(t, e) {
				const i = e.x - t.x,
					n = e.y - t.y,
					s = Math.sqrt(i * i + n * n);
				let a = Math.atan2(n, i);
				return a < -0.5 * Pt && (a += It), {angle: a, distance: s};
			}
			function te(t, e) {
				return Math.sqrt(Math.pow(e.x - t.x, 2) + Math.pow(e.y - t.y, 2));
			}
			function ee(t, e) {
				return ((t - e + Bt) % It) - Pt;
			}
			function ie(t) {
				return ((t % It) + It) % It;
			}
			function ne(t, e, i, n) {
				const s = ie(t),
					a = ie(e),
					o = ie(i),
					r = ie(a - s),
					l = ie(o - s),
					d = ie(s - a),
					c = ie(s - o);
				return s === a || s === o || (n && a === o) || (r > l && d < c);
			}
			function se(t, e, i) {
				return Math.max(e, Math.min(i, t));
			}
			function ae(t) {
				return se(t, -32768, 32767);
			}
			function oe(t, e, i, n = 1e-6) {
				return t >= Math.min(e, i) - n && t <= Math.max(e, i) + n;
			}
			function re(t, e, i) {
				i = i || ((i) => t[i] < e);
				let n,
					s = t.length - 1,
					a = 0;
				while (s - a > 1) (n = (a + s) >> 1), i(n) ? (a = n) : (s = n);
				return {lo: a, hi: s};
			}
			const le = (t, e, i, n) =>
					re(
						t,
						i,
						n
							? (n) => {
									const s = t[n][e];
									return s < i || (s === i && t[n + 1][e] === i);
							  }
							: (n) => t[n][e] < i
					),
				de = (t, e, i) => re(t, i, (n) => t[n][e] >= i);
			function ce(t, e, i) {
				let n = 0,
					s = t.length;
				while (n < s && t[n] < e) n++;
				while (s > n && t[s - 1] > i) s--;
				return n > 0 || s < t.length ? t.slice(n, s) : t;
			}
			const he = ["push", "pop", "shift", "splice", "unshift"];
			function ue(t, e) {
				t._chartjs
					? t._chartjs.listeners.push(e)
					: (Object.defineProperty(t, "_chartjs", {configurable: !0, enumerable: !1, value: {listeners: [e]}}),
					  he.forEach((e) => {
							const i = "_onData" + Mt(e),
								n = t[e];
							Object.defineProperty(t, e, {
								configurable: !0,
								enumerable: !1,
								value(...e) {
									const s = n.apply(this, e);
									return (
										t._chartjs.listeners.forEach((t) => {
											"function" === typeof t[i] && t[i](...e);
										}),
										s
									);
								},
							});
					  }));
			}
			function me(t, e) {
				const i = t._chartjs;
				if (!i) return;
				const n = i.listeners,
					s = n.indexOf(e);
				-1 !== s && n.splice(s, 1),
					n.length > 0 ||
						(he.forEach((e) => {
							delete t[e];
						}),
						delete t._chartjs);
			}
			function pe(t) {
				const e = new Set(t);
				return e.size === t.length ? t : Array.from(e);
			}
			const ge = (function () {
				return "undefined" === typeof window
					? function (t) {
							return t();
					  }
					: window.requestAnimationFrame;
			})();
			function fe(t, e) {
				let i = [],
					n = !1;
				return function (...s) {
					(i = s),
						n ||
							((n = !0),
							ge.call(window, () => {
								(n = !1), t.apply(e, i);
							}));
				};
			}
			function ve(t, e) {
				let i;
				return function (...n) {
					return e ? (clearTimeout(i), (i = setTimeout(t, e, n))) : t.apply(this, n), e;
				};
			}
			const be = (t) => ("start" === t ? "left" : "end" === t ? "right" : "center"),
				ke = (t, e, i) => ("start" === t ? e : "end" === t ? i : (e + i) / 2),
				xe = (t, e, i, n) => {
					const s = n ? "left" : "right";
					return t === s ? i : "center" === t ? (e + i) / 2 : e;
				};
			function Le(t, e, i) {
				const n = e.length;
				let s = 0,
					a = n;
				if (t._sorted) {
					const {iScale: o, vScale: r, _parsed: l} = t,
						d = t.dataset && t.dataset.options ? t.dataset.options.spanGaps : null,
						c = o.axis,
						{min: h, max: u, minDefined: m, maxDefined: p} = o.getUserBounds();
					if (m) {
						if (((s = Math.min(le(l, c, h).lo, i ? n : le(e, c, o.getPixelForValue(h)).lo)), d)) {
							const t = l
								.slice(0, s + 1)
								.reverse()
								.findIndex((t) => !lt(t[r.axis]));
							s -= Math.max(0, t);
						}
						s = se(s, 0, n - 1);
					}
					if (p) {
						let t = Math.max(le(l, o.axis, u, !0).hi + 1, i ? 0 : le(e, c, o.getPixelForValue(u), !0).hi + 1);
						if (d) {
							const e = l.slice(t - 1).findIndex((t) => !lt(t[r.axis]));
							t += Math.max(0, e);
						}
						a = se(t, s, n) - s;
					} else a = n - s;
				}
				return {start: s, count: a};
			}
			function _e(t) {
				const {xScale: e, yScale: i, _scaleRanges: n} = t,
					s = {xmin: e.min, xmax: e.max, ymin: i.min, ymax: i.max};
				if (!n) return (t._scaleRanges = s), !0;
				const a = n.xmin !== e.min || n.xmax !== e.max || n.ymin !== i.min || n.ymax !== i.max;
				return Object.assign(n, s), a;
			}
			const ye = (t) => 0 === t || 1 === t,
				we = (t, e, i) => -Math.pow(2, 10 * (t -= 1)) * Math.sin(((t - e) * It) / i),
				Ce = (t, e, i) => Math.pow(2, -10 * t) * Math.sin(((t - e) * It) / i) + 1,
				Se = {
					linear: (t) => t,
					easeInQuad: (t) => t * t,
					easeOutQuad: (t) => -t * (t - 2),
					easeInOutQuad: (t) => ((t /= 0.5) < 1 ? 0.5 * t * t : -0.5 * (--t * (t - 2) - 1)),
					easeInCubic: (t) => t * t * t,
					easeOutCubic: (t) => (t -= 1) * t * t + 1,
					easeInOutCubic: (t) => ((t /= 0.5) < 1 ? 0.5 * t * t * t : 0.5 * ((t -= 2) * t * t + 2)),
					easeInQuart: (t) => t * t * t * t,
					easeOutQuart: (t) => -((t -= 1) * t * t * t - 1),
					easeInOutQuart: (t) => ((t /= 0.5) < 1 ? 0.5 * t * t * t * t : -0.5 * ((t -= 2) * t * t * t - 2)),
					easeInQuint: (t) => t * t * t * t * t,
					easeOutQuint: (t) => (t -= 1) * t * t * t * t + 1,
					easeInOutQuint: (t) => ((t /= 0.5) < 1 ? 0.5 * t * t * t * t * t : 0.5 * ((t -= 2) * t * t * t * t + 2)),
					easeInSine: (t) => 1 - Math.cos(t * Vt),
					easeOutSine: (t) => Math.sin(t * Vt),
					easeInOutSine: (t) => -0.5 * (Math.cos(Pt * t) - 1),
					easeInExpo: (t) => (0 === t ? 0 : Math.pow(2, 10 * (t - 1))),
					easeOutExpo: (t) => (1 === t ? 1 : 1 - Math.pow(2, -10 * t)),
					easeInOutExpo: (t) => (ye(t) ? t : t < 0.5 ? 0.5 * Math.pow(2, 10 * (2 * t - 1)) : 0.5 * (2 - Math.pow(2, -10 * (2 * t - 1)))),
					easeInCirc: (t) => (t >= 1 ? t : -(Math.sqrt(1 - t * t) - 1)),
					easeOutCirc: (t) => Math.sqrt(1 - (t -= 1) * t),
					easeInOutCirc: (t) => ((t /= 0.5) < 1 ? -0.5 * (Math.sqrt(1 - t * t) - 1) : 0.5 * (Math.sqrt(1 - (t -= 2) * t) + 1)),
					easeInElastic: (t) => (ye(t) ? t : we(t, 0.075, 0.3)),
					easeOutElastic: (t) => (ye(t) ? t : Ce(t, 0.075, 0.3)),
					easeInOutElastic(t) {
						const e = 0.1125,
							i = 0.45;
						return ye(t) ? t : t < 0.5 ? 0.5 * we(2 * t, e, i) : 0.5 + 0.5 * Ce(2 * t - 1, e, i);
					},
					easeInBack(t) {
						const e = 1.70158;
						return t * t * ((e + 1) * t - e);
					},
					easeOutBack(t) {
						const e = 1.70158;
						return (t -= 1) * t * ((e + 1) * t + e) + 1;
					},
					easeInOutBack(t) {
						let e = 1.70158;
						return (t /= 0.5) < 1 ? t * t * ((1 + (e *= 1.525)) * t - e) * 0.5 : 0.5 * ((t -= 2) * t * ((1 + (e *= 1.525)) * t + e) + 2);
					},
					easeInBounce: (t) => 1 - Se.easeOutBounce(1 - t),
					easeOutBounce(t) {
						const e = 7.5625,
							i = 2.75;
						return t < 1 / i ? e * t * t : t < 2 / i ? e * (t -= 1.5 / i) * t + 0.75 : t < 2.5 / i ? e * (t -= 2.25 / i) * t + 0.9375 : e * (t -= 2.625 / i) * t + 0.984375;
					},
					easeInOutBounce: (t) => (t < 0.5 ? 0.5 * Se.easeInBounce(2 * t) : 0.5 * Se.easeOutBounce(2 * t - 1) + 0.5),
				};
			function Ae(t) {
				if (t && "object" === typeof t) {
					const e = t.toString();
					return "[object CanvasPattern]" === e || "[object CanvasGradient]" === e;
				}
				return !1;
			}
			function Me(t) {
				return Ae(t) ? t : new at(t);
			}
			function Fe(t) {
				return Ae(t) ? t : new at(t).saturate(0.5).darken(0.1).hexString();
			}
			const De = ["x", "y", "borderWidth", "radius", "tension"],
				Ee = ["color", "borderColor", "backgroundColor"];
			function Te(t) {
				t.set("animation", {delay: void 0, duration: 1e3, easing: "easeOutQuart", fn: void 0, from: void 0, loop: void 0, to: void 0, type: void 0}),
					t.describe("animation", {_fallback: !1, _indexable: !1, _scriptable: (t) => "onProgress" !== t && "onComplete" !== t && "fn" !== t}),
					t.set("animations", {colors: {type: "color", properties: Ee}, numbers: {type: "number", properties: De}}),
					t.describe("animations", {_fallback: "animation"}),
					t.set("transitions", {
						active: {animation: {duration: 400}},
						resize: {animation: {duration: 0}},
						show: {animations: {colors: {from: "transparent"}, visible: {type: "boolean", duration: 0}}},
						hide: {animations: {colors: {to: "transparent"}, visible: {type: "boolean", easing: "linear", fn: (t) => 0 | t}}},
					});
			}
			function Pe(t) {
				t.set("layout", {autoPadding: !0, padding: {top: 0, right: 0, bottom: 0, left: 0}});
			}
			const Ie = new Map();
			function Be(t, e) {
				e = e || {};
				const i = t + JSON.stringify(e);
				let n = Ie.get(i);
				return n || ((n = new Intl.NumberFormat(t, e)), Ie.set(i, n)), n;
			}
			function Oe(t, e, i) {
				return Be(e, i).format(t);
			}
			const Re = {
				values(t) {
					return dt(t) ? t : "" + t;
				},
				numeric(t, e, i) {
					if (0 === t) return "0";
					const n = this.chart.options.locale;
					let s,
						a = t;
					if (i.length > 1) {
						const e = Math.max(Math.abs(i[0].value), Math.abs(i[i.length - 1].value));
						(e < 1e-4 || e > 1e15) && (s = "scientific"), (a = Ve(t, i));
					}
					const o = Wt(Math.abs(a)),
						r = isNaN(o) ? 1 : Math.max(Math.min(-1 * Math.floor(o), 20), 0),
						l = {notation: s, minimumFractionDigits: r, maximumFractionDigits: r};
					return Object.assign(l, this.options.ticks.format), Oe(t, n, l);
				},
				logarithmic(t, e, i) {
					if (0 === t) return "0";
					const n = i[e].significand || t / Math.pow(10, Math.floor(Wt(t)));
					return [1, 2, 3, 5, 10, 15].includes(n) || e > 0.8 * i.length ? Re.numeric.call(this, t, e, i) : "";
				},
			};
			function Ve(t, e) {
				let i = e.length > 3 ? e[2].value - e[1].value : e[1].value - e[0].value;
				return Math.abs(i) >= 1 && t !== Math.floor(t) && (i = t - Math.floor(t)), i;
			}
			var Ne = {formatters: Re};
			function ze(t) {
				t.set("scale", {
					display: !0,
					offset: !1,
					reverse: !1,
					beginAtZero: !1,
					bounds: "ticks",
					clip: !0,
					grace: 0,
					grid: {display: !0, lineWidth: 1, drawOnChartArea: !0, drawTicks: !0, tickLength: 8, tickWidth: (t, e) => e.lineWidth, tickColor: (t, e) => e.color, offset: !1},
					border: {display: !0, dash: [], dashOffset: 0, width: 1},
					title: {display: !1, text: "", padding: {top: 4, bottom: 4}},
					ticks: {
						minRotation: 0,
						maxRotation: 50,
						mirror: !1,
						textStrokeWidth: 0,
						textStrokeColor: "",
						padding: 3,
						display: !0,
						autoSkip: !0,
						autoSkipPadding: 3,
						labelOffset: 0,
						callback: Ne.formatters.values,
						minor: {},
						major: {},
						align: "center",
						crossAlign: "near",
						showLabelBackdrop: !1,
						backdropColor: "rgba(255, 255, 255, 0.75)",
						backdropPadding: 2,
					},
				}),
					t.route("scale.ticks", "color", "", "color"),
					t.route("scale.grid", "color", "", "borderColor"),
					t.route("scale.border", "color", "", "borderColor"),
					t.route("scale.title", "color", "", "color"),
					t.describe("scale", {
						_fallback: !1,
						_scriptable: (t) => !t.startsWith("before") && !t.startsWith("after") && "callback" !== t && "parser" !== t,
						_indexable: (t) => "borderDash" !== t && "tickBorderDash" !== t && "dash" !== t,
					}),
					t.describe("scales", {_fallback: "scale"}),
					t.describe("scale.ticks", {_scriptable: (t) => "backdropPadding" !== t && "callback" !== t, _indexable: (t) => "backdropPadding" !== t});
			}
			const We = Object.create(null),
				He = Object.create(null);
			function Ue(t, e) {
				if (!e) return t;
				const i = e.split(".");
				for (let n = 0, s = i.length; n < s; ++n) {
					const e = i[n];
					t = t[e] || (t[e] = Object.create(null));
				}
				return t;
			}
			function Xe(t, e, i) {
				return "string" === typeof e ? Lt(Ue(t, e), i) : Lt(Ue(t, ""), e);
			}
			class Ge {
				constructor(t, e) {
					(this.animation = void 0),
						(this.backgroundColor = "rgba(0,0,0,0.1)"),
						(this.borderColor = "rgba(0,0,0,0.1)"),
						(this.color = "#666"),
						(this.datasets = {}),
						(this.devicePixelRatio = (t) => t.chart.platform.getDevicePixelRatio()),
						(this.elements = {}),
						(this.events = ["mousemove", "mouseout", "click", "touchstart", "touchmove"]),
						(this.font = {family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif", size: 12, style: "normal", lineHeight: 1.2, weight: null}),
						(this.hover = {}),
						(this.hoverBackgroundColor = (t, e) => Fe(e.backgroundColor)),
						(this.hoverBorderColor = (t, e) => Fe(e.borderColor)),
						(this.hoverColor = (t, e) => Fe(e.color)),
						(this.indexAxis = "x"),
						(this.interaction = {mode: "nearest", intersect: !0, includeInvisible: !1}),
						(this.maintainAspectRatio = !0),
						(this.onHover = null),
						(this.onClick = null),
						(this.parsing = !0),
						(this.plugins = {}),
						(this.responsive = !0),
						(this.scale = void 0),
						(this.scales = {}),
						(this.showLine = !0),
						(this.drawActiveElementsOnTop = !0),
						this.describe(t),
						this.apply(e);
				}
				set(t, e) {
					return Xe(this, t, e);
				}
				get(t) {
					return Ue(this, t);
				}
				describe(t, e) {
					return Xe(He, t, e);
				}
				override(t, e) {
					return Xe(We, t, e);
				}
				route(t, e, i, n) {
					const s = Ue(this, t),
						a = Ue(this, i),
						o = "_" + e;
					Object.defineProperties(s, {
						[o]: {value: s[e], writable: !0},
						[e]: {
							enumerable: !0,
							get() {
								const t = this[o],
									e = a[n];
								return ct(t) ? Object.assign({}, e, t) : mt(t, e);
							},
							set(t) {
								this[o] = t;
							},
						},
					});
				}
				apply(t) {
					t.forEach((t) => t(this));
				}
			}
			var je = new Ge({_scriptable: (t) => !t.startsWith("on"), _indexable: (t) => "events" !== t, hover: {_fallback: "interaction"}, interaction: {_scriptable: !1, _indexable: !1}}, [Te, Pe, ze]);
			function $e(t) {
				return !t || lt(t.size) || lt(t.family) ? null : (t.style ? t.style + " " : "") + (t.weight ? t.weight + " " : "") + t.size + "px " + t.family;
			}
			function Ye(t, e, i, n, s) {
				let a = e[s];
				return a || ((a = e[s] = t.measureText(s).width), i.push(s)), a > n && (n = a), n;
			}
			function Ke(t, e, i) {
				const n = t.currentDevicePixelRatio,
					s = 0 !== i ? Math.max(i / 2, 0.5) : 0;
				return Math.round((e - s) * n) / n + s;
			}
			function qe(t, e) {
				(e || t) && ((e = e || t.getContext("2d")), e.save(), e.resetTransform(), e.clearRect(0, 0, t.width, t.height), e.restore());
			}
			function Je(t, e, i, n) {
				Ze(t, e, i, n, null);
			}
			function Ze(t, e, i, n, s) {
				let a, o, r, l, d, c, h, u;
				const m = e.pointStyle,
					p = e.rotation,
					g = e.radius;
				let f = (p || 0) * Rt;
				if (m && "object" === typeof m && ((a = m.toString()), "[object HTMLImageElement]" === a || "[object HTMLCanvasElement]" === a))
					return t.save(), t.translate(i, n), t.rotate(f), t.drawImage(m, -m.width / 2, -m.height / 2, m.width, m.height), void t.restore();
				if (!(isNaN(g) || g <= 0)) {
					switch ((t.beginPath(), m)) {
						default:
							s ? t.ellipse(i, n, s / 2, g, 0, 0, It) : t.arc(i, n, g, 0, It), t.closePath();
							break;
						case "triangle":
							(c = s ? s / 2 : g),
								t.moveTo(i + Math.sin(f) * c, n - Math.cos(f) * g),
								(f += zt),
								t.lineTo(i + Math.sin(f) * c, n - Math.cos(f) * g),
								(f += zt),
								t.lineTo(i + Math.sin(f) * c, n - Math.cos(f) * g),
								t.closePath();
							break;
						case "rectRounded":
							(d = 0.516 * g),
								(l = g - d),
								(o = Math.cos(f + Nt) * l),
								(h = Math.cos(f + Nt) * (s ? s / 2 - d : l)),
								(r = Math.sin(f + Nt) * l),
								(u = Math.sin(f + Nt) * (s ? s / 2 - d : l)),
								t.arc(i - h, n - r, d, f - Pt, f - Vt),
								t.arc(i + u, n - o, d, f - Vt, f),
								t.arc(i + h, n + r, d, f, f + Vt),
								t.arc(i - u, n + o, d, f + Vt, f + Pt),
								t.closePath();
							break;
						case "rect":
							if (!p) {
								(l = Math.SQRT1_2 * g), (c = s ? s / 2 : l), t.rect(i - c, n - l, 2 * c, 2 * l);
								break;
							}
							f += Nt;
						case "rectRot":
							(h = Math.cos(f) * (s ? s / 2 : g)),
								(o = Math.cos(f) * g),
								(r = Math.sin(f) * g),
								(u = Math.sin(f) * (s ? s / 2 : g)),
								t.moveTo(i - h, n - r),
								t.lineTo(i + u, n - o),
								t.lineTo(i + h, n + r),
								t.lineTo(i - u, n + o),
								t.closePath();
							break;
						case "crossRot":
							f += Nt;
						case "cross":
							(h = Math.cos(f) * (s ? s / 2 : g)),
								(o = Math.cos(f) * g),
								(r = Math.sin(f) * g),
								(u = Math.sin(f) * (s ? s / 2 : g)),
								t.moveTo(i - h, n - r),
								t.lineTo(i + h, n + r),
								t.moveTo(i + u, n - o),
								t.lineTo(i - u, n + o);
							break;
						case "star":
							(h = Math.cos(f) * (s ? s / 2 : g)),
								(o = Math.cos(f) * g),
								(r = Math.sin(f) * g),
								(u = Math.sin(f) * (s ? s / 2 : g)),
								t.moveTo(i - h, n - r),
								t.lineTo(i + h, n + r),
								t.moveTo(i + u, n - o),
								t.lineTo(i - u, n + o),
								(f += Nt),
								(h = Math.cos(f) * (s ? s / 2 : g)),
								(o = Math.cos(f) * g),
								(r = Math.sin(f) * g),
								(u = Math.sin(f) * (s ? s / 2 : g)),
								t.moveTo(i - h, n - r),
								t.lineTo(i + h, n + r),
								t.moveTo(i + u, n - o),
								t.lineTo(i - u, n + o);
							break;
						case "line":
							(o = s ? s / 2 : Math.cos(f) * g), (r = Math.sin(f) * g), t.moveTo(i - o, n - r), t.lineTo(i + o, n + r);
							break;
						case "dash":
							t.moveTo(i, n), t.lineTo(i + Math.cos(f) * (s ? s / 2 : g), n + Math.sin(f) * g);
							break;
						case !1:
							t.closePath();
							break;
					}
					t.fill(), e.borderWidth > 0 && t.stroke();
				}
			}
			function Qe(t, e, i) {
				return (i = i || 0.5), !e || (t && t.x > e.left - i && t.x < e.right + i && t.y > e.top - i && t.y < e.bottom + i);
			}
			function ti(t, e) {
				t.save(), t.beginPath(), t.rect(e.left, e.top, e.right - e.left, e.bottom - e.top), t.clip();
			}
			function ei(t) {
				t.restore();
			}
			function ii(t, e, i, n, s) {
				if (!e) return t.lineTo(i.x, i.y);
				if ("middle" === s) {
					const n = (e.x + i.x) / 2;
					t.lineTo(n, e.y), t.lineTo(n, i.y);
				} else ("after" === s) !== !!n ? t.lineTo(e.x, i.y) : t.lineTo(i.x, e.y);
				t.lineTo(i.x, i.y);
			}
			function ni(t, e, i, n) {
				if (!e) return t.lineTo(i.x, i.y);
				t.bezierCurveTo(n ? e.cp1x : e.cp2x, n ? e.cp1y : e.cp2y, n ? i.cp2x : i.cp1x, n ? i.cp2y : i.cp1y, i.x, i.y);
			}
			function si(t, e) {
				e.translation && t.translate(e.translation[0], e.translation[1]),
					lt(e.rotation) || t.rotate(e.rotation),
					e.color && (t.fillStyle = e.color),
					e.textAlign && (t.textAlign = e.textAlign),
					e.textBaseline && (t.textBaseline = e.textBaseline);
			}
			function ai(t, e, i, n, s) {
				if (s.strikethrough || s.underline) {
					const a = t.measureText(n),
						o = e - a.actualBoundingBoxLeft,
						r = e + a.actualBoundingBoxRight,
						l = i - a.actualBoundingBoxAscent,
						d = i + a.actualBoundingBoxDescent,
						c = s.strikethrough ? (l + d) / 2 : d;
					(t.strokeStyle = t.fillStyle), t.beginPath(), (t.lineWidth = s.decorationWidth || 2), t.moveTo(o, c), t.lineTo(r, c), t.stroke();
				}
			}
			function oi(t, e) {
				const i = t.fillStyle;
				(t.fillStyle = e.color), t.fillRect(e.left, e.top, e.width, e.height), (t.fillStyle = i);
			}
			function ri(t, e, i, n, s, a = {}) {
				const o = dt(e) ? e : [e],
					r = a.strokeWidth > 0 && "" !== a.strokeColor;
				let l, d;
				for (t.save(), t.font = s.string, si(t, a), l = 0; l < o.length; ++l)
					(d = o[l]),
						a.backdrop && oi(t, a.backdrop),
						r && (a.strokeColor && (t.strokeStyle = a.strokeColor), lt(a.strokeWidth) || (t.lineWidth = a.strokeWidth), t.strokeText(d, i, n, a.maxWidth)),
						t.fillText(d, i, n, a.maxWidth),
						ai(t, i, n, d, a),
						(n += Number(s.lineHeight));
				t.restore();
			}
			function li(t, e) {
				const {x: i, y: n, w: s, h: a, radius: o} = e;
				t.arc(i + o.topLeft, n + o.topLeft, o.topLeft, 1.5 * Pt, Pt, !0),
					t.lineTo(i, n + a - o.bottomLeft),
					t.arc(i + o.bottomLeft, n + a - o.bottomLeft, o.bottomLeft, Pt, Vt, !0),
					t.lineTo(i + s - o.bottomRight, n + a),
					t.arc(i + s - o.bottomRight, n + a - o.bottomRight, o.bottomRight, Vt, 0, !0),
					t.lineTo(i + s, n + o.topRight),
					t.arc(i + s - o.topRight, n + o.topRight, o.topRight, 0, -Vt, !0),
					t.lineTo(i + o.topLeft, n);
			}
			const di = /^(normal|(\d+(?:\.\d+)?)(px|em|%)?)$/,
				ci = /^(normal|italic|initial|inherit|unset|(oblique( -?[0-9]?[0-9]deg)?))$/;
			function hi(t, e) {
				const i = ("" + t).match(di);
				if (!i || "normal" === i[1]) return 1.2 * e;
				switch (((t = +i[2]), i[3])) {
					case "px":
						return t;
					case "%":
						t /= 100;
						break;
				}
				return e * t;
			}
			const ui = (t) => +t || 0;
			function mi(t, e) {
				const i = {},
					n = ct(e),
					s = n ? Object.keys(e) : e,
					a = ct(t) ? (n ? (i) => mt(t[i], t[e[i]]) : (e) => t[e]) : () => t;
				for (const o of s) i[o] = ui(a(o));
				return i;
			}
			function pi(t) {
				return mi(t, {top: "y", right: "x", bottom: "y", left: "x"});
			}
			function gi(t) {
				return mi(t, ["topLeft", "topRight", "bottomLeft", "bottomRight"]);
			}
			function fi(t) {
				const e = pi(t);
				return (e.width = e.left + e.right), (e.height = e.top + e.bottom), e;
			}
			function vi(t, e) {
				(t = t || {}), (e = e || je.font);
				let i = mt(t.size, e.size);
				"string" === typeof i && (i = parseInt(i, 10));
				let n = mt(t.style, e.style);
				n && !("" + n).match(ci) && (console.warn('Invalid font style specified: "' + n + '"'), (n = void 0));
				const s = {family: mt(t.family, e.family), lineHeight: hi(mt(t.lineHeight, e.lineHeight), i), size: i, style: n, weight: mt(t.weight, e.weight), string: ""};
				return (s.string = $e(s)), s;
			}
			function bi(t, e, i, n) {
				let s,
					a,
					o,
					r = !0;
				for (s = 0, a = t.length; s < a; ++s)
					if (((o = t[s]), void 0 !== o && (void 0 !== e && "function" === typeof o && ((o = o(e)), (r = !1)), void 0 !== i && dt(o) && ((o = o[i % o.length]), (r = !1)), void 0 !== o)))
						return n && !r && (n.cacheable = !1), o;
			}
			function ki(t, e, i) {
				const {min: n, max: s} = t,
					a = pt(e, (s - n) / 2),
					o = (t, e) => (i && 0 === t ? 0 : t + e);
				return {min: o(n, -Math.abs(a)), max: o(s, a)};
			}
			function xi(t, e) {
				return Object.assign(Object.create(t), e);
			}
			function Li(t, e = [""], i, n, s = () => t[0]) {
				const a = i || t;
				"undefined" === typeof n && (n = Ri("_fallback", t));
				const o = {[Symbol.toStringTag]: "Object", _cacheable: !0, _scopes: t, _rootScopes: a, _fallback: n, _getTarget: s, override: (i) => Li([i, ...t], e, a, n)};
				return new Proxy(o, {
					deleteProperty(e, i) {
						return delete e[i], delete e._keys, delete t[0][i], !0;
					},
					get(i, n) {
						return Si(i, n, () => Oi(n, e, t, i));
					},
					getOwnPropertyDescriptor(t, e) {
						return Reflect.getOwnPropertyDescriptor(t._scopes[0], e);
					},
					getPrototypeOf() {
						return Reflect.getPrototypeOf(t[0]);
					},
					has(t, e) {
						return Vi(t).includes(e);
					},
					ownKeys(t) {
						return Vi(t);
					},
					set(t, e, i) {
						const n = t._storage || (t._storage = s());
						return (t[e] = n[e] = i), delete t._keys, !0;
					},
				});
			}
			function _i(t, e, i, n) {
				const s = {_cacheable: !1, _proxy: t, _context: e, _subProxy: i, _stack: new Set(), _descriptors: yi(t, n), setContext: (e) => _i(t, e, i, n), override: (s) => _i(t.override(s), e, i, n)};
				return new Proxy(s, {
					deleteProperty(e, i) {
						return delete e[i], delete t[i], !0;
					},
					get(t, e, i) {
						return Si(t, e, () => Ai(t, e, i));
					},
					getOwnPropertyDescriptor(e, i) {
						return e._descriptors.allKeys ? (Reflect.has(t, i) ? {enumerable: !0, configurable: !0} : void 0) : Reflect.getOwnPropertyDescriptor(t, i);
					},
					getPrototypeOf() {
						return Reflect.getPrototypeOf(t);
					},
					has(e, i) {
						return Reflect.has(t, i);
					},
					ownKeys() {
						return Reflect.ownKeys(t);
					},
					set(e, i, n) {
						return (t[i] = n), delete e[i], !0;
					},
				});
			}
			function yi(t, e = {scriptable: !0, indexable: !0}) {
				const {_scriptable: i = e.scriptable, _indexable: n = e.indexable, _allKeys: s = e.allKeys} = t;
				return {allKeys: s, scriptable: i, indexable: n, isScriptable: Dt(i) ? i : () => i, isIndexable: Dt(n) ? n : () => n};
			}
			const wi = (t, e) => (t ? t + Mt(e) : e),
				Ci = (t, e) => ct(e) && "adapters" !== t && (null === Object.getPrototypeOf(e) || e.constructor === Object);
			function Si(t, e, i) {
				if (Object.prototype.hasOwnProperty.call(t, e) || "constructor" === e) return t[e];
				const n = i();
				return (t[e] = n), n;
			}
			function Ai(t, e, i) {
				const {_proxy: n, _context: s, _subProxy: a, _descriptors: o} = t;
				let r = n[e];
				return Dt(r) && o.isScriptable(e) && (r = Mi(e, r, t, i)), dt(r) && r.length && (r = Fi(e, r, t, o.isIndexable)), Ci(e, r) && (r = _i(r, s, a && a[e], o)), r;
			}
			function Mi(t, e, i, n) {
				const {_proxy: s, _context: a, _subProxy: o, _stack: r} = i;
				if (r.has(t)) throw new Error("Recursion detected: " + Array.from(r).join("->") + "->" + t);
				r.add(t);
				let l = e(a, o || n);
				return r.delete(t), Ci(t, l) && (l = Pi(s._scopes, s, t, l)), l;
			}
			function Fi(t, e, i, n) {
				const {_proxy: s, _context: a, _subProxy: o, _descriptors: r} = i;
				if ("undefined" !== typeof a.index && n(t)) return e[a.index % e.length];
				if (ct(e[0])) {
					const i = e,
						n = s._scopes.filter((t) => t !== i);
					e = [];
					for (const l of i) {
						const i = Pi(n, s, t, l);
						e.push(_i(i, a, o && o[t], r));
					}
				}
				return e;
			}
			function Di(t, e, i) {
				return Dt(t) ? t(e, i) : t;
			}
			const Ei = (t, e) => (!0 === t ? e : "string" === typeof t ? At(e, t) : void 0);
			function Ti(t, e, i, n, s) {
				for (const a of e) {
					const e = Ei(i, a);
					if (e) {
						t.add(e);
						const a = Di(e._fallback, i, s);
						if ("undefined" !== typeof a && a !== i && a !== n) return a;
					} else if (!1 === e && "undefined" !== typeof n && i !== n) return null;
				}
				return !1;
			}
			function Pi(t, e, i, n) {
				const s = e._rootScopes,
					a = Di(e._fallback, i, n),
					o = [...t, ...s],
					r = new Set();
				r.add(n);
				let l = Ii(r, o, i, a || i, n);
				return null !== l && ("undefined" === typeof a || a === i || ((l = Ii(r, o, a, l, n)), null !== l)) && Li(Array.from(r), [""], s, a, () => Bi(e, i, n));
			}
			function Ii(t, e, i, n, s) {
				while (i) i = Ti(t, e, i, n, s);
				return i;
			}
			function Bi(t, e, i) {
				const n = t._getTarget();
				e in n || (n[e] = {});
				const s = n[e];
				return dt(s) && ct(i) ? i : s || {};
			}
			function Oi(t, e, i, n) {
				let s;
				for (const a of e) if (((s = Ri(wi(a, t), i)), "undefined" !== typeof s)) return Ci(t, s) ? Pi(i, n, t, s) : s;
			}
			function Ri(t, e) {
				for (const i of e) {
					if (!i) continue;
					const e = i[t];
					if ("undefined" !== typeof e) return e;
				}
			}
			function Vi(t) {
				let e = t._keys;
				return e || (e = t._keys = Ni(t._scopes)), e;
			}
			function Ni(t) {
				const e = new Set();
				for (const i of t) for (const t of Object.keys(i).filter((t) => !t.startsWith("_"))) e.add(t);
				return Array.from(e);
			}
			const zi = Number.EPSILON || 1e-14,
				Wi = (t, e) => e < t.length && !t[e].skip && t[e],
				Hi = (t) => ("x" === t ? "y" : "x");
			function Ui(t, e, i, n) {
				const s = t.skip ? e : t,
					a = e,
					o = i.skip ? e : i,
					r = te(a, s),
					l = te(o, a);
				let d = r / (r + l),
					c = l / (r + l);
				(d = isNaN(d) ? 0 : d), (c = isNaN(c) ? 0 : c);
				const h = n * d,
					u = n * c;
				return {previous: {x: a.x - h * (o.x - s.x), y: a.y - h * (o.y - s.y)}, next: {x: a.x + u * (o.x - s.x), y: a.y + u * (o.y - s.y)}};
			}
			function Xi(t, e, i) {
				const n = t.length;
				let s,
					a,
					o,
					r,
					l,
					d = Wi(t, 0);
				for (let c = 0; c < n - 1; ++c)
					(l = d),
						(d = Wi(t, c + 1)),
						l &&
							d &&
							(Ut(e[c], 0, zi)
								? (i[c] = i[c + 1] = 0)
								: ((s = i[c] / e[c]), (a = i[c + 1] / e[c]), (r = Math.pow(s, 2) + Math.pow(a, 2)), r <= 9 || ((o = 3 / Math.sqrt(r)), (i[c] = s * o * e[c]), (i[c + 1] = a * o * e[c]))));
			}
			function Gi(t, e, i = "x") {
				const n = Hi(i),
					s = t.length;
				let a,
					o,
					r,
					l = Wi(t, 0);
				for (let d = 0; d < s; ++d) {
					if (((o = r), (r = l), (l = Wi(t, d + 1)), !r)) continue;
					const s = r[i],
						c = r[n];
					o && ((a = (s - o[i]) / 3), (r[`cp1${i}`] = s - a), (r[`cp1${n}`] = c - a * e[d])), l && ((a = (l[i] - s) / 3), (r[`cp2${i}`] = s + a), (r[`cp2${n}`] = c + a * e[d]));
				}
			}
			function ji(t, e = "x") {
				const i = Hi(e),
					n = t.length,
					s = Array(n).fill(0),
					a = Array(n);
				let o,
					r,
					l,
					d = Wi(t, 0);
				for (o = 0; o < n; ++o)
					if (((r = l), (l = d), (d = Wi(t, o + 1)), l)) {
						if (d) {
							const t = d[e] - l[e];
							s[o] = 0 !== t ? (d[i] - l[i]) / t : 0;
						}
						a[o] = r ? (d ? (Ht(s[o - 1]) !== Ht(s[o]) ? 0 : (s[o - 1] + s[o]) / 2) : s[o - 1]) : s[o];
					}
				Xi(t, s, a), Gi(t, a, e);
			}
			function $i(t, e, i) {
				return Math.max(Math.min(t, i), e);
			}
			function Yi(t, e) {
				let i,
					n,
					s,
					a,
					o,
					r = Qe(t[0], e);
				for (i = 0, n = t.length; i < n; ++i)
					(o = a),
						(a = r),
						(r = i < n - 1 && Qe(t[i + 1], e)),
						a &&
							((s = t[i]),
							o && ((s.cp1x = $i(s.cp1x, e.left, e.right)), (s.cp1y = $i(s.cp1y, e.top, e.bottom))),
							r && ((s.cp2x = $i(s.cp2x, e.left, e.right)), (s.cp2y = $i(s.cp2y, e.top, e.bottom))));
			}
			function Ki(t, e, i, n, s) {
				let a, o, r, l;
				if ((e.spanGaps && (t = t.filter((t) => !t.skip)), "monotone" === e.cubicInterpolationMode)) ji(t, s);
				else {
					let i = n ? t[t.length - 1] : t[0];
					for (a = 0, o = t.length; a < o; ++a)
						(r = t[a]), (l = Ui(i, r, t[Math.min(a + 1, o - (n ? 0 : 1)) % o], e.tension)), (r.cp1x = l.previous.x), (r.cp1y = l.previous.y), (r.cp2x = l.next.x), (r.cp2y = l.next.y), (i = r);
				}
				e.capBezierPoints && Yi(t, i);
			}
			function qi() {
				return "undefined" !== typeof window && "undefined" !== typeof document;
			}
			function Ji(t) {
				let e = t.parentNode;
				return e && "[object ShadowRoot]" === e.toString() && (e = e.host), e;
			}
			function Zi(t, e, i) {
				let n;
				return "string" === typeof t ? ((n = parseInt(t, 10)), -1 !== t.indexOf("%") && (n = (n / 100) * e.parentNode[i])) : (n = t), n;
			}
			const Qi = (t) => t.ownerDocument.defaultView.getComputedStyle(t, null);
			function tn(t, e) {
				return Qi(t).getPropertyValue(e);
			}
			const en = ["top", "right", "bottom", "left"];
			function nn(t, e, i) {
				const n = {};
				i = i ? "-" + i : "";
				for (let s = 0; s < 4; s++) {
					const a = en[s];
					n[a] = parseFloat(t[e + "-" + a + i]) || 0;
				}
				return (n.width = n.left + n.right), (n.height = n.top + n.bottom), n;
			}
			const sn = (t, e, i) => (t > 0 || e > 0) && (!i || !i.shadowRoot);
			function an(t, e) {
				const i = t.touches,
					n = i && i.length ? i[0] : t,
					{offsetX: s, offsetY: a} = n;
				let o,
					r,
					l = !1;
				if (sn(s, a, t.target)) (o = s), (r = a);
				else {
					const t = e.getBoundingClientRect();
					(o = n.clientX - t.left), (r = n.clientY - t.top), (l = !0);
				}
				return {x: o, y: r, box: l};
			}
			function on(t, e) {
				if ("native" in t) return t;
				const {canvas: i, currentDevicePixelRatio: n} = e,
					s = Qi(i),
					a = "border-box" === s.boxSizing,
					o = nn(s, "padding"),
					r = nn(s, "border", "width"),
					{x: l, y: d, box: c} = an(t, i),
					h = o.left + (c && r.left),
					u = o.top + (c && r.top);
				let {width: m, height: p} = e;
				return a && ((m -= o.width + r.width), (p -= o.height + r.height)), {x: Math.round((((l - h) / m) * i.width) / n), y: Math.round((((d - u) / p) * i.height) / n)};
			}
			function rn(t, e, i) {
				let n, s;
				if (void 0 === e || void 0 === i) {
					const a = t && Ji(t);
					if (a) {
						const t = a.getBoundingClientRect(),
							o = Qi(a),
							r = nn(o, "border", "width"),
							l = nn(o, "padding");
						(e = t.width - l.width - r.width), (i = t.height - l.height - r.height), (n = Zi(o.maxWidth, a, "clientWidth")), (s = Zi(o.maxHeight, a, "clientHeight"));
					} else (e = t.clientWidth), (i = t.clientHeight);
				}
				return {width: e, height: i, maxWidth: n || Ot, maxHeight: s || Ot};
			}
			const ln = (t) => Math.round(10 * t) / 10;
			function dn(t, e, i, n) {
				const s = Qi(t),
					a = nn(s, "margin"),
					o = Zi(s.maxWidth, t, "clientWidth") || Ot,
					r = Zi(s.maxHeight, t, "clientHeight") || Ot,
					l = rn(t, e, i);
				let {width: d, height: c} = l;
				if ("content-box" === s.boxSizing) {
					const t = nn(s, "border", "width"),
						e = nn(s, "padding");
					(d -= e.width + t.width), (c -= e.height + t.height);
				}
				(d = Math.max(0, d - a.width)), (c = Math.max(0, n ? d / n : c - a.height)), (d = ln(Math.min(d, o, l.maxWidth))), (c = ln(Math.min(c, r, l.maxHeight))), d && !c && (c = ln(d / 2));
				const h = void 0 !== e || void 0 !== i;
				return h && n && l.height && c > l.height && ((c = l.height), (d = ln(Math.floor(c * n)))), {width: d, height: c};
			}
			function cn(t, e, i) {
				const n = e || 1,
					s = Math.floor(t.height * n),
					a = Math.floor(t.width * n);
				(t.height = Math.floor(t.height)), (t.width = Math.floor(t.width));
				const o = t.canvas;
				return (
					o.style && (i || (!o.style.height && !o.style.width)) && ((o.style.height = `${t.height}px`), (o.style.width = `${t.width}px`)),
					(t.currentDevicePixelRatio !== n || o.height !== s || o.width !== a) && ((t.currentDevicePixelRatio = n), (o.height = s), (o.width = a), t.ctx.setTransform(n, 0, 0, n, 0, 0), !0)
				);
			}
			const hn = (function () {
				let t = !1;
				try {
					const e = {
						get passive() {
							return (t = !0), !1;
						},
					};
					qi() && (window.addEventListener("test", null, e), window.removeEventListener("test", null, e));
				} catch (e) {}
				return t;
			})();
			function un(t, e) {
				const i = tn(t, e),
					n = i && i.match(/^(\d+)(\.\d+)?px$/);
				return n ? +n[1] : void 0;
			}
			function mn(t, e, i, n) {
				return {x: t.x + i * (e.x - t.x), y: t.y + i * (e.y - t.y)};
			}
			function pn(t, e, i, n) {
				return {x: t.x + i * (e.x - t.x), y: "middle" === n ? (i < 0.5 ? t.y : e.y) : "after" === n ? (i < 1 ? t.y : e.y) : i > 0 ? e.y : t.y};
			}
			function gn(t, e, i, n) {
				const s = {x: t.cp2x, y: t.cp2y},
					a = {x: e.cp1x, y: e.cp1y},
					o = mn(t, s, i),
					r = mn(s, a, i),
					l = mn(a, e, i),
					d = mn(o, r, i),
					c = mn(r, l, i);
				return mn(d, c, i);
			}
			const fn = function (t, e) {
					return {
						x(i) {
							return t + t + e - i;
						},
						setWidth(t) {
							e = t;
						},
						textAlign(t) {
							return "center" === t ? t : "right" === t ? "left" : "right";
						},
						xPlus(t, e) {
							return t - e;
						},
						leftForLtr(t, e) {
							return t - e;
						},
					};
				},
				vn = function () {
					return {
						x(t) {
							return t;
						},
						setWidth(t) {},
						textAlign(t) {
							return t;
						},
						xPlus(t, e) {
							return t + e;
						},
						leftForLtr(t, e) {
							return t;
						},
					};
				};
			function bn(t, e, i) {
				return t ? fn(e, i) : vn();
			}
			function kn(t, e) {
				let i, n;
				("ltr" !== e && "rtl" !== e) ||
					((i = t.canvas.style), (n = [i.getPropertyValue("direction"), i.getPropertyPriority("direction")]), i.setProperty("direction", e, "important"), (t.prevTextDirection = n));
			}
			function xn(t, e) {
				void 0 !== e && (delete t.prevTextDirection, t.canvas.style.setProperty("direction", e[0], e[1]));
			}
			function Ln(t) {
				return "angle" === t ? {between: ne, compare: ee, normalize: ie} : {between: oe, compare: (t, e) => t - e, normalize: (t) => t};
			}
			function _n({start: t, end: e, count: i, loop: n, style: s}) {
				return {start: t % i, end: e % i, loop: n && (e - t + 1) % i === 0, style: s};
			}
			function yn(t, e, i) {
				const {property: n, start: s, end: a} = i,
					{between: o, normalize: r} = Ln(n),
					l = e.length;
				let d,
					c,
					{start: h, end: u, loop: m} = t;
				if (m) {
					for (h += l, u += l, d = 0, c = l; d < c; ++d) {
						if (!o(r(e[h % l][n]), s, a)) break;
						h--, u--;
					}
					(h %= l), (u %= l);
				}
				return u < h && (u += l), {start: h, end: u, loop: m, style: t.style};
			}
			function wn(t, e, i) {
				if (!i) return [t];
				const {property: n, start: s, end: a} = i,
					o = e.length,
					{compare: r, between: l, normalize: d} = Ln(n),
					{start: c, end: h, loop: u, style: m} = yn(t, e, i),
					p = [];
				let g,
					f,
					v,
					b = !1,
					k = null;
				const x = () => l(s, v, g) && 0 !== r(s, v),
					L = () => 0 === r(a, g) || l(a, v, g),
					_ = () => b || x(),
					y = () => !b || L();
				for (let w = c, C = c; w <= h; ++w)
					(f = e[w % o]),
						f.skip ||
							((g = d(f[n])),
							g !== v &&
								((b = l(g, s, a)), null === k && _() && (k = 0 === r(g, s) ? w : C), null !== k && y() && (p.push(_n({start: k, end: w, loop: u, count: o, style: m})), (k = null)), (C = w), (v = g)));
				return null !== k && p.push(_n({start: k, end: h, loop: u, count: o, style: m})), p;
			}
			function Cn(t, e) {
				const i = [],
					n = t.segments;
				for (let s = 0; s < n.length; s++) {
					const a = wn(n[s], t.points, e);
					a.length && i.push(...a);
				}
				return i;
			}
			function Sn(t, e, i, n) {
				let s = 0,
					a = e - 1;
				if (i && !n) while (s < e && !t[s].skip) s++;
				while (s < e && t[s].skip) s++;
				(s %= e), i && (a += s);
				while (a > s && t[a % e].skip) a--;
				return (a %= e), {start: s, end: a};
			}
			function An(t, e, i, n) {
				const s = t.length,
					a = [];
				let o,
					r = e,
					l = t[e];
				for (o = e + 1; o <= i; ++o) {
					const i = t[o % s];
					i.skip || i.stop ? l.skip || ((n = !1), a.push({start: e % s, end: (o - 1) % s, loop: n}), (e = r = i.stop ? o : null)) : ((r = o), l.skip && (e = o)), (l = i);
				}
				return null !== r && a.push({start: e % s, end: r % s, loop: n}), a;
			}
			function Mn(t, e) {
				const i = t.points,
					n = t.options.spanGaps,
					s = i.length;
				if (!s) return [];
				const a = !!t._loop,
					{start: o, end: r} = Sn(i, s, a, n);
				if (!0 === n) return Fn(t, [{start: o, end: r, loop: a}], i, e);
				const l = r < o ? r + s : r,
					d = !!t._fullLoop && 0 === o && r === s - 1;
				return Fn(t, An(i, o, l, d), i, e);
			}
			function Fn(t, e, i, n) {
				return n && n.setContext && i ? Dn(t, e, i, n) : e;
			}
			function Dn(t, e, i, n) {
				const s = t._chart.getContext(),
					a = En(t.options),
					{
						_datasetIndex: o,
						options: {spanGaps: r},
					} = t,
					l = i.length,
					d = [];
				let c = a,
					h = e[0].start,
					u = h;
				function m(t, e, n, s) {
					const a = r ? -1 : 1;
					if (t !== e) {
						t += l;
						while (i[t % l].skip) t -= a;
						while (i[e % l].skip) e += a;
						t % l !== e % l && (d.push({start: t % l, end: e % l, loop: n, style: s}), (c = s), (h = e % l));
					}
				}
				for (const p of e) {
					h = r ? h : p.start;
					let t,
						e = i[h % l];
					for (u = h + 1; u <= p.end; u++) {
						const a = i[u % l];
						(t = En(n.setContext(xi(s, {type: "segment", p0: e, p1: a, p0DataIndex: (u - 1) % l, p1DataIndex: u % l, datasetIndex: o})))), Tn(t, c) && m(h, u - 1, p.loop, c), (e = a), (c = t);
					}
					h < u - 1 && m(h, u - 1, p.loop, c);
				}
				return d;
			}
			function En(t) {
				return {
					backgroundColor: t.backgroundColor,
					borderCapStyle: t.borderCapStyle,
					borderDash: t.borderDash,
					borderDashOffset: t.borderDashOffset,
					borderJoinStyle: t.borderJoinStyle,
					borderWidth: t.borderWidth,
					borderColor: t.borderColor,
				};
			}
			function Tn(t, e) {
				if (!e) return !1;
				const i = [],
					n = function (t, e) {
						return Ae(e) ? (i.includes(e) || i.push(e), i.indexOf(e)) : e;
					};
				return JSON.stringify(t, n) !== JSON.stringify(e, n);
			}
			function Pn(t, e, i) {
				return t.options.clip ? t[i] : e[i];
			}
			function In(t, e) {
				const {xScale: i, yScale: n} = t;
				return i && n ? {left: Pn(i, e, "left"), right: Pn(i, e, "right"), top: Pn(n, e, "top"), bottom: Pn(n, e, "bottom")} : e;
			}
			function Bn(t, e) {
				const i = e._clip;
				if (i.disabled) return !1;
				const n = In(e, t.chartArea);
				return {
					left: !1 === i.left ? 0 : n.left - (!0 === i.left ? 0 : i.left),
					right: !1 === i.right ? t.width : n.right + (!0 === i.right ? 0 : i.right),
					top: !1 === i.top ? 0 : n.top - (!0 === i.top ? 0 : i.top),
					bottom: !1 === i.bottom ? t.height : n.bottom + (!0 === i.bottom ? 0 : i.bottom),
				};
			}
			/*!
			 * Chart.js v4.5.0
			 * https://www.chartjs.org
			 * (c) 2025 Chart.js Contributors
			 * Released under the MIT License
			 */
			class On {
				constructor() {
					(this._request = null), (this._charts = new Map()), (this._running = !1), (this._lastDate = void 0);
				}
				_notify(t, e, i, n) {
					const s = e.listeners[n],
						a = e.duration;
					s.forEach((n) => n({chart: t, initial: e.initial, numSteps: a, currentStep: Math.min(i - e.start, a)}));
				}
				_refresh() {
					this._request ||
						((this._running = !0),
						(this._request = ge.call(window, () => {
							this._update(), (this._request = null), this._running && this._refresh();
						})));
				}
				_update(t = Date.now()) {
					let e = 0;
					this._charts.forEach((i, n) => {
						if (!i.running || !i.items.length) return;
						const s = i.items;
						let a,
							o = s.length - 1,
							r = !1;
						for (; o >= 0; --o) (a = s[o]), a._active ? (a._total > i.duration && (i.duration = a._total), a.tick(t), (r = !0)) : ((s[o] = s[s.length - 1]), s.pop());
						r && (n.draw(), this._notify(n, i, t, "progress")), s.length || ((i.running = !1), this._notify(n, i, t, "complete"), (i.initial = !1)), (e += s.length);
					}),
						(this._lastDate = t),
						0 === e && (this._running = !1);
				}
				_getAnims(t) {
					const e = this._charts;
					let i = e.get(t);
					return i || ((i = {running: !1, initial: !0, items: [], listeners: {complete: [], progress: []}}), e.set(t, i)), i;
				}
				listen(t, e, i) {
					this._getAnims(t).listeners[e].push(i);
				}
				add(t, e) {
					e && e.length && this._getAnims(t).items.push(...e);
				}
				has(t) {
					return this._getAnims(t).items.length > 0;
				}
				start(t) {
					const e = this._charts.get(t);
					e && ((e.running = !0), (e.start = Date.now()), (e.duration = e.items.reduce((t, e) => Math.max(t, e._duration), 0)), this._refresh());
				}
				running(t) {
					if (!this._running) return !1;
					const e = this._charts.get(t);
					return !!(e && e.running && e.items.length);
				}
				stop(t) {
					const e = this._charts.get(t);
					if (!e || !e.items.length) return;
					const i = e.items;
					let n = i.length - 1;
					for (; n >= 0; --n) i[n].cancel();
					(e.items = []), this._notify(t, e, Date.now(), "complete");
				}
				remove(t) {
					return this._charts.delete(t);
				}
			}
			var Rn = new On();
			const Vn = "transparent",
				Nn = {
					boolean(t, e, i) {
						return i > 0.5 ? e : t;
					},
					color(t, e, i) {
						const n = Me(t || Vn),
							s = n.valid && Me(e || Vn);
						return s && s.valid ? s.mix(n, i).hexString() : e;
					},
					number(t, e, i) {
						return t + (e - t) * i;
					},
				};
			class zn {
				constructor(t, e, i, n) {
					const s = e[i];
					n = bi([t.to, n, s, t.from]);
					const a = bi([t.from, s, n]);
					(this._active = !0),
						(this._fn = t.fn || Nn[t.type || typeof a]),
						(this._easing = Se[t.easing] || Se.linear),
						(this._start = Math.floor(Date.now() + (t.delay || 0))),
						(this._duration = this._total = Math.floor(t.duration)),
						(this._loop = !!t.loop),
						(this._target = e),
						(this._prop = i),
						(this._from = a),
						(this._to = n),
						(this._promises = void 0);
				}
				active() {
					return this._active;
				}
				update(t, e, i) {
					if (this._active) {
						this._notify(!1);
						const n = this._target[this._prop],
							s = i - this._start,
							a = this._duration - s;
						(this._start = i),
							(this._duration = Math.floor(Math.max(a, t.duration))),
							(this._total += s),
							(this._loop = !!t.loop),
							(this._to = bi([t.to, e, n, t.from])),
							(this._from = bi([t.from, n, e]));
					}
				}
				cancel() {
					this._active && (this.tick(Date.now()), (this._active = !1), this._notify(!1));
				}
				tick(t) {
					const e = t - this._start,
						i = this._duration,
						n = this._prop,
						s = this._from,
						a = this._loop,
						o = this._to;
					let r;
					if (((this._active = s !== o && (a || e < i)), !this._active)) return (this._target[n] = o), void this._notify(!0);
					e < 0 ? (this._target[n] = s) : ((r = (e / i) % 2), (r = a && r > 1 ? 2 - r : r), (r = this._easing(Math.min(1, Math.max(0, r)))), (this._target[n] = this._fn(s, o, r)));
				}
				wait() {
					const t = this._promises || (this._promises = []);
					return new Promise((e, i) => {
						t.push({res: e, rej: i});
					});
				}
				_notify(t) {
					const e = t ? "res" : "rej",
						i = this._promises || [];
					for (let n = 0; n < i.length; n++) i[n][e]();
				}
			}
			class Wn {
				constructor(t, e) {
					(this._chart = t), (this._properties = new Map()), this.configure(e);
				}
				configure(t) {
					if (!ct(t)) return;
					const e = Object.keys(je.animation),
						i = this._properties;
					Object.getOwnPropertyNames(t).forEach((n) => {
						const s = t[n];
						if (!ct(s)) return;
						const a = {};
						for (const t of e) a[t] = s[t];
						((dt(s.properties) && s.properties) || [n]).forEach((t) => {
							(t !== n && i.has(t)) || i.set(t, a);
						});
					});
				}
				_animateOptions(t, e) {
					const i = e.options,
						n = Un(t, i);
					if (!n) return [];
					const s = this._createAnimations(n, i);
					return (
						i.$shared &&
							Hn(t.options.$animations, i).then(
								() => {
									t.options = i;
								},
								() => {}
							),
						s
					);
				}
				_createAnimations(t, e) {
					const i = this._properties,
						n = [],
						s = t.$animations || (t.$animations = {}),
						a = Object.keys(e),
						o = Date.now();
					let r;
					for (r = a.length - 1; r >= 0; --r) {
						const l = a[r];
						if ("$" === l.charAt(0)) continue;
						if ("options" === l) {
							n.push(...this._animateOptions(t, e));
							continue;
						}
						const d = e[l];
						let c = s[l];
						const h = i.get(l);
						if (c) {
							if (h && c.active()) {
								c.update(h, d, o);
								continue;
							}
							c.cancel();
						}
						h && h.duration ? ((s[l] = c = new zn(h, t, l, d)), n.push(c)) : (t[l] = d);
					}
					return n;
				}
				update(t, e) {
					if (0 === this._properties.size) return void Object.assign(t, e);
					const i = this._createAnimations(t, e);
					return i.length ? (Rn.add(this._chart, i), !0) : void 0;
				}
			}
			function Hn(t, e) {
				const i = [],
					n = Object.keys(e);
				for (let s = 0; s < n.length; s++) {
					const e = t[n[s]];
					e && e.active() && i.push(e.wait());
				}
				return Promise.all(i);
			}
			function Un(t, e) {
				if (!e) return;
				let i = t.options;
				if (i) return i.$shared && (t.options = i = Object.assign({}, i, {$shared: !1, $animations: {}})), i;
				t.options = e;
			}
			function Xn(t, e) {
				const i = (t && t.options) || {},
					n = i.reverse,
					s = void 0 === i.min ? e : 0,
					a = void 0 === i.max ? e : 0;
				return {start: n ? a : s, end: n ? s : a};
			}
			function Gn(t, e, i) {
				if (!1 === i) return !1;
				const n = Xn(t, i),
					s = Xn(e, i);
				return {top: s.end, right: n.end, bottom: s.start, left: n.start};
			}
			function jn(t) {
				let e, i, n, s;
				return ct(t) ? ((e = t.top), (i = t.right), (n = t.bottom), (s = t.left)) : (e = i = n = s = t), {top: e, right: i, bottom: n, left: s, disabled: !1 === t};
			}
			function $n(t, e) {
				const i = [],
					n = t._getSortedDatasetMetas(e);
				let s, a;
				for (s = 0, a = n.length; s < a; ++s) i.push(n[s].index);
				return i;
			}
			function Yn(t, e, i, n = {}) {
				const s = t.keys,
					a = "single" === n.mode;
				let o, r, l, d;
				if (null === e) return;
				let c = !1;
				for (o = 0, r = s.length; o < r; ++o) {
					if (((l = +s[o]), l === i)) {
						if (((c = !0), n.all)) continue;
						break;
					}
					(d = t.values[l]), ht(d) && (a || 0 === e || Ht(e) === Ht(d)) && (e += d);
				}
				return c || n.all ? e : 0;
			}
			function Kn(t, e) {
				const {iScale: i, vScale: n} = e,
					s = "x" === i.axis ? "x" : "y",
					a = "x" === n.axis ? "x" : "y",
					o = Object.keys(t),
					r = new Array(o.length);
				let l, d, c;
				for (l = 0, d = o.length; l < d; ++l) (c = o[l]), (r[l] = {[s]: c, [a]: t[c]});
				return r;
			}
			function qn(t, e) {
				const i = t && t.options.stacked;
				return i || (void 0 === i && void 0 !== e.stack);
			}
			function Jn(t, e, i) {
				return `${t.id}.${e.id}.${i.stack || i.type}`;
			}
			function Zn(t) {
				const {min: e, max: i, minDefined: n, maxDefined: s} = t.getUserBounds();
				return {min: n ? e : Number.NEGATIVE_INFINITY, max: s ? i : Number.POSITIVE_INFINITY};
			}
			function Qn(t, e, i) {
				const n = t[e] || (t[e] = {});
				return n[i] || (n[i] = {});
			}
			function ts(t, e, i, n) {
				for (const s of e.getMatchingVisibleMetas(n).reverse()) {
					const e = t[s.index];
					if ((i && e > 0) || (!i && e < 0)) return s.index;
				}
				return null;
			}
			function es(t, e) {
				const {chart: i, _cachedMeta: n} = t,
					s = i._stacks || (i._stacks = {}),
					{iScale: a, vScale: o, index: r} = n,
					l = a.axis,
					d = o.axis,
					c = Jn(a, o, n),
					h = e.length;
				let u;
				for (let m = 0; m < h; ++m) {
					const t = e[m],
						{[l]: i, [d]: a} = t,
						h = t._stacks || (t._stacks = {});
					(u = h[d] = Qn(s, c, i)), (u[r] = a), (u._top = ts(u, o, !0, n.type)), (u._bottom = ts(u, o, !1, n.type));
					const p = u._visualValues || (u._visualValues = {});
					p[r] = a;
				}
			}
			function is(t, e) {
				const i = t.scales;
				return Object.keys(i)
					.filter((t) => i[t].axis === e)
					.shift();
			}
			function ns(t, e) {
				return xi(t, {active: !1, dataset: void 0, datasetIndex: e, index: e, mode: "default", type: "dataset"});
			}
			function ss(t, e, i) {
				return xi(t, {active: !1, dataIndex: e, parsed: void 0, raw: void 0, element: i, index: e, mode: "default", type: "data"});
			}
			function as(t, e) {
				const i = t.controller.index,
					n = t.vScale && t.vScale.axis;
				if (n) {
					e = e || t._parsed;
					for (const t of e) {
						const e = t._stacks;
						if (!e || void 0 === e[n] || void 0 === e[n][i]) return;
						delete e[n][i], void 0 !== e[n]._visualValues && void 0 !== e[n]._visualValues[i] && delete e[n]._visualValues[i];
					}
				}
			}
			const os = (t) => "reset" === t || "none" === t,
				rs = (t, e) => (e ? t : Object.assign({}, t)),
				ls = (t, e, i) => t && !e.hidden && e._stacked && {keys: $n(i, !0), values: null};
			class ds {
				static defaults = {};
				static datasetElementType = null;
				static dataElementType = null;
				constructor(t, e) {
					(this.chart = t),
						(this._ctx = t.ctx),
						(this.index = e),
						(this._cachedDataOpts = {}),
						(this._cachedMeta = this.getMeta()),
						(this._type = this._cachedMeta.type),
						(this.options = void 0),
						(this._parsing = !1),
						(this._data = void 0),
						(this._objectData = void 0),
						(this._sharedOptions = void 0),
						(this._drawStart = void 0),
						(this._drawCount = void 0),
						(this.enableOptionSharing = !1),
						(this.supportsDecimation = !1),
						(this.$context = void 0),
						(this._syncList = []),
						(this.datasetElementType = new.target.datasetElementType),
						(this.dataElementType = new.target.dataElementType),
						this.initialize();
				}
				initialize() {
					const t = this._cachedMeta;
					this.configure(),
						this.linkScales(),
						(t._stacked = qn(t.vScale, t)),
						this.addElements(),
						this.options.fill &&
							!this.chart.isPluginEnabled("filler") &&
							console.warn("Tried to use the 'fill' option without the 'Filler' plugin enabled. Please import and register the 'Filler' plugin and make sure it is not disabled in the options");
				}
				updateIndex(t) {
					this.index !== t && as(this._cachedMeta), (this.index = t);
				}
				linkScales() {
					const t = this.chart,
						e = this._cachedMeta,
						i = this.getDataset(),
						n = (t, e, i, n) => ("x" === t ? e : "r" === t ? n : i),
						s = (e.xAxisID = mt(i.xAxisID, is(t, "x"))),
						a = (e.yAxisID = mt(i.yAxisID, is(t, "y"))),
						o = (e.rAxisID = mt(i.rAxisID, is(t, "r"))),
						r = e.indexAxis,
						l = (e.iAxisID = n(r, s, a, o)),
						d = (e.vAxisID = n(r, a, s, o));
					(e.xScale = this.getScaleForId(s)), (e.yScale = this.getScaleForId(a)), (e.rScale = this.getScaleForId(o)), (e.iScale = this.getScaleForId(l)), (e.vScale = this.getScaleForId(d));
				}
				getDataset() {
					return this.chart.data.datasets[this.index];
				}
				getMeta() {
					return this.chart.getDatasetMeta(this.index);
				}
				getScaleForId(t) {
					return this.chart.scales[t];
				}
				_getOtherScale(t) {
					const e = this._cachedMeta;
					return t === e.iScale ? e.vScale : e.iScale;
				}
				reset() {
					this._update("reset");
				}
				_destroy() {
					const t = this._cachedMeta;
					this._data && me(this._data, this), t._stacked && as(t);
				}
				_dataCheck() {
					const t = this.getDataset(),
						e = t.data || (t.data = []),
						i = this._data;
					if (ct(e)) {
						const t = this._cachedMeta;
						this._data = Kn(e, t);
					} else if (i !== e) {
						if (i) {
							me(i, this);
							const t = this._cachedMeta;
							as(t), (t._parsed = []);
						}
						e && Object.isExtensible(e) && ue(e, this), (this._syncList = []), (this._data = e);
					}
				}
				addElements() {
					const t = this._cachedMeta;
					this._dataCheck(), this.datasetElementType && (t.dataset = new this.datasetElementType());
				}
				buildOrUpdateElements(t) {
					const e = this._cachedMeta,
						i = this.getDataset();
					let n = !1;
					this._dataCheck();
					const s = e._stacked;
					(e._stacked = qn(e.vScale, e)),
						e.stack !== i.stack && ((n = !0), as(e), (e.stack = i.stack)),
						this._resyncElements(t),
						(n || s !== e._stacked) && (es(this, e._parsed), (e._stacked = qn(e.vScale, e)));
				}
				configure() {
					const t = this.chart.config,
						e = t.datasetScopeKeys(this._type),
						i = t.getOptionScopes(this.getDataset(), e, !0);
					(this.options = t.createResolver(i, this.getContext())), (this._parsing = this.options.parsing), (this._cachedDataOpts = {});
				}
				parse(t, e) {
					const {_cachedMeta: i, _data: n} = this,
						{iScale: s, _stacked: a} = i,
						o = s.axis;
					let r,
						l,
						d,
						c = (0 === t && e === n.length) || i._sorted,
						h = t > 0 && i._parsed[t - 1];
					if (!1 === this._parsing) (i._parsed = n), (i._sorted = !0), (d = n);
					else {
						d = dt(n[t]) ? this.parseArrayData(i, n, t, e) : ct(n[t]) ? this.parseObjectData(i, n, t, e) : this.parsePrimitiveData(i, n, t, e);
						const s = () => null === l[o] || (h && l[o] < h[o]);
						for (r = 0; r < e; ++r) (i._parsed[r + t] = l = d[r]), c && (s() && (c = !1), (h = l));
						i._sorted = c;
					}
					a && es(this, d);
				}
				parsePrimitiveData(t, e, i, n) {
					const {iScale: s, vScale: a} = t,
						o = s.axis,
						r = a.axis,
						l = s.getLabels(),
						d = s === a,
						c = new Array(n);
					let h, u, m;
					for (h = 0, u = n; h < u; ++h) (m = h + i), (c[h] = {[o]: d || s.parse(l[m], m), [r]: a.parse(e[m], m)});
					return c;
				}
				parseArrayData(t, e, i, n) {
					const {xScale: s, yScale: a} = t,
						o = new Array(n);
					let r, l, d, c;
					for (r = 0, l = n; r < l; ++r) (d = r + i), (c = e[d]), (o[r] = {x: s.parse(c[0], d), y: a.parse(c[1], d)});
					return o;
				}
				parseObjectData(t, e, i, n) {
					const {xScale: s, yScale: a} = t,
						{xAxisKey: o = "x", yAxisKey: r = "y"} = this._parsing,
						l = new Array(n);
					let d, c, h, u;
					for (d = 0, c = n; d < c; ++d) (h = d + i), (u = e[h]), (l[d] = {x: s.parse(At(u, o), h), y: a.parse(At(u, r), h)});
					return l;
				}
				getParsed(t) {
					return this._cachedMeta._parsed[t];
				}
				getDataElement(t) {
					return this._cachedMeta.data[t];
				}
				applyStack(t, e, i) {
					const n = this.chart,
						s = this._cachedMeta,
						a = e[t.axis],
						o = {keys: $n(n, !0), values: e._stacks[t.axis]._visualValues};
					return Yn(o, a, s.index, {mode: i});
				}
				updateRangeFromParsed(t, e, i, n) {
					const s = i[e.axis];
					let a = null === s ? NaN : s;
					const o = n && i._stacks[e.axis];
					n && o && ((n.values = o), (a = Yn(n, s, this._cachedMeta.index))), (t.min = Math.min(t.min, a)), (t.max = Math.max(t.max, a));
				}
				getMinMax(t, e) {
					const i = this._cachedMeta,
						n = i._parsed,
						s = i._sorted && t === i.iScale,
						a = n.length,
						o = this._getOtherScale(t),
						r = ls(e, i, this.chart),
						l = {min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY},
						{min: d, max: c} = Zn(o);
					let h, u;
					function m() {
						u = n[h];
						const e = u[o.axis];
						return !ht(u[t.axis]) || d > e || c < e;
					}
					for (h = 0; h < a; ++h) if (!m() && (this.updateRangeFromParsed(l, t, u, r), s)) break;
					if (s)
						for (h = a - 1; h >= 0; --h)
							if (!m()) {
								this.updateRangeFromParsed(l, t, u, r);
								break;
							}
					return l;
				}
				getAllParsedValues(t) {
					const e = this._cachedMeta._parsed,
						i = [];
					let n, s, a;
					for (n = 0, s = e.length; n < s; ++n) (a = e[n][t.axis]), ht(a) && i.push(a);
					return i;
				}
				getMaxOverflow() {
					return !1;
				}
				getLabelAndValue(t) {
					const e = this._cachedMeta,
						i = e.iScale,
						n = e.vScale,
						s = this.getParsed(t);
					return {label: i ? "" + i.getLabelForValue(s[i.axis]) : "", value: n ? "" + n.getLabelForValue(s[n.axis]) : ""};
				}
				_update(t) {
					const e = this._cachedMeta;
					this.update(t || "default"), (e._clip = jn(mt(this.options.clip, Gn(e.xScale, e.yScale, this.getMaxOverflow()))));
				}
				update(t) {}
				draw() {
					const t = this._ctx,
						e = this.chart,
						i = this._cachedMeta,
						n = i.data || [],
						s = e.chartArea,
						a = [],
						o = this._drawStart || 0,
						r = this._drawCount || n.length - o,
						l = this.options.drawActiveElementsOnTop;
					let d;
					for (i.dataset && i.dataset.draw(t, s, o, r), d = o; d < o + r; ++d) {
						const e = n[d];
						e.hidden || (e.active && l ? a.push(e) : e.draw(t, s));
					}
					for (d = 0; d < a.length; ++d) a[d].draw(t, s);
				}
				getStyle(t, e) {
					const i = e ? "active" : "default";
					return void 0 === t && this._cachedMeta.dataset ? this.resolveDatasetElementOptions(i) : this.resolveDataElementOptions(t || 0, i);
				}
				getContext(t, e, i) {
					const n = this.getDataset();
					let s;
					if (t >= 0 && t < this._cachedMeta.data.length) {
						const e = this._cachedMeta.data[t];
						(s = e.$context || (e.$context = ss(this.getContext(), t, e))), (s.parsed = this.getParsed(t)), (s.raw = n.data[t]), (s.index = s.dataIndex = t);
					} else (s = this.$context || (this.$context = ns(this.chart.getContext(), this.index))), (s.dataset = n), (s.index = s.datasetIndex = this.index);
					return (s.active = !!e), (s.mode = i), s;
				}
				resolveDatasetElementOptions(t) {
					return this._resolveElementOptions(this.datasetElementType.id, t);
				}
				resolveDataElementOptions(t, e) {
					return this._resolveElementOptions(this.dataElementType.id, e, t);
				}
				_resolveElementOptions(t, e = "default", i) {
					const n = "active" === e,
						s = this._cachedDataOpts,
						a = t + "-" + e,
						o = s[a],
						r = this.enableOptionSharing && Ft(i);
					if (o) return rs(o, r);
					const l = this.chart.config,
						d = l.datasetElementScopeKeys(this._type, t),
						c = n ? [`${t}Hover`, "hover", t, ""] : [t, ""],
						h = l.getOptionScopes(this.getDataset(), d),
						u = Object.keys(je.elements[t]),
						m = () => this.getContext(i, n, e),
						p = l.resolveNamedOptions(h, u, m, c);
					return p.$shared && ((p.$shared = r), (s[a] = Object.freeze(rs(p, r)))), p;
				}
				_resolveAnimations(t, e, i) {
					const n = this.chart,
						s = this._cachedDataOpts,
						a = `animation-${e}`,
						o = s[a];
					if (o) return o;
					let r;
					if (!1 !== n.options.animation) {
						const n = this.chart.config,
							s = n.datasetAnimationScopeKeys(this._type, e),
							a = n.getOptionScopes(this.getDataset(), s);
						r = n.createResolver(a, this.getContext(t, i, e));
					}
					const l = new Wn(n, r && r.animations);
					return r && r._cacheable && (s[a] = Object.freeze(l)), l;
				}
				getSharedOptions(t) {
					if (t.$shared) return this._sharedOptions || (this._sharedOptions = Object.assign({}, t));
				}
				includeOptions(t, e) {
					return !e || os(t) || this.chart._animationsDisabled;
				}
				_getSharedOptions(t, e) {
					const i = this.resolveDataElementOptions(t, e),
						n = this._sharedOptions,
						s = this.getSharedOptions(i),
						a = this.includeOptions(e, s) || s !== n;
					return this.updateSharedOptions(s, e, i), {sharedOptions: s, includeOptions: a};
				}
				updateElement(t, e, i, n) {
					os(n) ? Object.assign(t, i) : this._resolveAnimations(e, n).update(t, i);
				}
				updateSharedOptions(t, e, i) {
					t && !os(e) && this._resolveAnimations(void 0, e).update(t, i);
				}
				_setStyle(t, e, i, n) {
					t.active = n;
					const s = this.getStyle(e, n);
					this._resolveAnimations(e, i, n).update(t, {options: (!n && this.getSharedOptions(s)) || s});
				}
				removeHoverStyle(t, e, i) {
					this._setStyle(t, i, "active", !1);
				}
				setHoverStyle(t, e, i) {
					this._setStyle(t, i, "active", !0);
				}
				_removeDatasetHoverStyle() {
					const t = this._cachedMeta.dataset;
					t && this._setStyle(t, void 0, "active", !1);
				}
				_setDatasetHoverStyle() {
					const t = this._cachedMeta.dataset;
					t && this._setStyle(t, void 0, "active", !0);
				}
				_resyncElements(t) {
					const e = this._data,
						i = this._cachedMeta.data;
					for (const [o, r, l] of this._syncList) this[o](r, l);
					this._syncList = [];
					const n = i.length,
						s = e.length,
						a = Math.min(s, n);
					a && this.parse(0, a), s > n ? this._insertElements(n, s - n, t) : s < n && this._removeElements(s, n - s);
				}
				_insertElements(t, e, i = !0) {
					const n = this._cachedMeta,
						s = n.data,
						a = t + e;
					let o;
					const r = (t) => {
						for (t.length += e, o = t.length - 1; o >= a; o--) t[o] = t[o - e];
					};
					for (r(s), o = t; o < a; ++o) s[o] = new this.dataElementType();
					this._parsing && r(n._parsed), this.parse(t, e), i && this.updateElements(s, t, e, "reset");
				}
				updateElements(t, e, i, n) {}
				_removeElements(t, e) {
					const i = this._cachedMeta;
					if (this._parsing) {
						const n = i._parsed.splice(t, e);
						i._stacked && as(i, n);
					}
					i.data.splice(t, e);
				}
				_sync(t) {
					if (this._parsing) this._syncList.push(t);
					else {
						const [e, i, n] = t;
						this[e](i, n);
					}
					this.chart._dataChanges.push([this.index, ...t]);
				}
				_onDataPush() {
					const t = arguments.length;
					this._sync(["_insertElements", this.getDataset().data.length - t, t]);
				}
				_onDataPop() {
					this._sync(["_removeElements", this._cachedMeta.data.length - 1, 1]);
				}
				_onDataShift() {
					this._sync(["_removeElements", 0, 1]);
				}
				_onDataSplice(t, e) {
					e && this._sync(["_removeElements", t, e]);
					const i = arguments.length - 2;
					i && this._sync(["_insertElements", t, i]);
				}
				_onDataUnshift() {
					this._sync(["_insertElements", 0, arguments.length]);
				}
			}
			class cs extends ds {
				static id = "line";
				static defaults = {datasetElementType: "line", dataElementType: "point", showLine: !0, spanGaps: !1};
				static overrides = {scales: {_index_: {type: "category"}, _value_: {type: "linear"}}};
				initialize() {
					(this.enableOptionSharing = !0), (this.supportsDecimation = !0), super.initialize();
				}
				update(t) {
					const e = this._cachedMeta,
						{dataset: i, data: n = [], _dataset: s} = e,
						a = this.chart._animationsDisabled;
					let {start: o, count: r} = Le(e, n, a);
					(this._drawStart = o), (this._drawCount = r), _e(e) && ((o = 0), (r = n.length)), (i._chart = this.chart), (i._datasetIndex = this.index), (i._decimated = !!s._decimated), (i.points = n);
					const l = this.resolveDatasetElementOptions(t);
					this.options.showLine || (l.borderWidth = 0), (l.segment = this.options.segment), this.updateElement(i, void 0, {animated: !a, options: l}, t), this.updateElements(n, o, r, t);
				}
				updateElements(t, e, i, n) {
					const s = "reset" === n,
						{iScale: a, vScale: o, _stacked: r, _dataset: l} = this._cachedMeta,
						{sharedOptions: d, includeOptions: c} = this._getSharedOptions(e, n),
						h = a.axis,
						u = o.axis,
						{spanGaps: m, segment: p} = this.options,
						g = $t(m) ? m : Number.POSITIVE_INFINITY,
						f = this.chart._animationsDisabled || s || "none" === n,
						v = e + i,
						b = t.length;
					let k = e > 0 && this.getParsed(e - 1);
					for (let x = 0; x < b; ++x) {
						const i = t[x],
							m = f ? i : {};
						if (x < e || x >= v) {
							m.skip = !0;
							continue;
						}
						const b = this.getParsed(x),
							L = lt(b[u]),
							_ = (m[h] = a.getPixelForValue(b[h], x)),
							y = (m[u] = s || L ? o.getBasePixel() : o.getPixelForValue(r ? this.applyStack(o, b, r) : b[u], x));
						(m.skip = isNaN(_) || isNaN(y) || L),
							(m.stop = x > 0 && Math.abs(b[h] - k[h]) > g),
							p && ((m.parsed = b), (m.raw = l.data[x])),
							c && (m.options = d || this.resolveDataElementOptions(x, i.active ? "active" : n)),
							f || this.updateElement(i, x, m, n),
							(k = b);
					}
				}
				getMaxOverflow() {
					const t = this._cachedMeta,
						e = t.dataset,
						i = (e.options && e.options.borderWidth) || 0,
						n = t.data || [];
					if (!n.length) return i;
					const s = n[0].size(this.resolveDataElementOptions(0)),
						a = n[n.length - 1].size(this.resolveDataElementOptions(n.length - 1));
					return Math.max(i, s, a) / 2;
				}
				draw() {
					const t = this._cachedMeta;
					t.dataset.updateControlPoints(this.chart.chartArea, t.iScale.axis), super.draw();
				}
			}
			function hs() {
				throw new Error("This method is not implemented: Check that a complete date adapter is provided.");
			}
			class us {
				static override(t) {
					Object.assign(us.prototype, t);
				}
				options;
				constructor(t) {
					this.options = t || {};
				}
				init() {}
				formats() {
					return hs();
				}
				parse() {
					return hs();
				}
				format() {
					return hs();
				}
				add() {
					return hs();
				}
				diff() {
					return hs();
				}
				startOf() {
					return hs();
				}
				endOf() {
					return hs();
				}
			}
			var ms = {_date: us};
			function ps(t, e, i, n) {
				const {controller: s, data: a, _sorted: o} = t,
					r = s._cachedMeta.iScale,
					l = t.dataset && t.dataset.options ? t.dataset.options.spanGaps : null;
				if (r && e === r.axis && "r" !== e && o && a.length) {
					const o = r._reversePixels ? de : le;
					if (!n) {
						const n = o(a, e, i);
						if (l) {
							const {vScale: e} = s._cachedMeta,
								{_parsed: i} = t,
								a = i
									.slice(0, n.lo + 1)
									.reverse()
									.findIndex((t) => !lt(t[e.axis]));
							n.lo -= Math.max(0, a);
							const o = i.slice(n.hi).findIndex((t) => !lt(t[e.axis]));
							n.hi += Math.max(0, o);
						}
						return n;
					}
					if (s._sharedOptions) {
						const t = a[0],
							n = "function" === typeof t.getRange && t.getRange(e);
						if (n) {
							const t = o(a, e, i - n),
								s = o(a, e, i + n);
							return {lo: t.lo, hi: s.hi};
						}
					}
				}
				return {lo: 0, hi: a.length - 1};
			}
			function gs(t, e, i, n, s) {
				const a = t.getSortedVisibleDatasetMetas(),
					o = i[e];
				for (let r = 0, l = a.length; r < l; ++r) {
					const {index: t, data: i} = a[r],
						{lo: l, hi: d} = ps(a[r], e, o, s);
					for (let e = l; e <= d; ++e) {
						const s = i[e];
						s.skip || n(s, t, e);
					}
				}
			}
			function fs(t) {
				const e = -1 !== t.indexOf("x"),
					i = -1 !== t.indexOf("y");
				return function (t, n) {
					const s = e ? Math.abs(t.x - n.x) : 0,
						a = i ? Math.abs(t.y - n.y) : 0;
					return Math.sqrt(Math.pow(s, 2) + Math.pow(a, 2));
				};
			}
			function vs(t, e, i, n, s) {
				const a = [];
				if (!s && !t.isPointInArea(e)) return a;
				const o = function (i, o, r) {
					(s || Qe(i, t.chartArea, 0)) && i.inRange(e.x, e.y, n) && a.push({element: i, datasetIndex: o, index: r});
				};
				return gs(t, i, e, o, !0), a;
			}
			function bs(t, e, i, n) {
				let s = [];
				function a(t, i, a) {
					const {startAngle: o, endAngle: r} = t.getProps(["startAngle", "endAngle"], n),
						{angle: l} = Qt(t, {x: e.x, y: e.y});
					ne(l, o, r) && s.push({element: t, datasetIndex: i, index: a});
				}
				return gs(t, i, e, a), s;
			}
			function ks(t, e, i, n, s, a) {
				let o = [];
				const r = fs(i);
				let l = Number.POSITIVE_INFINITY;
				function d(i, d, c) {
					const h = i.inRange(e.x, e.y, s);
					if (n && !h) return;
					const u = i.getCenterPoint(s),
						m = !!a || t.isPointInArea(u);
					if (!m && !h) return;
					const p = r(e, u);
					p < l ? ((o = [{element: i, datasetIndex: d, index: c}]), (l = p)) : p === l && o.push({element: i, datasetIndex: d, index: c});
				}
				return gs(t, i, e, d), o;
			}
			function xs(t, e, i, n, s, a) {
				return a || t.isPointInArea(e) ? ("r" !== i || n ? ks(t, e, i, n, s, a) : bs(t, e, i, s)) : [];
			}
			function Ls(t, e, i, n, s) {
				const a = [],
					o = "x" === i ? "inXRange" : "inYRange";
				let r = !1;
				return (
					gs(t, i, e, (t, n, l) => {
						t[o] && t[o](e[i], s) && (a.push({element: t, datasetIndex: n, index: l}), (r = r || t.inRange(e.x, e.y, s)));
					}),
					n && !r ? [] : a
				);
			}
			var _s = {
				evaluateInteractionItems: gs,
				modes: {
					index(t, e, i, n) {
						const s = on(e, t),
							a = i.axis || "x",
							o = i.includeInvisible || !1,
							r = i.intersect ? vs(t, s, a, n, o) : xs(t, s, a, !1, n, o),
							l = [];
						return r.length
							? (t.getSortedVisibleDatasetMetas().forEach((t) => {
									const e = r[0].index,
										i = t.data[e];
									i && !i.skip && l.push({element: i, datasetIndex: t.index, index: e});
							  }),
							  l)
							: [];
					},
					dataset(t, e, i, n) {
						const s = on(e, t),
							a = i.axis || "xy",
							o = i.includeInvisible || !1;
						let r = i.intersect ? vs(t, s, a, n, o) : xs(t, s, a, !1, n, o);
						if (r.length > 0) {
							const e = r[0].datasetIndex,
								i = t.getDatasetMeta(e).data;
							r = [];
							for (let t = 0; t < i.length; ++t) r.push({element: i[t], datasetIndex: e, index: t});
						}
						return r;
					},
					point(t, e, i, n) {
						const s = on(e, t),
							a = i.axis || "xy",
							o = i.includeInvisible || !1;
						return vs(t, s, a, n, o);
					},
					nearest(t, e, i, n) {
						const s = on(e, t),
							a = i.axis || "xy",
							o = i.includeInvisible || !1;
						return xs(t, s, a, i.intersect, n, o);
					},
					x(t, e, i, n) {
						const s = on(e, t);
						return Ls(t, s, "x", i.intersect, n);
					},
					y(t, e, i, n) {
						const s = on(e, t);
						return Ls(t, s, "y", i.intersect, n);
					},
				},
			};
			const ys = ["left", "top", "right", "bottom"];
			function ws(t, e) {
				return t.filter((t) => t.pos === e);
			}
			function Cs(t, e) {
				return t.filter((t) => -1 === ys.indexOf(t.pos) && t.box.axis === e);
			}
			function Ss(t, e) {
				return t.sort((t, i) => {
					const n = e ? i : t,
						s = e ? t : i;
					return n.weight === s.weight ? n.index - s.index : n.weight - s.weight;
				});
			}
			function As(t) {
				const e = [];
				let i, n, s, a, o, r;
				for (i = 0, n = (t || []).length; i < n; ++i)
					(s = t[i]),
						({
							position: a,
							options: {stack: o, stackWeight: r = 1},
						} = s),
						e.push({index: i, box: s, pos: a, horizontal: s.isHorizontal(), weight: s.weight, stack: o && a + o, stackWeight: r});
				return e;
			}
			function Ms(t) {
				const e = {};
				for (const i of t) {
					const {stack: t, pos: n, stackWeight: s} = i;
					if (!t || !ys.includes(n)) continue;
					const a = e[t] || (e[t] = {count: 0, placed: 0, weight: 0, size: 0});
					a.count++, (a.weight += s);
				}
				return e;
			}
			function Fs(t, e) {
				const i = Ms(t),
					{vBoxMaxWidth: n, hBoxMaxHeight: s} = e;
				let a, o, r;
				for (a = 0, o = t.length; a < o; ++a) {
					r = t[a];
					const {fullSize: o} = r.box,
						l = i[r.stack],
						d = l && r.stackWeight / l.weight;
					r.horizontal ? ((r.width = d ? d * n : o && e.availableWidth), (r.height = s)) : ((r.width = n), (r.height = d ? d * s : o && e.availableHeight));
				}
				return i;
			}
			function Ds(t) {
				const e = As(t),
					i = Ss(
						e.filter((t) => t.box.fullSize),
						!0
					),
					n = Ss(ws(e, "left"), !0),
					s = Ss(ws(e, "right")),
					a = Ss(ws(e, "top"), !0),
					o = Ss(ws(e, "bottom")),
					r = Cs(e, "x"),
					l = Cs(e, "y");
				return {
					fullSize: i,
					leftAndTop: n.concat(a),
					rightAndBottom: s.concat(l).concat(o).concat(r),
					chartArea: ws(e, "chartArea"),
					vertical: n.concat(s).concat(l),
					horizontal: a.concat(o).concat(r),
				};
			}
			function Es(t, e, i, n) {
				return Math.max(t[i], e[i]) + Math.max(t[n], e[n]);
			}
			function Ts(t, e) {
				(t.top = Math.max(t.top, e.top)), (t.left = Math.max(t.left, e.left)), (t.bottom = Math.max(t.bottom, e.bottom)), (t.right = Math.max(t.right, e.right));
			}
			function Ps(t, e, i, n) {
				const {pos: s, box: a} = i,
					o = t.maxPadding;
				if (!ct(s)) {
					i.size && (t[s] -= i.size);
					const e = n[i.stack] || {size: 0, count: 1};
					(e.size = Math.max(e.size, i.horizontal ? a.height : a.width)), (i.size = e.size / e.count), (t[s] += i.size);
				}
				a.getPadding && Ts(o, a.getPadding());
				const r = Math.max(0, e.outerWidth - Es(o, t, "left", "right")),
					l = Math.max(0, e.outerHeight - Es(o, t, "top", "bottom")),
					d = r !== t.w,
					c = l !== t.h;
				return (t.w = r), (t.h = l), i.horizontal ? {same: d, other: c} : {same: c, other: d};
			}
			function Is(t) {
				const e = t.maxPadding;
				function i(i) {
					const n = Math.max(e[i] - t[i], 0);
					return (t[i] += n), n;
				}
				(t.y += i("top")), (t.x += i("left")), i("right"), i("bottom");
			}
			function Bs(t, e) {
				const i = e.maxPadding;
				function n(t) {
					const n = {left: 0, top: 0, right: 0, bottom: 0};
					return (
						t.forEach((t) => {
							n[t] = Math.max(e[t], i[t]);
						}),
						n
					);
				}
				return n(t ? ["left", "right"] : ["top", "bottom"]);
			}
			function Os(t, e, i, n) {
				const s = [];
				let a, o, r, l, d, c;
				for (a = 0, o = t.length, d = 0; a < o; ++a) {
					(r = t[a]), (l = r.box), l.update(r.width || e.w, r.height || e.h, Bs(r.horizontal, e));
					const {same: o, other: h} = Ps(e, i, r, n);
					(d |= o && s.length), (c = c || h), l.fullSize || s.push(r);
				}
				return (d && Os(s, e, i, n)) || c;
			}
			function Rs(t, e, i, n, s) {
				(t.top = i), (t.left = e), (t.right = e + n), (t.bottom = i + s), (t.width = n), (t.height = s);
			}
			function Vs(t, e, i, n) {
				const s = i.padding;
				let {x: a, y: o} = e;
				for (const r of t) {
					const t = r.box,
						l = n[r.stack] || {count: 1, placed: 0, weight: 1},
						d = r.stackWeight / l.weight || 1;
					if (r.horizontal) {
						const n = e.w * d,
							a = l.size || t.height;
						Ft(l.start) && (o = l.start), t.fullSize ? Rs(t, s.left, o, i.outerWidth - s.right - s.left, a) : Rs(t, e.left + l.placed, o, n, a), (l.start = o), (l.placed += n), (o = t.bottom);
					} else {
						const n = e.h * d,
							o = l.size || t.width;
						Ft(l.start) && (a = l.start), t.fullSize ? Rs(t, a, s.top, o, i.outerHeight - s.bottom - s.top) : Rs(t, a, e.top + l.placed, o, n), (l.start = a), (l.placed += n), (a = t.right);
					}
				}
				(e.x = a), (e.y = o);
			}
			var Ns = {
				addBox(t, e) {
					t.boxes || (t.boxes = []),
						(e.fullSize = e.fullSize || !1),
						(e.position = e.position || "top"),
						(e.weight = e.weight || 0),
						(e._layers =
							e._layers ||
							function () {
								return [
									{
										z: 0,
										draw(t) {
											e.draw(t);
										},
									},
								];
							}),
						t.boxes.push(e);
				},
				removeBox(t, e) {
					const i = t.boxes ? t.boxes.indexOf(e) : -1;
					-1 !== i && t.boxes.splice(i, 1);
				},
				configure(t, e, i) {
					(e.fullSize = i.fullSize), (e.position = i.position), (e.weight = i.weight);
				},
				update(t, e, i, n) {
					if (!t) return;
					const s = fi(t.options.layout.padding),
						a = Math.max(e - s.width, 0),
						o = Math.max(i - s.height, 0),
						r = Ds(t.boxes),
						l = r.vertical,
						d = r.horizontal;
					ft(t.boxes, (t) => {
						"function" === typeof t.beforeLayout && t.beforeLayout();
					});
					const c = l.reduce((t, e) => (e.box.options && !1 === e.box.options.display ? t : t + 1), 0) || 1,
						h = Object.freeze({outerWidth: e, outerHeight: i, padding: s, availableWidth: a, availableHeight: o, vBoxMaxWidth: a / 2 / c, hBoxMaxHeight: o / 2}),
						u = Object.assign({}, s);
					Ts(u, fi(n));
					const m = Object.assign({maxPadding: u, w: a, h: o, x: s.left, y: s.top}, s),
						p = Fs(l.concat(d), h);
					Os(r.fullSize, m, h, p),
						Os(l, m, h, p),
						Os(d, m, h, p) && Os(l, m, h, p),
						Is(m),
						Vs(r.leftAndTop, m, h, p),
						(m.x += m.w),
						(m.y += m.h),
						Vs(r.rightAndBottom, m, h, p),
						(t.chartArea = {left: m.left, top: m.top, right: m.left + m.w, bottom: m.top + m.h, height: m.h, width: m.w}),
						ft(r.chartArea, (e) => {
							const i = e.box;
							Object.assign(i, t.chartArea), i.update(m.w, m.h, {left: 0, top: 0, right: 0, bottom: 0});
						});
				},
			};
			class zs {
				acquireContext(t, e) {}
				releaseContext(t) {
					return !1;
				}
				addEventListener(t, e, i) {}
				removeEventListener(t, e, i) {}
				getDevicePixelRatio() {
					return 1;
				}
				getMaximumSize(t, e, i, n) {
					return (e = Math.max(0, e || t.width)), (i = i || t.height), {width: e, height: Math.max(0, n ? Math.floor(e / n) : i)};
				}
				isAttached(t) {
					return !0;
				}
				updateConfig(t) {}
			}
			class Ws extends zs {
				acquireContext(t) {
					return (t && t.getContext && t.getContext("2d")) || null;
				}
				updateConfig(t) {
					t.options.animation = !1;
				}
			}
			const Hs = "$chartjs",
				Us = {
					touchstart: "mousedown",
					touchmove: "mousemove",
					touchend: "mouseup",
					pointerenter: "mouseenter",
					pointerdown: "mousedown",
					pointermove: "mousemove",
					pointerup: "mouseup",
					pointerleave: "mouseout",
					pointerout: "mouseout",
				},
				Xs = (t) => null === t || "" === t;
			function Gs(t, e) {
				const i = t.style,
					n = t.getAttribute("height"),
					s = t.getAttribute("width");
				if (
					((t[Hs] = {initial: {height: n, width: s, style: {display: i.display, height: i.height, width: i.width}}}),
					(i.display = i.display || "block"),
					(i.boxSizing = i.boxSizing || "border-box"),
					Xs(s))
				) {
					const e = un(t, "width");
					void 0 !== e && (t.width = e);
				}
				if (Xs(n))
					if ("" === t.style.height) t.height = t.width / (e || 2);
					else {
						const e = un(t, "height");
						void 0 !== e && (t.height = e);
					}
				return t;
			}
			const js = !!hn && {passive: !0};
			function $s(t, e, i) {
				t && t.addEventListener(e, i, js);
			}
			function Ys(t, e, i) {
				t && t.canvas && t.canvas.removeEventListener(e, i, js);
			}
			function Ks(t, e) {
				const i = Us[t.type] || t.type,
					{x: n, y: s} = on(t, e);
				return {type: i, chart: e, native: t, x: void 0 !== n ? n : null, y: void 0 !== s ? s : null};
			}
			function qs(t, e) {
				for (const i of t) if (i === e || i.contains(e)) return !0;
			}
			function Js(t, e, i) {
				const n = t.canvas,
					s = new MutationObserver((t) => {
						let e = !1;
						for (const i of t) (e = e || qs(i.addedNodes, n)), (e = e && !qs(i.removedNodes, n));
						e && i();
					});
				return s.observe(document, {childList: !0, subtree: !0}), s;
			}
			function Zs(t, e, i) {
				const n = t.canvas,
					s = new MutationObserver((t) => {
						let e = !1;
						for (const i of t) (e = e || qs(i.removedNodes, n)), (e = e && !qs(i.addedNodes, n));
						e && i();
					});
				return s.observe(document, {childList: !0, subtree: !0}), s;
			}
			const Qs = new Map();
			let ta = 0;
			function ea() {
				const t = window.devicePixelRatio;
				t !== ta &&
					((ta = t),
					Qs.forEach((e, i) => {
						i.currentDevicePixelRatio !== t && e();
					}));
			}
			function ia(t, e) {
				Qs.size || window.addEventListener("resize", ea), Qs.set(t, e);
			}
			function na(t) {
				Qs.delete(t), Qs.size || window.removeEventListener("resize", ea);
			}
			function sa(t, e, i) {
				const n = t.canvas,
					s = n && Ji(n);
				if (!s) return;
				const a = fe((t, e) => {
						const n = s.clientWidth;
						i(t, e), n < s.clientWidth && i();
					}, window),
					o = new ResizeObserver((t) => {
						const e = t[0],
							i = e.contentRect.width,
							n = e.contentRect.height;
						(0 === i && 0 === n) || a(i, n);
					});
				return o.observe(s), ia(t, a), o;
			}
			function aa(t, e, i) {
				i && i.disconnect(), "resize" === e && na(t);
			}
			function oa(t, e, i) {
				const n = t.canvas,
					s = fe((e) => {
						null !== t.ctx && i(Ks(e, t));
					}, t);
				return $s(n, e, s), s;
			}
			class ra extends zs {
				acquireContext(t, e) {
					const i = t && t.getContext && t.getContext("2d");
					return i && i.canvas === t ? (Gs(t, e), i) : null;
				}
				releaseContext(t) {
					const e = t.canvas;
					if (!e[Hs]) return !1;
					const i = e[Hs].initial;
					["height", "width"].forEach((t) => {
						const n = i[t];
						lt(n) ? e.removeAttribute(t) : e.setAttribute(t, n);
					});
					const n = i.style || {};
					return (
						Object.keys(n).forEach((t) => {
							e.style[t] = n[t];
						}),
						(e.width = e.width),
						delete e[Hs],
						!0
					);
				}
				addEventListener(t, e, i) {
					this.removeEventListener(t, e);
					const n = t.$proxies || (t.$proxies = {}),
						s = {attach: Js, detach: Zs, resize: sa},
						a = s[e] || oa;
					n[e] = a(t, e, i);
				}
				removeEventListener(t, e) {
					const i = t.$proxies || (t.$proxies = {}),
						n = i[e];
					if (!n) return;
					const s = {attach: aa, detach: aa, resize: aa},
						a = s[e] || Ys;
					a(t, e, n), (i[e] = void 0);
				}
				getDevicePixelRatio() {
					return window.devicePixelRatio;
				}
				getMaximumSize(t, e, i, n) {
					return dn(t, e, i, n);
				}
				isAttached(t) {
					const e = t && Ji(t);
					return !(!e || !e.isConnected);
				}
			}
			function la(t) {
				return !qi() || ("undefined" !== typeof OffscreenCanvas && t instanceof OffscreenCanvas) ? Ws : ra;
			}
			class da {
				static defaults = {};
				static defaultRoutes = void 0;
				x;
				y;
				active = !1;
				options;
				$animations;
				tooltipPosition(t) {
					const {x: e, y: i} = this.getProps(["x", "y"], t);
					return {x: e, y: i};
				}
				hasValue() {
					return $t(this.x) && $t(this.y);
				}
				getProps(t, e) {
					const i = this.$animations;
					if (!e || !i) return this;
					const n = {};
					return (
						t.forEach((t) => {
							n[t] = i[t] && i[t].active() ? i[t]._to : this[t];
						}),
						n
					);
				}
			}
			function ca(t, e) {
				const i = t.options.ticks,
					n = ha(t),
					s = Math.min(i.maxTicksLimit || n, n),
					a = i.major.enabled ? ma(e) : [],
					o = a.length,
					r = a[0],
					l = a[o - 1],
					d = [];
				if (o > s) return pa(e, d, a, o / s), d;
				const c = ua(a, e, s);
				if (o > 0) {
					let t, i;
					const n = o > 1 ? Math.round((l - r) / (o - 1)) : null;
					for (ga(e, d, c, lt(n) ? 0 : r - n, r), t = 0, i = o - 1; t < i; t++) ga(e, d, c, a[t], a[t + 1]);
					return ga(e, d, c, l, lt(n) ? e.length : l + n), d;
				}
				return ga(e, d, c), d;
			}
			function ha(t) {
				const e = t.options.offset,
					i = t._tickSize(),
					n = t._length / i + (e ? 0 : 1),
					s = t._maxLength / i;
				return Math.floor(Math.min(n, s));
			}
			function ua(t, e, i) {
				const n = fa(t),
					s = e.length / i;
				if (!n) return Math.max(s, 1);
				const a = Gt(n);
				for (let o = 0, r = a.length - 1; o < r; o++) {
					const t = a[o];
					if (t > s) return t;
				}
				return Math.max(s, 1);
			}
			function ma(t) {
				const e = [];
				let i, n;
				for (i = 0, n = t.length; i < n; i++) t[i].major && e.push(i);
				return e;
			}
			function pa(t, e, i, n) {
				let s,
					a = 0,
					o = i[0];
				for (n = Math.ceil(n), s = 0; s < t.length; s++) s === o && (e.push(t[s]), a++, (o = i[a * n]));
			}
			function ga(t, e, i, n, s) {
				const a = mt(n, 0),
					o = Math.min(mt(s, t.length), t.length);
				let r,
					l,
					d,
					c = 0;
				(i = Math.ceil(i)), s && ((r = s - n), (i = r / Math.floor(r / i))), (d = a);
				while (d < 0) c++, (d = Math.round(a + c * i));
				for (l = Math.max(a, 0); l < o; l++) l === d && (e.push(t[l]), c++, (d = Math.round(a + c * i)));
			}
			function fa(t) {
				const e = t.length;
				let i, n;
				if (e < 2) return !1;
				for (n = t[0], i = 1; i < e; ++i) if (t[i] - t[i - 1] !== n) return !1;
				return n;
			}
			const va = (t) => ("left" === t ? "right" : "right" === t ? "left" : t),
				ba = (t, e, i) => ("top" === e || "left" === e ? t[e] + i : t[e] - i),
				ka = (t, e) => Math.min(e || t, t);
			function xa(t, e) {
				const i = [],
					n = t.length / e,
					s = t.length;
				let a = 0;
				for (; a < s; a += n) i.push(t[Math.floor(a)]);
				return i;
			}
			function La(t, e, i) {
				const n = t.ticks.length,
					s = Math.min(e, n - 1),
					a = t._startPixel,
					o = t._endPixel,
					r = 1e-6;
				let l,
					d = t.getPixelForTick(s);
				if (!(i && ((l = 1 === n ? Math.max(d - a, o - d) : 0 === e ? (t.getPixelForTick(1) - d) / 2 : (d - t.getPixelForTick(s - 1)) / 2), (d += s < e ? l : -l), d < a - r || d > o + r))) return d;
			}
			function _a(t, e) {
				ft(t, (t) => {
					const i = t.gc,
						n = i.length / 2;
					let s;
					if (n > e) {
						for (s = 0; s < n; ++s) delete t.data[i[s]];
						i.splice(0, n);
					}
				});
			}
			function ya(t) {
				return t.drawTicks ? t.tickLength : 0;
			}
			function wa(t, e) {
				if (!t.display) return 0;
				const i = vi(t.font, e),
					n = fi(t.padding),
					s = dt(t.text) ? t.text.length : 1;
				return s * i.lineHeight + n.height;
			}
			function Ca(t, e) {
				return xi(t, {scale: e, type: "scale"});
			}
			function Sa(t, e, i) {
				return xi(t, {tick: i, index: e, type: "tick"});
			}
			function Aa(t, e, i) {
				let n = be(t);
				return ((i && "right" !== e) || (!i && "right" === e)) && (n = va(n)), n;
			}
			function Ma(t, e, i, n) {
				const {top: s, left: a, bottom: o, right: r, chart: l} = t,
					{chartArea: d, scales: c} = l;
				let h,
					u,
					m,
					p = 0;
				const g = o - s,
					f = r - a;
				if (t.isHorizontal()) {
					if (((u = ke(n, a, r)), ct(i))) {
						const t = Object.keys(i)[0],
							n = i[t];
						m = c[t].getPixelForValue(n) + g - e;
					} else m = "center" === i ? (d.bottom + d.top) / 2 + g - e : ba(t, i, e);
					h = r - a;
				} else {
					if (ct(i)) {
						const t = Object.keys(i)[0],
							n = i[t];
						u = c[t].getPixelForValue(n) - f + e;
					} else u = "center" === i ? (d.left + d.right) / 2 - f + e : ba(t, i, e);
					(m = ke(n, o, s)), (p = "left" === i ? -Vt : Vt);
				}
				return {titleX: u, titleY: m, maxWidth: h, rotation: p};
			}
			class Fa extends da {
				constructor(t) {
					super(),
						(this.id = t.id),
						(this.type = t.type),
						(this.options = void 0),
						(this.ctx = t.ctx),
						(this.chart = t.chart),
						(this.top = void 0),
						(this.bottom = void 0),
						(this.left = void 0),
						(this.right = void 0),
						(this.width = void 0),
						(this.height = void 0),
						(this._margins = {left: 0, right: 0, top: 0, bottom: 0}),
						(this.maxWidth = void 0),
						(this.maxHeight = void 0),
						(this.paddingTop = void 0),
						(this.paddingBottom = void 0),
						(this.paddingLeft = void 0),
						(this.paddingRight = void 0),
						(this.axis = void 0),
						(this.labelRotation = void 0),
						(this.min = void 0),
						(this.max = void 0),
						(this._range = void 0),
						(this.ticks = []),
						(this._gridLineItems = null),
						(this._labelItems = null),
						(this._labelSizes = null),
						(this._length = 0),
						(this._maxLength = 0),
						(this._longestTextCache = {}),
						(this._startPixel = void 0),
						(this._endPixel = void 0),
						(this._reversePixels = !1),
						(this._userMax = void 0),
						(this._userMin = void 0),
						(this._suggestedMax = void 0),
						(this._suggestedMin = void 0),
						(this._ticksLength = 0),
						(this._borderValue = 0),
						(this._cache = {}),
						(this._dataLimitsCached = !1),
						(this.$context = void 0);
				}
				init(t) {
					(this.options = t.setContext(this.getContext())),
						(this.axis = t.axis),
						(this._userMin = this.parse(t.min)),
						(this._userMax = this.parse(t.max)),
						(this._suggestedMin = this.parse(t.suggestedMin)),
						(this._suggestedMax = this.parse(t.suggestedMax));
				}
				parse(t, e) {
					return t;
				}
				getUserBounds() {
					let {_userMin: t, _userMax: e, _suggestedMin: i, _suggestedMax: n} = this;
					return (
						(t = ut(t, Number.POSITIVE_INFINITY)),
						(e = ut(e, Number.NEGATIVE_INFINITY)),
						(i = ut(i, Number.POSITIVE_INFINITY)),
						(n = ut(n, Number.NEGATIVE_INFINITY)),
						{min: ut(t, i), max: ut(e, n), minDefined: ht(t), maxDefined: ht(e)}
					);
				}
				getMinMax(t) {
					let e,
						{min: i, max: n, minDefined: s, maxDefined: a} = this.getUserBounds();
					if (s && a) return {min: i, max: n};
					const o = this.getMatchingVisibleMetas();
					for (let r = 0, l = o.length; r < l; ++r) (e = o[r].controller.getMinMax(this, t)), s || (i = Math.min(i, e.min)), a || (n = Math.max(n, e.max));
					return (i = a && i > n ? n : i), (n = s && i > n ? i : n), {min: ut(i, ut(n, i)), max: ut(n, ut(i, n))};
				}
				getPadding() {
					return {left: this.paddingLeft || 0, top: this.paddingTop || 0, right: this.paddingRight || 0, bottom: this.paddingBottom || 0};
				}
				getTicks() {
					return this.ticks;
				}
				getLabels() {
					const t = this.chart.data;
					return this.options.labels || (this.isHorizontal() ? t.xLabels : t.yLabels) || t.labels || [];
				}
				getLabelItems(t = this.chart.chartArea) {
					const e = this._labelItems || (this._labelItems = this._computeLabelItems(t));
					return e;
				}
				beforeLayout() {
					(this._cache = {}), (this._dataLimitsCached = !1);
				}
				beforeUpdate() {
					gt(this.options.beforeUpdate, [this]);
				}
				update(t, e, i) {
					const {beginAtZero: n, grace: s, ticks: a} = this.options,
						o = a.sampleSize;
					this.beforeUpdate(),
						(this.maxWidth = t),
						(this.maxHeight = e),
						(this._margins = i = Object.assign({left: 0, right: 0, top: 0, bottom: 0}, i)),
						(this.ticks = null),
						(this._labelSizes = null),
						(this._gridLineItems = null),
						(this._labelItems = null),
						this.beforeSetDimensions(),
						this.setDimensions(),
						this.afterSetDimensions(),
						(this._maxLength = this.isHorizontal() ? this.width + i.left + i.right : this.height + i.top + i.bottom),
						this._dataLimitsCached || (this.beforeDataLimits(), this.determineDataLimits(), this.afterDataLimits(), (this._range = ki(this, s, n)), (this._dataLimitsCached = !0)),
						this.beforeBuildTicks(),
						(this.ticks = this.buildTicks() || []),
						this.afterBuildTicks();
					const r = o < this.ticks.length;
					this._convertTicksToLabels(r ? xa(this.ticks, o) : this.ticks),
						this.configure(),
						this.beforeCalculateLabelRotation(),
						this.calculateLabelRotation(),
						this.afterCalculateLabelRotation(),
						a.display && (a.autoSkip || "auto" === a.source) && ((this.ticks = ca(this, this.ticks)), (this._labelSizes = null), this.afterAutoSkip()),
						r && this._convertTicksToLabels(this.ticks),
						this.beforeFit(),
						this.fit(),
						this.afterFit(),
						this.afterUpdate();
				}
				configure() {
					let t,
						e,
						i = this.options.reverse;
					this.isHorizontal() ? ((t = this.left), (e = this.right)) : ((t = this.top), (e = this.bottom), (i = !i)),
						(this._startPixel = t),
						(this._endPixel = e),
						(this._reversePixels = i),
						(this._length = e - t),
						(this._alignToPixels = this.options.alignToPixels);
				}
				afterUpdate() {
					gt(this.options.afterUpdate, [this]);
				}
				beforeSetDimensions() {
					gt(this.options.beforeSetDimensions, [this]);
				}
				setDimensions() {
					this.isHorizontal() ? ((this.width = this.maxWidth), (this.left = 0), (this.right = this.width)) : ((this.height = this.maxHeight), (this.top = 0), (this.bottom = this.height)),
						(this.paddingLeft = 0),
						(this.paddingTop = 0),
						(this.paddingRight = 0),
						(this.paddingBottom = 0);
				}
				afterSetDimensions() {
					gt(this.options.afterSetDimensions, [this]);
				}
				_callHooks(t) {
					this.chart.notifyPlugins(t, this.getContext()), gt(this.options[t], [this]);
				}
				beforeDataLimits() {
					this._callHooks("beforeDataLimits");
				}
				determineDataLimits() {}
				afterDataLimits() {
					this._callHooks("afterDataLimits");
				}
				beforeBuildTicks() {
					this._callHooks("beforeBuildTicks");
				}
				buildTicks() {
					return [];
				}
				afterBuildTicks() {
					this._callHooks("afterBuildTicks");
				}
				beforeTickToLabelConversion() {
					gt(this.options.beforeTickToLabelConversion, [this]);
				}
				generateTickLabels(t) {
					const e = this.options.ticks;
					let i, n, s;
					for (i = 0, n = t.length; i < n; i++) (s = t[i]), (s.label = gt(e.callback, [s.value, i, t], this));
				}
				afterTickToLabelConversion() {
					gt(this.options.afterTickToLabelConversion, [this]);
				}
				beforeCalculateLabelRotation() {
					gt(this.options.beforeCalculateLabelRotation, [this]);
				}
				calculateLabelRotation() {
					const t = this.options,
						e = t.ticks,
						i = ka(this.ticks.length, t.ticks.maxTicksLimit),
						n = e.minRotation || 0,
						s = e.maxRotation;
					let a,
						o,
						r,
						l = n;
					if (!this._isVisible() || !e.display || n >= s || i <= 1 || !this.isHorizontal()) return void (this.labelRotation = n);
					const d = this._getLabelSizes(),
						c = d.widest.width,
						h = d.highest.height,
						u = se(this.chart.width - c, 0, this.maxWidth);
					(a = t.offset ? this.maxWidth / i : u / (i - 1)),
						c + 6 > a &&
							((a = u / (i - (t.offset ? 0.5 : 1))),
							(o = this.maxHeight - ya(t.grid) - e.padding - wa(t.title, this.chart.options.font)),
							(r = Math.sqrt(c * c + h * h)),
							(l = Jt(Math.min(Math.asin(se((d.highest.height + 6) / a, -1, 1)), Math.asin(se(o / r, -1, 1)) - Math.asin(se(h / r, -1, 1))))),
							(l = Math.max(n, Math.min(s, l)))),
						(this.labelRotation = l);
				}
				afterCalculateLabelRotation() {
					gt(this.options.afterCalculateLabelRotation, [this]);
				}
				afterAutoSkip() {}
				beforeFit() {
					gt(this.options.beforeFit, [this]);
				}
				fit() {
					const t = {width: 0, height: 0},
						{
							chart: e,
							options: {ticks: i, title: n, grid: s},
						} = this,
						a = this._isVisible(),
						o = this.isHorizontal();
					if (a) {
						const a = wa(n, e.options.font);
						if ((o ? ((t.width = this.maxWidth), (t.height = ya(s) + a)) : ((t.height = this.maxHeight), (t.width = ya(s) + a)), i.display && this.ticks.length)) {
							const {first: e, last: n, widest: s, highest: a} = this._getLabelSizes(),
								r = 2 * i.padding,
								l = qt(this.labelRotation),
								d = Math.cos(l),
								c = Math.sin(l);
							if (o) {
								const e = i.mirror ? 0 : c * s.width + d * a.height;
								t.height = Math.min(this.maxHeight, t.height + e + r);
							} else {
								const e = i.mirror ? 0 : d * s.width + c * a.height;
								t.width = Math.min(this.maxWidth, t.width + e + r);
							}
							this._calculatePadding(e, n, c, d);
						}
					}
					this._handleMargins(),
						o
							? ((this.width = this._length = e.width - this._margins.left - this._margins.right), (this.height = t.height))
							: ((this.width = t.width), (this.height = this._length = e.height - this._margins.top - this._margins.bottom));
				}
				_calculatePadding(t, e, i, n) {
					const {
							ticks: {align: s, padding: a},
							position: o,
						} = this.options,
						r = 0 !== this.labelRotation,
						l = "top" !== o && "x" === this.axis;
					if (this.isHorizontal()) {
						const o = this.getPixelForTick(0) - this.left,
							d = this.right - this.getPixelForTick(this.ticks.length - 1);
						let c = 0,
							h = 0;
						r
							? l
								? ((c = n * t.width), (h = i * e.height))
								: ((c = i * t.height), (h = n * e.width))
							: "start" === s
							? (h = e.width)
							: "end" === s
							? (c = t.width)
							: "inner" !== s && ((c = t.width / 2), (h = e.width / 2)),
							(this.paddingLeft = Math.max(((c - o + a) * this.width) / (this.width - o), 0)),
							(this.paddingRight = Math.max(((h - d + a) * this.width) / (this.width - d), 0));
					} else {
						let i = e.height / 2,
							n = t.height / 2;
						"start" === s ? ((i = 0), (n = t.height)) : "end" === s && ((i = e.height), (n = 0)), (this.paddingTop = i + a), (this.paddingBottom = n + a);
					}
				}
				_handleMargins() {
					this._margins &&
						((this._margins.left = Math.max(this.paddingLeft, this._margins.left)),
						(this._margins.top = Math.max(this.paddingTop, this._margins.top)),
						(this._margins.right = Math.max(this.paddingRight, this._margins.right)),
						(this._margins.bottom = Math.max(this.paddingBottom, this._margins.bottom)));
				}
				afterFit() {
					gt(this.options.afterFit, [this]);
				}
				isHorizontal() {
					const {axis: t, position: e} = this.options;
					return "top" === e || "bottom" === e || "x" === t;
				}
				isFullSize() {
					return this.options.fullSize;
				}
				_convertTicksToLabels(t) {
					let e, i;
					for (this.beforeTickToLabelConversion(), this.generateTickLabels(t), e = 0, i = t.length; e < i; e++) lt(t[e].label) && (t.splice(e, 1), i--, e--);
					this.afterTickToLabelConversion();
				}
				_getLabelSizes() {
					let t = this._labelSizes;
					if (!t) {
						const e = this.options.ticks.sampleSize;
						let i = this.ticks;
						e < i.length && (i = xa(i, e)), (this._labelSizes = t = this._computeLabelSizes(i, i.length, this.options.ticks.maxTicksLimit));
					}
					return t;
				}
				_computeLabelSizes(t, e, i) {
					const {ctx: n, _longestTextCache: s} = this,
						a = [],
						o = [],
						r = Math.floor(e / ka(e, i));
					let l,
						d,
						c,
						h,
						u,
						m,
						p,
						g,
						f,
						v,
						b,
						k = 0,
						x = 0;
					for (l = 0; l < e; l += r) {
						if (((h = t[l].label), (u = this._resolveTickFontOptions(l)), (n.font = m = u.string), (p = s[m] = s[m] || {data: {}, gc: []}), (g = u.lineHeight), (f = v = 0), lt(h) || dt(h))) {
							if (dt(h)) for (d = 0, c = h.length; d < c; ++d) (b = h[d]), lt(b) || dt(b) || ((f = Ye(n, p.data, p.gc, f, b)), (v += g));
						} else (f = Ye(n, p.data, p.gc, f, h)), (v = g);
						a.push(f), o.push(v), (k = Math.max(f, k)), (x = Math.max(v, x));
					}
					_a(s, e);
					const L = a.indexOf(k),
						_ = o.indexOf(x),
						y = (t) => ({width: a[t] || 0, height: o[t] || 0});
					return {first: y(0), last: y(e - 1), widest: y(L), highest: y(_), widths: a, heights: o};
				}
				getLabelForValue(t) {
					return t;
				}
				getPixelForValue(t, e) {
					return NaN;
				}
				getValueForPixel(t) {}
				getPixelForTick(t) {
					const e = this.ticks;
					return t < 0 || t > e.length - 1 ? null : this.getPixelForValue(e[t].value);
				}
				getPixelForDecimal(t) {
					this._reversePixels && (t = 1 - t);
					const e = this._startPixel + t * this._length;
					return ae(this._alignToPixels ? Ke(this.chart, e, 0) : e);
				}
				getDecimalForPixel(t) {
					const e = (t - this._startPixel) / this._length;
					return this._reversePixels ? 1 - e : e;
				}
				getBasePixel() {
					return this.getPixelForValue(this.getBaseValue());
				}
				getBaseValue() {
					const {min: t, max: e} = this;
					return t < 0 && e < 0 ? e : t > 0 && e > 0 ? t : 0;
				}
				getContext(t) {
					const e = this.ticks || [];
					if (t >= 0 && t < e.length) {
						const i = e[t];
						return i.$context || (i.$context = Sa(this.getContext(), t, i));
					}
					return this.$context || (this.$context = Ca(this.chart.getContext(), this));
				}
				_tickSize() {
					const t = this.options.ticks,
						e = qt(this.labelRotation),
						i = Math.abs(Math.cos(e)),
						n = Math.abs(Math.sin(e)),
						s = this._getLabelSizes(),
						a = t.autoSkipPadding || 0,
						o = s ? s.widest.width + a : 0,
						r = s ? s.highest.height + a : 0;
					return this.isHorizontal() ? (r * i > o * n ? o / i : r / n) : r * n < o * i ? r / i : o / n;
				}
				_isVisible() {
					const t = this.options.display;
					return "auto" !== t ? !!t : this.getMatchingVisibleMetas().length > 0;
				}
				_computeGridLineItems(t) {
					const e = this.axis,
						i = this.chart,
						n = this.options,
						{grid: s, position: a, border: o} = n,
						r = s.offset,
						l = this.isHorizontal(),
						d = this.ticks,
						c = d.length + (r ? 1 : 0),
						h = ya(s),
						u = [],
						m = o.setContext(this.getContext()),
						p = m.display ? m.width : 0,
						g = p / 2,
						f = function (t) {
							return Ke(i, t, p);
						};
					let v, b, k, x, L, _, y, w, C, S, A, M;
					if ("top" === a) (v = f(this.bottom)), (_ = this.bottom - h), (w = v - g), (S = f(t.top) + g), (M = t.bottom);
					else if ("bottom" === a) (v = f(this.top)), (S = t.top), (M = f(t.bottom) - g), (_ = v + g), (w = this.top + h);
					else if ("left" === a) (v = f(this.right)), (L = this.right - h), (y = v - g), (C = f(t.left) + g), (A = t.right);
					else if ("right" === a) (v = f(this.left)), (C = t.left), (A = f(t.right) - g), (L = v + g), (y = this.left + h);
					else if ("x" === e) {
						if ("center" === a) v = f((t.top + t.bottom) / 2 + 0.5);
						else if (ct(a)) {
							const t = Object.keys(a)[0],
								e = a[t];
							v = f(this.chart.scales[t].getPixelForValue(e));
						}
						(S = t.top), (M = t.bottom), (_ = v + g), (w = _ + h);
					} else if ("y" === e) {
						if ("center" === a) v = f((t.left + t.right) / 2);
						else if (ct(a)) {
							const t = Object.keys(a)[0],
								e = a[t];
							v = f(this.chart.scales[t].getPixelForValue(e));
						}
						(L = v - g), (y = L - h), (C = t.left), (A = t.right);
					}
					const F = mt(n.ticks.maxTicksLimit, c),
						D = Math.max(1, Math.ceil(c / F));
					for (b = 0; b < c; b += D) {
						const t = this.getContext(b),
							e = s.setContext(t),
							n = o.setContext(t),
							a = e.lineWidth,
							d = e.color,
							c = n.dash || [],
							h = n.dashOffset,
							m = e.tickWidth,
							p = e.tickColor,
							g = e.tickBorderDash || [],
							f = e.tickBorderDashOffset;
						(k = La(this, b, r)),
							void 0 !== k &&
								((x = Ke(i, k, a)),
								l ? (L = y = C = A = x) : (_ = w = S = M = x),
								u.push({
									tx1: L,
									ty1: _,
									tx2: y,
									ty2: w,
									x1: C,
									y1: S,
									x2: A,
									y2: M,
									width: a,
									color: d,
									borderDash: c,
									borderDashOffset: h,
									tickWidth: m,
									tickColor: p,
									tickBorderDash: g,
									tickBorderDashOffset: f,
								}));
					}
					return (this._ticksLength = c), (this._borderValue = v), u;
				}
				_computeLabelItems(t) {
					const e = this.axis,
						i = this.options,
						{position: n, ticks: s} = i,
						a = this.isHorizontal(),
						o = this.ticks,
						{align: r, crossAlign: l, padding: d, mirror: c} = s,
						h = ya(i.grid),
						u = h + d,
						m = c ? -d : u,
						p = -qt(this.labelRotation),
						g = [];
					let f,
						v,
						b,
						k,
						x,
						L,
						_,
						y,
						w,
						C,
						S,
						A,
						M = "middle";
					if ("top" === n) (L = this.bottom - m), (_ = this._getXAxisLabelAlignment());
					else if ("bottom" === n) (L = this.top + m), (_ = this._getXAxisLabelAlignment());
					else if ("left" === n) {
						const t = this._getYAxisLabelAlignment(h);
						(_ = t.textAlign), (x = t.x);
					} else if ("right" === n) {
						const t = this._getYAxisLabelAlignment(h);
						(_ = t.textAlign), (x = t.x);
					} else if ("x" === e) {
						if ("center" === n) L = (t.top + t.bottom) / 2 + u;
						else if (ct(n)) {
							const t = Object.keys(n)[0],
								e = n[t];
							L = this.chart.scales[t].getPixelForValue(e) + u;
						}
						_ = this._getXAxisLabelAlignment();
					} else if ("y" === e) {
						if ("center" === n) x = (t.left + t.right) / 2 - u;
						else if (ct(n)) {
							const t = Object.keys(n)[0],
								e = n[t];
							x = this.chart.scales[t].getPixelForValue(e);
						}
						_ = this._getYAxisLabelAlignment(h).textAlign;
					}
					"y" === e && ("start" === r ? (M = "top") : "end" === r && (M = "bottom"));
					const F = this._getLabelSizes();
					for (f = 0, v = o.length; f < v; ++f) {
						(b = o[f]), (k = b.label);
						const t = s.setContext(this.getContext(f));
						(y = this.getPixelForTick(f) + s.labelOffset), (w = this._resolveTickFontOptions(f)), (C = w.lineHeight), (S = dt(k) ? k.length : 1);
						const e = S / 2,
							i = t.color,
							r = t.textStrokeColor,
							d = t.textStrokeWidth;
						let h,
							u = _;
						if (
							(a
								? ((x = y),
								  "inner" === _ && (u = f === v - 1 ? (this.options.reverse ? "left" : "right") : 0 === f ? (this.options.reverse ? "right" : "left") : "center"),
								  (A =
										"top" === n
											? "near" === l || 0 !== p
												? -S * C + C / 2
												: "center" === l
												? -F.highest.height / 2 - e * C + C
												: -F.highest.height + C / 2
											: "near" === l || 0 !== p
											? C / 2
											: "center" === l
											? F.highest.height / 2 - e * C
											: F.highest.height - S * C),
								  c && (A *= -1),
								  0 === p || t.showLabelBackdrop || (x += (C / 2) * Math.sin(p)))
								: ((L = y), (A = ((1 - S) * C) / 2)),
							t.showLabelBackdrop)
						) {
							const e = fi(t.backdropPadding),
								i = F.heights[f],
								n = F.widths[f];
							let s = A - e.top,
								a = 0 - e.left;
							switch (M) {
								case "middle":
									s -= i / 2;
									break;
								case "bottom":
									s -= i;
									break;
							}
							switch (_) {
								case "center":
									a -= n / 2;
									break;
								case "right":
									a -= n;
									break;
								case "inner":
									f === v - 1 ? (a -= n) : f > 0 && (a -= n / 2);
									break;
							}
							h = {left: a, top: s, width: n + e.width, height: i + e.height, color: t.backdropColor};
						}
						g.push({label: k, font: w, textOffset: A, options: {rotation: p, color: i, strokeColor: r, strokeWidth: d, textAlign: u, textBaseline: M, translation: [x, L], backdrop: h}});
					}
					return g;
				}
				_getXAxisLabelAlignment() {
					const {position: t, ticks: e} = this.options,
						i = -qt(this.labelRotation);
					if (i) return "top" === t ? "left" : "right";
					let n = "center";
					return "start" === e.align ? (n = "left") : "end" === e.align ? (n = "right") : "inner" === e.align && (n = "inner"), n;
				}
				_getYAxisLabelAlignment(t) {
					const {
							position: e,
							ticks: {crossAlign: i, mirror: n, padding: s},
						} = this.options,
						a = this._getLabelSizes(),
						o = t + s,
						r = a.widest.width;
					let l, d;
					return (
						"left" === e
							? n
								? ((d = this.right + s), "near" === i ? (l = "left") : "center" === i ? ((l = "center"), (d += r / 2)) : ((l = "right"), (d += r)))
								: ((d = this.right - o), "near" === i ? (l = "right") : "center" === i ? ((l = "center"), (d -= r / 2)) : ((l = "left"), (d = this.left)))
							: "right" === e
							? n
								? ((d = this.left + s), "near" === i ? (l = "right") : "center" === i ? ((l = "center"), (d -= r / 2)) : ((l = "left"), (d -= r)))
								: ((d = this.left + o), "near" === i ? (l = "left") : "center" === i ? ((l = "center"), (d += r / 2)) : ((l = "right"), (d = this.right)))
							: (l = "right"),
						{textAlign: l, x: d}
					);
				}
				_computeLabelArea() {
					if (this.options.ticks.mirror) return;
					const t = this.chart,
						e = this.options.position;
					return "left" === e || "right" === e
						? {top: 0, left: this.left, bottom: t.height, right: this.right}
						: "top" === e || "bottom" === e
						? {top: this.top, left: 0, bottom: this.bottom, right: t.width}
						: void 0;
				}
				drawBackground() {
					const {
						ctx: t,
						options: {backgroundColor: e},
						left: i,
						top: n,
						width: s,
						height: a,
					} = this;
					e && (t.save(), (t.fillStyle = e), t.fillRect(i, n, s, a), t.restore());
				}
				getLineWidthForValue(t) {
					const e = this.options.grid;
					if (!this._isVisible() || !e.display) return 0;
					const i = this.ticks,
						n = i.findIndex((e) => e.value === t);
					if (n >= 0) {
						const t = e.setContext(this.getContext(n));
						return t.lineWidth;
					}
					return 0;
				}
				drawGrid(t) {
					const e = this.options.grid,
						i = this.ctx,
						n = this._gridLineItems || (this._gridLineItems = this._computeGridLineItems(t));
					let s, a;
					const o = (t, e, n) => {
						n.width &&
							n.color &&
							(i.save(),
							(i.lineWidth = n.width),
							(i.strokeStyle = n.color),
							i.setLineDash(n.borderDash || []),
							(i.lineDashOffset = n.borderDashOffset),
							i.beginPath(),
							i.moveTo(t.x, t.y),
							i.lineTo(e.x, e.y),
							i.stroke(),
							i.restore());
					};
					if (e.display)
						for (s = 0, a = n.length; s < a; ++s) {
							const t = n[s];
							e.drawOnChartArea && o({x: t.x1, y: t.y1}, {x: t.x2, y: t.y2}, t),
								e.drawTicks && o({x: t.tx1, y: t.ty1}, {x: t.tx2, y: t.ty2}, {color: t.tickColor, width: t.tickWidth, borderDash: t.tickBorderDash, borderDashOffset: t.tickBorderDashOffset});
						}
				}
				drawBorder() {
					const {
							chart: t,
							ctx: e,
							options: {border: i, grid: n},
						} = this,
						s = i.setContext(this.getContext()),
						a = i.display ? s.width : 0;
					if (!a) return;
					const o = n.setContext(this.getContext(0)).lineWidth,
						r = this._borderValue;
					let l, d, c, h;
					this.isHorizontal()
						? ((l = Ke(t, this.left, a) - a / 2), (d = Ke(t, this.right, o) + o / 2), (c = h = r))
						: ((c = Ke(t, this.top, a) - a / 2), (h = Ke(t, this.bottom, o) + o / 2), (l = d = r)),
						e.save(),
						(e.lineWidth = s.width),
						(e.strokeStyle = s.color),
						e.beginPath(),
						e.moveTo(l, c),
						e.lineTo(d, h),
						e.stroke(),
						e.restore();
				}
				drawLabels(t) {
					const e = this.options.ticks;
					if (!e.display) return;
					const i = this.ctx,
						n = this._computeLabelArea();
					n && ti(i, n);
					const s = this.getLabelItems(t);
					for (const a of s) {
						const t = a.options,
							e = a.font,
							n = a.label,
							s = a.textOffset;
						ri(i, n, 0, s, e, t);
					}
					n && ei(i);
				}
				drawTitle() {
					const {
						ctx: t,
						options: {position: e, title: i, reverse: n},
					} = this;
					if (!i.display) return;
					const s = vi(i.font),
						a = fi(i.padding),
						o = i.align;
					let r = s.lineHeight / 2;
					"bottom" === e || "center" === e || ct(e) ? ((r += a.bottom), dt(i.text) && (r += s.lineHeight * (i.text.length - 1))) : (r += a.top);
					const {titleX: l, titleY: d, maxWidth: c, rotation: h} = Ma(this, r, e, o);
					ri(t, i.text, 0, 0, s, {color: i.color, maxWidth: c, rotation: h, textAlign: Aa(o, e, n), textBaseline: "middle", translation: [l, d]});
				}
				draw(t) {
					this._isVisible() && (this.drawBackground(), this.drawGrid(t), this.drawBorder(), this.drawTitle(), this.drawLabels(t));
				}
				_layers() {
					const t = this.options,
						e = (t.ticks && t.ticks.z) || 0,
						i = mt(t.grid && t.grid.z, -1),
						n = mt(t.border && t.border.z, 0);
					return this._isVisible() && this.draw === Fa.prototype.draw
						? [
								{
									z: i,
									draw: (t) => {
										this.drawBackground(), this.drawGrid(t), this.drawTitle();
									},
								},
								{
									z: n,
									draw: () => {
										this.drawBorder();
									},
								},
								{
									z: e,
									draw: (t) => {
										this.drawLabels(t);
									},
								},
						  ]
						: [
								{
									z: e,
									draw: (t) => {
										this.draw(t);
									},
								},
						  ];
				}
				getMatchingVisibleMetas(t) {
					const e = this.chart.getSortedVisibleDatasetMetas(),
						i = this.axis + "AxisID",
						n = [];
					let s, a;
					for (s = 0, a = e.length; s < a; ++s) {
						const a = e[s];
						a[i] !== this.id || (t && a.type !== t) || n.push(a);
					}
					return n;
				}
				_resolveTickFontOptions(t) {
					const e = this.options.ticks.setContext(this.getContext(t));
					return vi(e.font);
				}
				_maxDigits() {
					const t = this._resolveTickFontOptions(0).lineHeight;
					return (this.isHorizontal() ? this.width : this.height) / t;
				}
			}
			class Da {
				constructor(t, e, i) {
					(this.type = t), (this.scope = e), (this.override = i), (this.items = Object.create(null));
				}
				isForType(t) {
					return Object.prototype.isPrototypeOf.call(this.type.prototype, t.prototype);
				}
				register(t) {
					const e = Object.getPrototypeOf(t);
					let i;
					Pa(e) && (i = this.register(e));
					const n = this.items,
						s = t.id,
						a = this.scope + "." + s;
					if (!s) throw new Error("class does not have id: " + t);
					return s in n || ((n[s] = t), Ea(t, a, i), this.override && je.override(t.id, t.overrides)), a;
				}
				get(t) {
					return this.items[t];
				}
				unregister(t) {
					const e = this.items,
						i = t.id,
						n = this.scope;
					i in e && delete e[i], n && i in je[n] && (delete je[n][i], this.override && delete We[i]);
				}
			}
			function Ea(t, e, i) {
				const n = Lt(Object.create(null), [i ? je.get(i) : {}, je.get(e), t.defaults]);
				je.set(e, n), t.defaultRoutes && Ta(e, t.defaultRoutes), t.descriptors && je.describe(e, t.descriptors);
			}
			function Ta(t, e) {
				Object.keys(e).forEach((i) => {
					const n = i.split("."),
						s = n.pop(),
						a = [t].concat(n).join("."),
						o = e[i].split("."),
						r = o.pop(),
						l = o.join(".");
					je.route(a, s, l, r);
				});
			}
			function Pa(t) {
				return "id" in t && "defaults" in t;
			}
			class Ia {
				constructor() {
					(this.controllers = new Da(ds, "datasets", !0)),
						(this.elements = new Da(da, "elements")),
						(this.plugins = new Da(Object, "plugins")),
						(this.scales = new Da(Fa, "scales")),
						(this._typedRegistries = [this.controllers, this.scales, this.elements]);
				}
				add(...t) {
					this._each("register", t);
				}
				remove(...t) {
					this._each("unregister", t);
				}
				addControllers(...t) {
					this._each("register", t, this.controllers);
				}
				addElements(...t) {
					this._each("register", t, this.elements);
				}
				addPlugins(...t) {
					this._each("register", t, this.plugins);
				}
				addScales(...t) {
					this._each("register", t, this.scales);
				}
				getController(t) {
					return this._get(t, this.controllers, "controller");
				}
				getElement(t) {
					return this._get(t, this.elements, "element");
				}
				getPlugin(t) {
					return this._get(t, this.plugins, "plugin");
				}
				getScale(t) {
					return this._get(t, this.scales, "scale");
				}
				removeControllers(...t) {
					this._each("unregister", t, this.controllers);
				}
				removeElements(...t) {
					this._each("unregister", t, this.elements);
				}
				removePlugins(...t) {
					this._each("unregister", t, this.plugins);
				}
				removeScales(...t) {
					this._each("unregister", t, this.scales);
				}
				_each(t, e, i) {
					[...e].forEach((e) => {
						const n = i || this._getRegistryForType(e);
						i || n.isForType(e) || (n === this.plugins && e.id)
							? this._exec(t, n, e)
							: ft(e, (e) => {
									const n = i || this._getRegistryForType(e);
									this._exec(t, n, e);
							  });
					});
				}
				_exec(t, e, i) {
					const n = Mt(t);
					gt(i["before" + n], [], i), e[t](i), gt(i["after" + n], [], i);
				}
				_getRegistryForType(t) {
					for (let e = 0; e < this._typedRegistries.length; e++) {
						const i = this._typedRegistries[e];
						if (i.isForType(t)) return i;
					}
					return this.plugins;
				}
				_get(t, e, i) {
					const n = e.get(t);
					if (void 0 === n) throw new Error('"' + t + '" is not a registered ' + i + ".");
					return n;
				}
			}
			var Ba = new Ia();
			class Oa {
				constructor() {
					this._init = [];
				}
				notify(t, e, i, n) {
					"beforeInit" === e && ((this._init = this._createDescriptors(t, !0)), this._notify(this._init, t, "install"));
					const s = n ? this._descriptors(t).filter(n) : this._descriptors(t),
						a = this._notify(s, t, e, i);
					return "afterDestroy" === e && (this._notify(s, t, "stop"), this._notify(this._init, t, "uninstall")), a;
				}
				_notify(t, e, i, n) {
					n = n || {};
					for (const s of t) {
						const t = s.plugin,
							a = t[i],
							o = [e, n, s.options];
						if (!1 === gt(a, o, t) && n.cancelable) return !1;
					}
					return !0;
				}
				invalidate() {
					lt(this._cache) || ((this._oldCache = this._cache), (this._cache = void 0));
				}
				_descriptors(t) {
					if (this._cache) return this._cache;
					const e = (this._cache = this._createDescriptors(t));
					return this._notifyStateChanges(t), e;
				}
				_createDescriptors(t, e) {
					const i = t && t.config,
						n = mt(i.options && i.options.plugins, {}),
						s = Ra(i);
					return !1 !== n || e ? Na(t, s, n, e) : [];
				}
				_notifyStateChanges(t) {
					const e = this._oldCache || [],
						i = this._cache,
						n = (t, e) => t.filter((t) => !e.some((e) => t.plugin.id === e.plugin.id));
					this._notify(n(e, i), t, "stop"), this._notify(n(i, e), t, "start");
				}
			}
			function Ra(t) {
				const e = {},
					i = [],
					n = Object.keys(Ba.plugins.items);
				for (let a = 0; a < n.length; a++) i.push(Ba.getPlugin(n[a]));
				const s = t.plugins || [];
				for (let a = 0; a < s.length; a++) {
					const t = s[a];
					-1 === i.indexOf(t) && (i.push(t), (e[t.id] = !0));
				}
				return {plugins: i, localIds: e};
			}
			function Va(t, e) {
				return e || !1 !== t ? (!0 === t ? {} : t) : null;
			}
			function Na(t, {plugins: e, localIds: i}, n, s) {
				const a = [],
					o = t.getContext();
				for (const r of e) {
					const e = r.id,
						l = Va(n[e], s);
					null !== l && a.push({plugin: r, options: za(t.config, {plugin: r, local: i[e]}, l, o)});
				}
				return a;
			}
			function za(t, {plugin: e, local: i}, n, s) {
				const a = t.pluginScopeKeys(e),
					o = t.getOptionScopes(n, a);
				return i && e.defaults && o.push(e.defaults), t.createResolver(o, s, [""], {scriptable: !1, indexable: !1, allKeys: !0});
			}
			function Wa(t, e) {
				const i = je.datasets[t] || {},
					n = (e.datasets || {})[t] || {};
				return n.indexAxis || e.indexAxis || i.indexAxis || "x";
			}
			function Ha(t, e) {
				let i = t;
				return "_index_" === t ? (i = e) : "_value_" === t && (i = "x" === e ? "y" : "x"), i;
			}
			function Ua(t, e) {
				return t === e ? "_index_" : "_value_";
			}
			function Xa(t) {
				if ("x" === t || "y" === t || "r" === t) return t;
			}
			function Ga(t) {
				return "top" === t || "bottom" === t ? "x" : "left" === t || "right" === t ? "y" : void 0;
			}
			function ja(t, ...e) {
				if (Xa(t)) return t;
				for (const i of e) {
					const e = i.axis || Ga(i.position) || (t.length > 1 && Xa(t[0].toLowerCase()));
					if (e) return e;
				}
				throw new Error(`Cannot determine type of '${t}' axis. Please provide 'axis' or 'position' option.`);
			}
			function $a(t, e, i) {
				if (i[e + "AxisID"] === t) return {axis: e};
			}
			function Ya(t, e) {
				if (e.data && e.data.datasets) {
					const i = e.data.datasets.filter((e) => e.xAxisID === t || e.yAxisID === t);
					if (i.length) return $a(t, "x", i[0]) || $a(t, "y", i[0]);
				}
				return {};
			}
			function Ka(t, e) {
				const i = We[t.type] || {scales: {}},
					n = e.scales || {},
					s = Wa(t.type, e),
					a = Object.create(null);
				return (
					Object.keys(n).forEach((e) => {
						const o = n[e];
						if (!ct(o)) return console.error(`Invalid scale configuration for scale: ${e}`);
						if (o._proxy) return console.warn(`Ignoring resolver passed as options for scale: ${e}`);
						const r = ja(e, o, Ya(e, t), je.scales[o.type]),
							l = Ua(r, s),
							d = i.scales || {};
						a[e] = _t(Object.create(null), [{axis: r}, o, d[r], d[l]]);
					}),
					t.data.datasets.forEach((i) => {
						const s = i.type || t.type,
							o = i.indexAxis || Wa(s, e),
							r = We[s] || {},
							l = r.scales || {};
						Object.keys(l).forEach((t) => {
							const e = Ha(t, o),
								s = i[e + "AxisID"] || e;
							(a[s] = a[s] || Object.create(null)), _t(a[s], [{axis: e}, n[s], l[t]]);
						});
					}),
					Object.keys(a).forEach((t) => {
						const e = a[t];
						_t(e, [je.scales[e.type], je.scale]);
					}),
					a
				);
			}
			function qa(t) {
				const e = t.options || (t.options = {});
				(e.plugins = mt(e.plugins, {})), (e.scales = Ka(t, e));
			}
			function Ja(t) {
				return (t = t || {}), (t.datasets = t.datasets || []), (t.labels = t.labels || []), t;
			}
			function Za(t) {
				return (t = t || {}), (t.data = Ja(t.data)), qa(t), t;
			}
			const Qa = new Map(),
				to = new Set();
			function eo(t, e) {
				let i = Qa.get(t);
				return i || ((i = e()), Qa.set(t, i), to.add(i)), i;
			}
			const io = (t, e, i) => {
				const n = At(e, i);
				void 0 !== n && t.add(n);
			};
			class no {
				constructor(t) {
					(this._config = Za(t)), (this._scopeCache = new Map()), (this._resolverCache = new Map());
				}
				get platform() {
					return this._config.platform;
				}
				get type() {
					return this._config.type;
				}
				set type(t) {
					this._config.type = t;
				}
				get data() {
					return this._config.data;
				}
				set data(t) {
					this._config.data = Ja(t);
				}
				get options() {
					return this._config.options;
				}
				set options(t) {
					this._config.options = t;
				}
				get plugins() {
					return this._config.plugins;
				}
				update() {
					const t = this._config;
					this.clearCache(), qa(t);
				}
				clearCache() {
					this._scopeCache.clear(), this._resolverCache.clear();
				}
				datasetScopeKeys(t) {
					return eo(t, () => [[`datasets.${t}`, ""]]);
				}
				datasetAnimationScopeKeys(t, e) {
					return eo(`${t}.transition.${e}`, () => [
						[`datasets.${t}.transitions.${e}`, `transitions.${e}`],
						[`datasets.${t}`, ""],
					]);
				}
				datasetElementScopeKeys(t, e) {
					return eo(`${t}-${e}`, () => [[`datasets.${t}.elements.${e}`, `datasets.${t}`, `elements.${e}`, ""]]);
				}
				pluginScopeKeys(t) {
					const e = t.id,
						i = this.type;
					return eo(`${i}-plugin-${e}`, () => [[`plugins.${e}`, ...(t.additionalOptionScopes || [])]]);
				}
				_cachedScopes(t, e) {
					const i = this._scopeCache;
					let n = i.get(t);
					return (n && !e) || ((n = new Map()), i.set(t, n)), n;
				}
				getOptionScopes(t, e, i) {
					const {options: n, type: s} = this,
						a = this._cachedScopes(t, i),
						o = a.get(e);
					if (o) return o;
					const r = new Set();
					e.forEach((e) => {
						t && (r.add(t), e.forEach((e) => io(r, t, e))), e.forEach((t) => io(r, n, t)), e.forEach((t) => io(r, We[s] || {}, t)), e.forEach((t) => io(r, je, t)), e.forEach((t) => io(r, He, t));
					});
					const l = Array.from(r);
					return 0 === l.length && l.push(Object.create(null)), to.has(e) && a.set(e, l), l;
				}
				chartOptionScopes() {
					const {options: t, type: e} = this;
					return [t, We[e] || {}, je.datasets[e] || {}, {type: e}, je, He];
				}
				resolveNamedOptions(t, e, i, n = [""]) {
					const s = {$shared: !0},
						{resolver: a, subPrefixes: o} = so(this._resolverCache, t, n);
					let r = a;
					if (oo(a, e)) {
						(s.$shared = !1), (i = Dt(i) ? i() : i);
						const e = this.createResolver(t, i, o);
						r = _i(a, i, e);
					}
					for (const l of e) s[l] = r[l];
					return s;
				}
				createResolver(t, e, i = [""], n) {
					const {resolver: s} = so(this._resolverCache, t, i);
					return ct(e) ? _i(s, e, void 0, n) : s;
				}
			}
			function so(t, e, i) {
				let n = t.get(e);
				n || ((n = new Map()), t.set(e, n));
				const s = i.join();
				let a = n.get(s);
				if (!a) {
					const t = Li(e, i);
					(a = {resolver: t, subPrefixes: i.filter((t) => !t.toLowerCase().includes("hover"))}), n.set(s, a);
				}
				return a;
			}
			const ao = (t) => ct(t) && Object.getOwnPropertyNames(t).some((e) => Dt(t[e]));
			function oo(t, e) {
				const {isScriptable: i, isIndexable: n} = yi(t);
				for (const s of e) {
					const e = i(s),
						a = n(s),
						o = (a || e) && t[s];
					if ((e && (Dt(o) || ao(o))) || (a && dt(o))) return !0;
				}
				return !1;
			}
			var ro = "4.5.0";
			const lo = ["top", "bottom", "left", "right", "chartArea"];
			function co(t, e) {
				return "top" === t || "bottom" === t || (-1 === lo.indexOf(t) && "x" === e);
			}
			function ho(t, e) {
				return function (i, n) {
					return i[t] === n[t] ? i[e] - n[e] : i[t] - n[t];
				};
			}
			function uo(t) {
				const e = t.chart,
					i = e.options.animation;
				e.notifyPlugins("afterRender"), gt(i && i.onComplete, [t], e);
			}
			function mo(t) {
				const e = t.chart,
					i = e.options.animation;
				gt(i && i.onProgress, [t], e);
			}
			function po(t) {
				return qi() && "string" === typeof t ? (t = document.getElementById(t)) : t && t.length && (t = t[0]), t && t.canvas && (t = t.canvas), t;
			}
			const go = {},
				fo = (t) => {
					const e = po(t);
					return Object.values(go)
						.filter((t) => t.canvas === e)
						.pop();
				};
			function vo(t, e, i) {
				const n = Object.keys(t);
				for (const s of n) {
					const n = +s;
					if (n >= e) {
						const a = t[s];
						delete t[s], (i > 0 || n > e) && (t[n + i] = a);
					}
				}
			}
			function bo(t, e, i, n) {
				return i && "mouseout" !== t.type ? (n ? e : t) : null;
			}
			class ko {
				static defaults = je;
				static instances = go;
				static overrides = We;
				static registry = Ba;
				static version = ro;
				static getChart = fo;
				static register(...t) {
					Ba.add(...t), xo();
				}
				static unregister(...t) {
					Ba.remove(...t), xo();
				}
				constructor(t, e) {
					const i = (this.config = new no(e)),
						n = po(t),
						s = fo(n);
					if (s) throw new Error("Canvas is already in use. Chart with ID '" + s.id + "' must be destroyed before the canvas with ID '" + s.canvas.id + "' can be reused.");
					const a = i.createResolver(i.chartOptionScopes(), this.getContext());
					(this.platform = new (i.platform || la(n))()), this.platform.updateConfig(i);
					const o = this.platform.acquireContext(n, a.aspectRatio),
						r = o && o.canvas,
						l = r && r.height,
						d = r && r.width;
					(this.id = rt()),
						(this.ctx = o),
						(this.canvas = r),
						(this.width = d),
						(this.height = l),
						(this._options = a),
						(this._aspectRatio = this.aspectRatio),
						(this._layers = []),
						(this._metasets = []),
						(this._stacks = void 0),
						(this.boxes = []),
						(this.currentDevicePixelRatio = void 0),
						(this.chartArea = void 0),
						(this._active = []),
						(this._lastEvent = void 0),
						(this._listeners = {}),
						(this._responsiveListeners = void 0),
						(this._sortedMetasets = []),
						(this.scales = {}),
						(this._plugins = new Oa()),
						(this.$proxies = {}),
						(this._hiddenIndices = {}),
						(this.attached = !1),
						(this._animationsDisabled = void 0),
						(this.$context = void 0),
						(this._doResize = ve((t) => this.update(t), a.resizeDelay || 0)),
						(this._dataChanges = []),
						(go[this.id] = this),
						o && r
							? (Rn.listen(this, "complete", uo), Rn.listen(this, "progress", mo), this._initialize(), this.attached && this.update())
							: console.error("Failed to create chart: can't acquire context from the given item");
				}
				get aspectRatio() {
					const {
						options: {aspectRatio: t, maintainAspectRatio: e},
						width: i,
						height: n,
						_aspectRatio: s,
					} = this;
					return lt(t) ? (e && s ? s : n ? i / n : null) : t;
				}
				get data() {
					return this.config.data;
				}
				set data(t) {
					this.config.data = t;
				}
				get options() {
					return this._options;
				}
				set options(t) {
					this.config.options = t;
				}
				get registry() {
					return Ba;
				}
				_initialize() {
					return this.notifyPlugins("beforeInit"), this.options.responsive ? this.resize() : cn(this, this.options.devicePixelRatio), this.bindEvents(), this.notifyPlugins("afterInit"), this;
				}
				clear() {
					return qe(this.canvas, this.ctx), this;
				}
				stop() {
					return Rn.stop(this), this;
				}
				resize(t, e) {
					Rn.running(this) ? (this._resizeBeforeDraw = {width: t, height: e}) : this._resize(t, e);
				}
				_resize(t, e) {
					const i = this.options,
						n = this.canvas,
						s = i.maintainAspectRatio && this.aspectRatio,
						a = this.platform.getMaximumSize(n, t, e, s),
						o = i.devicePixelRatio || this.platform.getDevicePixelRatio(),
						r = this.width ? "resize" : "attach";
					(this.width = a.width),
						(this.height = a.height),
						(this._aspectRatio = this.aspectRatio),
						cn(this, o, !0) && (this.notifyPlugins("resize", {size: a}), gt(i.onResize, [this, a], this), this.attached && this._doResize(r) && this.render());
				}
				ensureScalesHaveIDs() {
					const t = this.options,
						e = t.scales || {};
					ft(e, (t, e) => {
						t.id = e;
					});
				}
				buildOrUpdateScales() {
					const t = this.options,
						e = t.scales,
						i = this.scales,
						n = Object.keys(i).reduce((t, e) => ((t[e] = !1), t), {});
					let s = [];
					e &&
						(s = s.concat(
							Object.keys(e).map((t) => {
								const i = e[t],
									n = ja(t, i),
									s = "r" === n,
									a = "x" === n;
								return {options: i, dposition: s ? "chartArea" : a ? "bottom" : "left", dtype: s ? "radialLinear" : a ? "category" : "linear"};
							})
						)),
						ft(s, (e) => {
							const s = e.options,
								a = s.id,
								o = ja(a, s),
								r = mt(s.type, e.dtype);
							(void 0 !== s.position && co(s.position, o) === co(e.dposition)) || (s.position = e.dposition), (n[a] = !0);
							let l = null;
							if (a in i && i[a].type === r) l = i[a];
							else {
								const t = Ba.getScale(r);
								(l = new t({id: a, type: r, ctx: this.ctx, chart: this})), (i[l.id] = l);
							}
							l.init(s, t);
						}),
						ft(n, (t, e) => {
							t || delete i[e];
						}),
						ft(i, (t) => {
							Ns.configure(this, t, t.options), Ns.addBox(this, t);
						});
				}
				_updateMetasets() {
					const t = this._metasets,
						e = this.data.datasets.length,
						i = t.length;
					if ((t.sort((t, e) => t.index - e.index), i > e)) {
						for (let t = e; t < i; ++t) this._destroyDatasetMeta(t);
						t.splice(e, i - e);
					}
					this._sortedMetasets = t.slice(0).sort(ho("order", "index"));
				}
				_removeUnreferencedMetasets() {
					const {
						_metasets: t,
						data: {datasets: e},
					} = this;
					t.length > e.length && delete this._stacks,
						t.forEach((t, i) => {
							0 === e.filter((e) => e === t._dataset).length && this._destroyDatasetMeta(i);
						});
				}
				buildOrUpdateControllers() {
					const t = [],
						e = this.data.datasets;
					let i, n;
					for (this._removeUnreferencedMetasets(), i = 0, n = e.length; i < n; i++) {
						const n = e[i];
						let s = this.getDatasetMeta(i);
						const a = n.type || this.config.type;
						if (
							(s.type && s.type !== a && (this._destroyDatasetMeta(i), (s = this.getDatasetMeta(i))),
							(s.type = a),
							(s.indexAxis = n.indexAxis || Wa(a, this.options)),
							(s.order = n.order || 0),
							(s.index = i),
							(s.label = "" + n.label),
							(s.visible = this.isDatasetVisible(i)),
							s.controller)
						)
							s.controller.updateIndex(i), s.controller.linkScales();
						else {
							const e = Ba.getController(a),
								{datasetElementType: n, dataElementType: o} = je.datasets[a];
							Object.assign(e, {dataElementType: Ba.getElement(o), datasetElementType: n && Ba.getElement(n)}), (s.controller = new e(this, i)), t.push(s.controller);
						}
					}
					return this._updateMetasets(), t;
				}
				_resetElements() {
					ft(
						this.data.datasets,
						(t, e) => {
							this.getDatasetMeta(e).controller.reset();
						},
						this
					);
				}
				reset() {
					this._resetElements(), this.notifyPlugins("reset");
				}
				update(t) {
					const e = this.config;
					e.update();
					const i = (this._options = e.createResolver(e.chartOptionScopes(), this.getContext())),
						n = (this._animationsDisabled = !i.animation);
					if ((this._updateScales(), this._checkEventBindings(), this._updateHiddenIndices(), this._plugins.invalidate(), !1 === this.notifyPlugins("beforeUpdate", {mode: t, cancelable: !0}))) return;
					const s = this.buildOrUpdateControllers();
					this.notifyPlugins("beforeElementsUpdate");
					let a = 0;
					for (let l = 0, d = this.data.datasets.length; l < d; l++) {
						const {controller: t} = this.getDatasetMeta(l),
							e = !n && -1 === s.indexOf(t);
						t.buildOrUpdateElements(e), (a = Math.max(+t.getMaxOverflow(), a));
					}
					(a = this._minPadding = i.layout.autoPadding ? a : 0),
						this._updateLayout(a),
						n ||
							ft(s, (t) => {
								t.reset();
							}),
						this._updateDatasets(t),
						this.notifyPlugins("afterUpdate", {mode: t}),
						this._layers.sort(ho("z", "_idx"));
					const {_active: o, _lastEvent: r} = this;
					r ? this._eventHandler(r, !0) : o.length && this._updateHoverStyles(o, o, !0), this.render();
				}
				_updateScales() {
					ft(this.scales, (t) => {
						Ns.removeBox(this, t);
					}),
						this.ensureScalesHaveIDs(),
						this.buildOrUpdateScales();
				}
				_checkEventBindings() {
					const t = this.options,
						e = new Set(Object.keys(this._listeners)),
						i = new Set(t.events);
					(Et(e, i) && !!this._responsiveListeners === t.responsive) || (this.unbindEvents(), this.bindEvents());
				}
				_updateHiddenIndices() {
					const {_hiddenIndices: t} = this,
						e = this._getUniformDataChanges() || [];
					for (const {method: i, start: n, count: s} of e) {
						const e = "_removeElements" === i ? -s : s;
						vo(t, n, e);
					}
				}
				_getUniformDataChanges() {
					const t = this._dataChanges;
					if (!t || !t.length) return;
					this._dataChanges = [];
					const e = this.data.datasets.length,
						i = (e) => new Set(t.filter((t) => t[0] === e).map((t, e) => e + "," + t.splice(1).join(","))),
						n = i(0);
					for (let s = 1; s < e; s++) if (!Et(n, i(s))) return;
					return Array.from(n)
						.map((t) => t.split(","))
						.map((t) => ({method: t[1], start: +t[2], count: +t[3]}));
				}
				_updateLayout(t) {
					if (!1 === this.notifyPlugins("beforeLayout", {cancelable: !0})) return;
					Ns.update(this, this.width, this.height, t);
					const e = this.chartArea,
						i = e.width <= 0 || e.height <= 0;
					(this._layers = []),
						ft(
							this.boxes,
							(t) => {
								(i && "chartArea" === t.position) || (t.configure && t.configure(), this._layers.push(...t._layers()));
							},
							this
						),
						this._layers.forEach((t, e) => {
							t._idx = e;
						}),
						this.notifyPlugins("afterLayout");
				}
				_updateDatasets(t) {
					if (!1 !== this.notifyPlugins("beforeDatasetsUpdate", {mode: t, cancelable: !0})) {
						for (let t = 0, e = this.data.datasets.length; t < e; ++t) this.getDatasetMeta(t).controller.configure();
						for (let e = 0, i = this.data.datasets.length; e < i; ++e) this._updateDataset(e, Dt(t) ? t({datasetIndex: e}) : t);
						this.notifyPlugins("afterDatasetsUpdate", {mode: t});
					}
				}
				_updateDataset(t, e) {
					const i = this.getDatasetMeta(t),
						n = {meta: i, index: t, mode: e, cancelable: !0};
					!1 !== this.notifyPlugins("beforeDatasetUpdate", n) && (i.controller._update(e), (n.cancelable = !1), this.notifyPlugins("afterDatasetUpdate", n));
				}
				render() {
					!1 !== this.notifyPlugins("beforeRender", {cancelable: !0}) && (Rn.has(this) ? this.attached && !Rn.running(this) && Rn.start(this) : (this.draw(), uo({chart: this})));
				}
				draw() {
					let t;
					if (this._resizeBeforeDraw) {
						const {width: t, height: e} = this._resizeBeforeDraw;
						(this._resizeBeforeDraw = null), this._resize(t, e);
					}
					if ((this.clear(), this.width <= 0 || this.height <= 0)) return;
					if (!1 === this.notifyPlugins("beforeDraw", {cancelable: !0})) return;
					const e = this._layers;
					for (t = 0; t < e.length && e[t].z <= 0; ++t) e[t].draw(this.chartArea);
					for (this._drawDatasets(); t < e.length; ++t) e[t].draw(this.chartArea);
					this.notifyPlugins("afterDraw");
				}
				_getSortedDatasetMetas(t) {
					const e = this._sortedMetasets,
						i = [];
					let n, s;
					for (n = 0, s = e.length; n < s; ++n) {
						const s = e[n];
						(t && !s.visible) || i.push(s);
					}
					return i;
				}
				getSortedVisibleDatasetMetas() {
					return this._getSortedDatasetMetas(!0);
				}
				_drawDatasets() {
					if (!1 === this.notifyPlugins("beforeDatasetsDraw", {cancelable: !0})) return;
					const t = this.getSortedVisibleDatasetMetas();
					for (let e = t.length - 1; e >= 0; --e) this._drawDataset(t[e]);
					this.notifyPlugins("afterDatasetsDraw");
				}
				_drawDataset(t) {
					const e = this.ctx,
						i = {meta: t, index: t.index, cancelable: !0},
						n = Bn(this, t);
					!1 !== this.notifyPlugins("beforeDatasetDraw", i) && (n && ti(e, n), t.controller.draw(), n && ei(e), (i.cancelable = !1), this.notifyPlugins("afterDatasetDraw", i));
				}
				isPointInArea(t) {
					return Qe(t, this.chartArea, this._minPadding);
				}
				getElementsAtEventForMode(t, e, i, n) {
					const s = _s.modes[e];
					return "function" === typeof s ? s(this, t, i, n) : [];
				}
				getDatasetMeta(t) {
					const e = this.data.datasets[t],
						i = this._metasets;
					let n = i.filter((t) => t && t._dataset === e).pop();
					return (
						n ||
							((n = {type: null, data: [], dataset: null, controller: null, hidden: null, xAxisID: null, yAxisID: null, order: (e && e.order) || 0, index: t, _dataset: e, _parsed: [], _sorted: !1}),
							i.push(n)),
						n
					);
				}
				getContext() {
					return this.$context || (this.$context = xi(null, {chart: this, type: "chart"}));
				}
				getVisibleDatasetCount() {
					return this.getSortedVisibleDatasetMetas().length;
				}
				isDatasetVisible(t) {
					const e = this.data.datasets[t];
					if (!e) return !1;
					const i = this.getDatasetMeta(t);
					return "boolean" === typeof i.hidden ? !i.hidden : !e.hidden;
				}
				setDatasetVisibility(t, e) {
					const i = this.getDatasetMeta(t);
					i.hidden = !e;
				}
				toggleDataVisibility(t) {
					this._hiddenIndices[t] = !this._hiddenIndices[t];
				}
				getDataVisibility(t) {
					return !this._hiddenIndices[t];
				}
				_updateVisibility(t, e, i) {
					const n = i ? "show" : "hide",
						s = this.getDatasetMeta(t),
						a = s.controller._resolveAnimations(void 0, n);
					Ft(e) ? ((s.data[e].hidden = !i), this.update()) : (this.setDatasetVisibility(t, i), a.update(s, {visible: i}), this.update((e) => (e.datasetIndex === t ? n : void 0)));
				}
				hide(t, e) {
					this._updateVisibility(t, e, !1);
				}
				show(t, e) {
					this._updateVisibility(t, e, !0);
				}
				_destroyDatasetMeta(t) {
					const e = this._metasets[t];
					e && e.controller && e.controller._destroy(), delete this._metasets[t];
				}
				_stop() {
					let t, e;
					for (this.stop(), Rn.remove(this), t = 0, e = this.data.datasets.length; t < e; ++t) this._destroyDatasetMeta(t);
				}
				destroy() {
					this.notifyPlugins("beforeDestroy");
					const {canvas: t, ctx: e} = this;
					this._stop(),
						this.config.clearCache(),
						t && (this.unbindEvents(), qe(t, e), this.platform.releaseContext(e), (this.canvas = null), (this.ctx = null)),
						delete go[this.id],
						this.notifyPlugins("afterDestroy");
				}
				toBase64Image(...t) {
					return this.canvas.toDataURL(...t);
				}
				bindEvents() {
					this.bindUserEvents(), this.options.responsive ? this.bindResponsiveEvents() : (this.attached = !0);
				}
				bindUserEvents() {
					const t = this._listeners,
						e = this.platform,
						i = (i, n) => {
							e.addEventListener(this, i, n), (t[i] = n);
						},
						n = (t, e, i) => {
							(t.offsetX = e), (t.offsetY = i), this._eventHandler(t);
						};
					ft(this.options.events, (t) => i(t, n));
				}
				bindResponsiveEvents() {
					this._responsiveListeners || (this._responsiveListeners = {});
					const t = this._responsiveListeners,
						e = this.platform,
						i = (i, n) => {
							e.addEventListener(this, i, n), (t[i] = n);
						},
						n = (i, n) => {
							t[i] && (e.removeEventListener(this, i, n), delete t[i]);
						},
						s = (t, e) => {
							this.canvas && this.resize(t, e);
						};
					let a;
					const o = () => {
						n("attach", o), (this.attached = !0), this.resize(), i("resize", s), i("detach", a);
					};
					(a = () => {
						(this.attached = !1), n("resize", s), this._stop(), this._resize(0, 0), i("attach", o);
					}),
						e.isAttached(this.canvas) ? o() : a();
				}
				unbindEvents() {
					ft(this._listeners, (t, e) => {
						this.platform.removeEventListener(this, e, t);
					}),
						(this._listeners = {}),
						ft(this._responsiveListeners, (t, e) => {
							this.platform.removeEventListener(this, e, t);
						}),
						(this._responsiveListeners = void 0);
				}
				updateHoverStyle(t, e, i) {
					const n = i ? "set" : "remove";
					let s, a, o, r;
					for ("dataset" === e && ((s = this.getDatasetMeta(t[0].datasetIndex)), s.controller["_" + n + "DatasetHoverStyle"]()), o = 0, r = t.length; o < r; ++o) {
						a = t[o];
						const e = a && this.getDatasetMeta(a.datasetIndex).controller;
						e && e[n + "HoverStyle"](a.element, a.datasetIndex, a.index);
					}
				}
				getActiveElements() {
					return this._active || [];
				}
				setActiveElements(t) {
					const e = this._active || [],
						i = t.map(({datasetIndex: t, index: e}) => {
							const i = this.getDatasetMeta(t);
							if (!i) throw new Error("No dataset found at index " + t);
							return {datasetIndex: t, element: i.data[e], index: e};
						}),
						n = !vt(i, e);
					n && ((this._active = i), (this._lastEvent = null), this._updateHoverStyles(i, e));
				}
				notifyPlugins(t, e, i) {
					return this._plugins.notify(this, t, e, i);
				}
				isPluginEnabled(t) {
					return 1 === this._plugins._cache.filter((e) => e.plugin.id === t).length;
				}
				_updateHoverStyles(t, e, i) {
					const n = this.options.hover,
						s = (t, e) => t.filter((t) => !e.some((e) => t.datasetIndex === e.datasetIndex && t.index === e.index)),
						a = s(e, t),
						o = i ? t : s(t, e);
					a.length && this.updateHoverStyle(a, n.mode, !1), o.length && n.mode && this.updateHoverStyle(o, n.mode, !0);
				}
				_eventHandler(t, e) {
					const i = {event: t, replay: e, cancelable: !0, inChartArea: this.isPointInArea(t)},
						n = (e) => (e.options.events || this.options.events).includes(t.native.type);
					if (!1 === this.notifyPlugins("beforeEvent", i, n)) return;
					const s = this._handleEvent(t, e, i.inChartArea);
					return (i.cancelable = !1), this.notifyPlugins("afterEvent", i, n), (s || i.changed) && this.render(), this;
				}
				_handleEvent(t, e, i) {
					const {_active: n = [], options: s} = this,
						a = e,
						o = this._getActiveElements(t, n, i, a),
						r = Tt(t),
						l = bo(t, this._lastEvent, i, r);
					i && ((this._lastEvent = null), gt(s.onHover, [t, o, this], this), r && gt(s.onClick, [t, o, this], this));
					const d = !vt(o, n);
					return (d || e) && ((this._active = o), this._updateHoverStyles(o, n, e)), (this._lastEvent = l), d;
				}
				_getActiveElements(t, e, i, n) {
					if ("mouseout" === t.type) return [];
					if (!i) return e;
					const s = this.options.hover;
					return this.getElementsAtEventForMode(t, s.mode, s, n);
				}
			}
			function xo() {
				return ft(ko.instances, (t) => t._plugins.invalidate());
			}
			function Lo(t, e, i = e) {
				(t.lineCap = mt(i.borderCapStyle, e.borderCapStyle)),
					t.setLineDash(mt(i.borderDash, e.borderDash)),
					(t.lineDashOffset = mt(i.borderDashOffset, e.borderDashOffset)),
					(t.lineJoin = mt(i.borderJoinStyle, e.borderJoinStyle)),
					(t.lineWidth = mt(i.borderWidth, e.borderWidth)),
					(t.strokeStyle = mt(i.borderColor, e.borderColor));
			}
			function _o(t, e, i) {
				t.lineTo(i.x, i.y);
			}
			function yo(t) {
				return t.stepped ? ii : t.tension || "monotone" === t.cubicInterpolationMode ? ni : _o;
			}
			function wo(t, e, i = {}) {
				const n = t.length,
					{start: s = 0, end: a = n - 1} = i,
					{start: o, end: r} = e,
					l = Math.max(s, o),
					d = Math.min(a, r),
					c = (s < o && a < o) || (s > r && a > r);
				return {count: n, start: l, loop: e.loop, ilen: d < l && !c ? n + d - l : d - l};
			}
			function Co(t, e, i, n) {
				const {points: s, options: a} = e,
					{count: o, start: r, loop: l, ilen: d} = wo(s, i, n),
					c = yo(a);
				let h,
					u,
					m,
					{move: p = !0, reverse: g} = n || {};
				for (h = 0; h <= d; ++h) (u = s[(r + (g ? d - h : h)) % o]), u.skip || (p ? (t.moveTo(u.x, u.y), (p = !1)) : c(t, m, u, g, a.stepped), (m = u));
				return l && ((u = s[(r + (g ? d : 0)) % o]), c(t, m, u, g, a.stepped)), !!l;
			}
			function So(t, e, i, n) {
				const s = e.points,
					{count: a, start: o, ilen: r} = wo(s, i, n),
					{move: l = !0, reverse: d} = n || {};
				let c,
					h,
					u,
					m,
					p,
					g,
					f = 0,
					v = 0;
				const b = (t) => (o + (d ? r - t : t)) % a,
					k = () => {
						m !== p && (t.lineTo(f, p), t.lineTo(f, m), t.lineTo(f, g));
					};
				for (l && ((h = s[b(0)]), t.moveTo(h.x, h.y)), c = 0; c <= r; ++c) {
					if (((h = s[b(c)]), h.skip)) continue;
					const e = h.x,
						i = h.y,
						n = 0 | e;
					n === u ? (i < m ? (m = i) : i > p && (p = i), (f = (v * f + e) / ++v)) : (k(), t.lineTo(e, i), (u = n), (v = 0), (m = p = i)), (g = i);
				}
				k();
			}
			function Ao(t) {
				const e = t.options,
					i = e.borderDash && e.borderDash.length,
					n = !t._decimated && !t._loop && !e.tension && "monotone" !== e.cubicInterpolationMode && !e.stepped && !i;
				return n ? So : Co;
			}
			function Mo(t) {
				return t.stepped ? pn : t.tension || "monotone" === t.cubicInterpolationMode ? gn : mn;
			}
			function Fo(t, e, i, n) {
				let s = e._path;
				s || ((s = e._path = new Path2D()), e.path(s, i, n) && s.closePath()), Lo(t, e.options), t.stroke(s);
			}
			function Do(t, e, i, n) {
				const {segments: s, options: a} = e,
					o = Ao(e);
				for (const r of s) Lo(t, a, r.style), t.beginPath(), o(t, e, r, {start: i, end: i + n - 1}) && t.closePath(), t.stroke();
			}
			const Eo = "function" === typeof Path2D;
			function To(t, e, i, n) {
				Eo && !e.options.segment ? Fo(t, e, i, n) : Do(t, e, i, n);
			}
			class Po extends da {
				static id = "line";
				static defaults = {
					borderCapStyle: "butt",
					borderDash: [],
					borderDashOffset: 0,
					borderJoinStyle: "miter",
					borderWidth: 3,
					capBezierPoints: !0,
					cubicInterpolationMode: "default",
					fill: !1,
					spanGaps: !1,
					stepped: !1,
					tension: 0,
				};
				static defaultRoutes = {backgroundColor: "backgroundColor", borderColor: "borderColor"};
				static descriptors = {_scriptable: !0, _indexable: (t) => "borderDash" !== t && "fill" !== t};
				constructor(t) {
					super(),
						(this.animated = !0),
						(this.options = void 0),
						(this._chart = void 0),
						(this._loop = void 0),
						(this._fullLoop = void 0),
						(this._path = void 0),
						(this._points = void 0),
						(this._segments = void 0),
						(this._decimated = !1),
						(this._pointsUpdated = !1),
						(this._datasetIndex = void 0),
						t && Object.assign(this, t);
				}
				updateControlPoints(t, e) {
					const i = this.options;
					if ((i.tension || "monotone" === i.cubicInterpolationMode) && !i.stepped && !this._pointsUpdated) {
						const n = i.spanGaps ? this._loop : this._fullLoop;
						Ki(this._points, i, t, n, e), (this._pointsUpdated = !0);
					}
				}
				set points(t) {
					(this._points = t), delete this._segments, delete this._path, (this._pointsUpdated = !1);
				}
				get points() {
					return this._points;
				}
				get segments() {
					return this._segments || (this._segments = Mn(this, this.options.segment));
				}
				first() {
					const t = this.segments,
						e = this.points;
					return t.length && e[t[0].start];
				}
				last() {
					const t = this.segments,
						e = this.points,
						i = t.length;
					return i && e[t[i - 1].end];
				}
				interpolate(t, e) {
					const i = this.options,
						n = t[e],
						s = this.points,
						a = Cn(this, {property: e, start: n, end: n});
					if (!a.length) return;
					const o = [],
						r = Mo(i);
					let l, d;
					for (l = 0, d = a.length; l < d; ++l) {
						const {start: d, end: c} = a[l],
							h = s[d],
							u = s[c];
						if (h === u) {
							o.push(h);
							continue;
						}
						const m = Math.abs((n - h[e]) / (u[e] - h[e])),
							p = r(h, u, m, i.stepped);
						(p[e] = t[e]), o.push(p);
					}
					return 1 === o.length ? o[0] : o;
				}
				pathSegment(t, e, i) {
					const n = Ao(this);
					return n(t, this, e, i);
				}
				path(t, e, i) {
					const n = this.segments,
						s = Ao(this);
					let a = this._loop;
					(e = e || 0), (i = i || this.points.length - e);
					for (const o of n) a &= s(t, this, o, {start: e, end: e + i - 1});
					return !!a;
				}
				draw(t, e, i, n) {
					const s = this.options || {},
						a = this.points || [];
					a.length && s.borderWidth && (t.save(), To(t, this, i, n), t.restore()), this.animated && ((this._pointsUpdated = !1), (this._path = void 0));
				}
			}
			function Io(t, e, i, n) {
				const s = t.options,
					{[i]: a} = t.getProps([i], n);
				return Math.abs(e - a) < s.radius + s.hitRadius;
			}
			class Bo extends da {
				static id = "point";
				parsed;
				skip;
				stop;
				static defaults = {borderWidth: 1, hitRadius: 1, hoverBorderWidth: 1, hoverRadius: 4, pointStyle: "circle", radius: 3, rotation: 0};
				static defaultRoutes = {backgroundColor: "backgroundColor", borderColor: "borderColor"};
				constructor(t) {
					super(), (this.options = void 0), (this.parsed = void 0), (this.skip = void 0), (this.stop = void 0), t && Object.assign(this, t);
				}
				inRange(t, e, i) {
					const n = this.options,
						{x: s, y: a} = this.getProps(["x", "y"], i);
					return Math.pow(t - s, 2) + Math.pow(e - a, 2) < Math.pow(n.hitRadius + n.radius, 2);
				}
				inXRange(t, e) {
					return Io(this, t, "x", e);
				}
				inYRange(t, e) {
					return Io(this, t, "y", e);
				}
				getCenterPoint(t) {
					const {x: e, y: i} = this.getProps(["x", "y"], t);
					return {x: e, y: i};
				}
				size(t) {
					t = t || this.options || {};
					let e = t.radius || 0;
					e = Math.max(e, (e && t.hoverRadius) || 0);
					const i = (e && t.borderWidth) || 0;
					return 2 * (e + i);
				}
				draw(t, e) {
					const i = this.options;
					this.skip ||
						i.radius < 0.1 ||
						!Qe(this, e, this.size(i) / 2) ||
						((t.strokeStyle = i.borderColor), (t.lineWidth = i.borderWidth), (t.fillStyle = i.backgroundColor), Je(t, i, this.x, this.y));
				}
				getRange() {
					const t = this.options || {};
					return t.radius + t.hitRadius;
				}
			}
			function Oo(t, e, i) {
				const n = t.segments,
					s = t.points,
					a = e.points,
					o = [];
				for (const r of n) {
					let {start: t, end: n} = r;
					n = No(t, n, s);
					const l = Ro(i, s[t], s[n], r.loop);
					if (!e.segments) {
						o.push({source: r, target: l, start: s[t], end: s[n]});
						continue;
					}
					const d = Cn(e, l);
					for (const e of d) {
						const t = Ro(i, a[e.start], a[e.end], e.loop),
							n = wn(r, s, t);
						for (const s of n) o.push({source: s, target: e, start: {[i]: zo(l, t, "start", Math.max)}, end: {[i]: zo(l, t, "end", Math.min)}});
					}
				}
				return o;
			}
			function Ro(t, e, i, n) {
				if (n) return;
				let s = e[t],
					a = i[t];
				return "angle" === t && ((s = ie(s)), (a = ie(a))), {property: t, start: s, end: a};
			}
			function Vo(t, e) {
				const {x: i = null, y: n = null} = t || {},
					s = e.points,
					a = [];
				return (
					e.segments.forEach(({start: t, end: e}) => {
						e = No(t, e, s);
						const o = s[t],
							r = s[e];
						null !== n ? (a.push({x: o.x, y: n}), a.push({x: r.x, y: n})) : null !== i && (a.push({x: i, y: o.y}), a.push({x: i, y: r.y}));
					}),
					a
				);
			}
			function No(t, e, i) {
				for (; e > t; e--) {
					const t = i[e];
					if (!isNaN(t.x) && !isNaN(t.y)) break;
				}
				return e;
			}
			function zo(t, e, i, n) {
				return t && e ? n(t[i], e[i]) : t ? t[i] : e ? e[i] : 0;
			}
			function Wo(t, e) {
				let i = [],
					n = !1;
				return dt(t) ? ((n = !0), (i = t)) : (i = Vo(t, e)), i.length ? new Po({points: i, options: {tension: 0}, _loop: n, _fullLoop: n}) : null;
			}
			function Ho(t) {
				return t && !1 !== t.fill;
			}
			function Uo(t, e, i) {
				const n = t[e];
				let s = n.fill;
				const a = [e];
				let o;
				if (!i) return s;
				while (!1 !== s && -1 === a.indexOf(s)) {
					if (!ht(s)) return s;
					if (((o = t[s]), !o)) return !1;
					if (o.visible) return s;
					a.push(s), (s = o.fill);
				}
				return !1;
			}
			function Xo(t, e, i) {
				const n = Yo(t);
				if (ct(n)) return !isNaN(n.value) && n;
				let s = parseFloat(n);
				return ht(s) && Math.floor(s) === s ? Go(n[0], e, s, i) : ["origin", "start", "end", "stack", "shape"].indexOf(n) >= 0 && n;
			}
			function Go(t, e, i, n) {
				return ("-" !== t && "+" !== t) || (i = e + i), !(i === e || i < 0 || i >= n) && i;
			}
			function jo(t, e) {
				let i = null;
				return "start" === t ? (i = e.bottom) : "end" === t ? (i = e.top) : ct(t) ? (i = e.getPixelForValue(t.value)) : e.getBasePixel && (i = e.getBasePixel()), i;
			}
			function $o(t, e, i) {
				let n;
				return (n = "start" === t ? i : "end" === t ? (e.options.reverse ? e.min : e.max) : ct(t) ? t.value : e.getBaseValue()), n;
			}
			function Yo(t) {
				const e = t.options,
					i = e.fill;
				let n = mt(i && i.target, i);
				return void 0 === n && (n = !!e.backgroundColor), !1 !== n && null !== n && (!0 === n ? "origin" : n);
			}
			function Ko(t) {
				const {scale: e, index: i, line: n} = t,
					s = [],
					a = n.segments,
					o = n.points,
					r = qo(e, i);
				r.push(Wo({x: null, y: e.bottom}, n));
				for (let l = 0; l < a.length; l++) {
					const t = a[l];
					for (let e = t.start; e <= t.end; e++) Jo(s, o[e], r);
				}
				return new Po({points: s, options: {}});
			}
			function qo(t, e) {
				const i = [],
					n = t.getMatchingVisibleMetas("line");
				for (let s = 0; s < n.length; s++) {
					const t = n[s];
					if (t.index === e) break;
					t.hidden || i.unshift(t.dataset);
				}
				return i;
			}
			function Jo(t, e, i) {
				const n = [];
				for (let s = 0; s < i.length; s++) {
					const a = i[s],
						{first: o, last: r, point: l} = Zo(a, e, "x");
					if (!(!l || (o && r)))
						if (o) n.unshift(l);
						else if ((t.push(l), !r)) break;
				}
				t.push(...n);
			}
			function Zo(t, e, i) {
				const n = t.interpolate(e, i);
				if (!n) return {};
				const s = n[i],
					a = t.segments,
					o = t.points;
				let r = !1,
					l = !1;
				for (let d = 0; d < a.length; d++) {
					const t = a[d],
						e = o[t.start][i],
						n = o[t.end][i];
					if (oe(s, e, n)) {
						(r = s === e), (l = s === n);
						break;
					}
				}
				return {first: r, last: l, point: n};
			}
			class Qo {
				constructor(t) {
					(this.x = t.x), (this.y = t.y), (this.radius = t.radius);
				}
				pathSegment(t, e, i) {
					const {x: n, y: s, radius: a} = this;
					return (e = e || {start: 0, end: It}), t.arc(n, s, a, e.end, e.start, !0), !i.bounds;
				}
				interpolate(t) {
					const {x: e, y: i, radius: n} = this,
						s = t.angle;
					return {x: e + Math.cos(s) * n, y: i + Math.sin(s) * n, angle: s};
				}
			}
			function tr(t) {
				const {chart: e, fill: i, line: n} = t;
				if (ht(i)) return er(e, i);
				if ("stack" === i) return Ko(t);
				if ("shape" === i) return !0;
				const s = ir(t);
				return s instanceof Qo ? s : Wo(s, n);
			}
			function er(t, e) {
				const i = t.getDatasetMeta(e),
					n = i && t.isDatasetVisible(e);
				return n ? i.dataset : null;
			}
			function ir(t) {
				const e = t.scale || {};
				return e.getPointPositionForValue ? sr(t) : nr(t);
			}
			function nr(t) {
				const {scale: e = {}, fill: i} = t,
					n = jo(i, e);
				if (ht(n)) {
					const t = e.isHorizontal();
					return {x: t ? n : null, y: t ? null : n};
				}
				return null;
			}
			function sr(t) {
				const {scale: e, fill: i} = t,
					n = e.options,
					s = e.getLabels().length,
					a = n.reverse ? e.max : e.min,
					o = $o(i, e, a),
					r = [];
				if (n.grid.circular) {
					const t = e.getPointPositionForValue(0, a);
					return new Qo({x: t.x, y: t.y, radius: e.getDistanceFromCenterForValue(o)});
				}
				for (let l = 0; l < s; ++l) r.push(e.getPointPositionForValue(l, o));
				return r;
			}
			function ar(t, e, i) {
				const n = tr(e),
					{chart: s, index: a, line: o, scale: r, axis: l} = e,
					d = o.options,
					c = d.fill,
					h = d.backgroundColor,
					{above: u = h, below: m = h} = c || {},
					p = s.getDatasetMeta(a),
					g = Bn(s, p);
				n && o.points.length && (ti(t, i), or(t, {line: o, target: n, above: u, below: m, area: i, scale: r, axis: l, clip: g}), ei(t));
			}
			function or(t, e) {
				const {line: i, target: n, above: s, below: a, area: o, scale: r, clip: l} = e,
					d = i._loop ? "angle" : e.axis;
				t.save();
				let c = a;
				a !== s &&
					("x" === d
						? (rr(t, n, o.top), dr(t, {line: i, target: n, color: s, scale: r, property: d, clip: l}), t.restore(), t.save(), rr(t, n, o.bottom))
						: "y" === d && (lr(t, n, o.left), dr(t, {line: i, target: n, color: a, scale: r, property: d, clip: l}), t.restore(), t.save(), lr(t, n, o.right), (c = s))),
					dr(t, {line: i, target: n, color: c, scale: r, property: d, clip: l}),
					t.restore();
			}
			function rr(t, e, i) {
				const {segments: n, points: s} = e;
				let a = !0,
					o = !1;
				t.beginPath();
				for (const r of n) {
					const {start: n, end: l} = r,
						d = s[n],
						c = s[No(n, l, s)];
					a ? (t.moveTo(d.x, d.y), (a = !1)) : (t.lineTo(d.x, i), t.lineTo(d.x, d.y)), (o = !!e.pathSegment(t, r, {move: o})), o ? t.closePath() : t.lineTo(c.x, i);
				}
				t.lineTo(e.first().x, i), t.closePath(), t.clip();
			}
			function lr(t, e, i) {
				const {segments: n, points: s} = e;
				let a = !0,
					o = !1;
				t.beginPath();
				for (const r of n) {
					const {start: n, end: l} = r,
						d = s[n],
						c = s[No(n, l, s)];
					a ? (t.moveTo(d.x, d.y), (a = !1)) : (t.lineTo(i, d.y), t.lineTo(d.x, d.y)), (o = !!e.pathSegment(t, r, {move: o})), o ? t.closePath() : t.lineTo(i, c.y);
				}
				t.lineTo(i, e.first().y), t.closePath(), t.clip();
			}
			function dr(t, e) {
				const {line: i, target: n, property: s, color: a, scale: o, clip: r} = e,
					l = Oo(i, n, s);
				for (const {source: d, target: c, start: h, end: u} of l) {
					const {style: {backgroundColor: e = a} = {}} = d,
						l = !0 !== n;
					t.save(), (t.fillStyle = e), cr(t, o, r, l && Ro(s, h, u)), t.beginPath();
					const m = !!i.pathSegment(t, d);
					let p;
					if (l) {
						m ? t.closePath() : hr(t, n, u, s);
						const e = !!n.pathSegment(t, c, {move: m, reverse: !0});
						(p = m && e), p || hr(t, n, h, s);
					}
					t.closePath(), t.fill(p ? "evenodd" : "nonzero"), t.restore();
				}
			}
			function cr(t, e, i, n) {
				const s = e.chart.chartArea,
					{property: a, start: o, end: r} = n || {};
				if ("x" === a || "y" === a) {
					let e, n, l, d;
					"x" === a ? ((e = o), (n = s.top), (l = r), (d = s.bottom)) : ((e = s.left), (n = o), (l = s.right), (d = r)),
						t.beginPath(),
						i && ((e = Math.max(e, i.left)), (l = Math.min(l, i.right)), (n = Math.max(n, i.top)), (d = Math.min(d, i.bottom))),
						t.rect(e, n, l - e, d - n),
						t.clip();
				}
			}
			function hr(t, e, i, n) {
				const s = e.interpolate(i, n);
				s && t.lineTo(s.x, s.y);
			}
			var ur = {
				id: "filler",
				afterDatasetsUpdate(t, e, i) {
					const n = (t.data.datasets || []).length,
						s = [];
					let a, o, r, l;
					for (o = 0; o < n; ++o)
						(a = t.getDatasetMeta(o)),
							(r = a.dataset),
							(l = null),
							r && r.options && r instanceof Po && (l = {visible: t.isDatasetVisible(o), index: o, fill: Xo(r, o, n), chart: t, axis: a.controller.options.indexAxis, scale: a.vScale, line: r}),
							(a.$filler = l),
							s.push(l);
					for (o = 0; o < n; ++o) (l = s[o]), l && !1 !== l.fill && (l.fill = Uo(s, o, i.propagate));
				},
				beforeDraw(t, e, i) {
					const n = "beforeDraw" === i.drawTime,
						s = t.getSortedVisibleDatasetMetas(),
						a = t.chartArea;
					for (let o = s.length - 1; o >= 0; --o) {
						const e = s[o].$filler;
						e && (e.line.updateControlPoints(a, e.axis), n && e.fill && ar(t.ctx, e, a));
					}
				},
				beforeDatasetsDraw(t, e, i) {
					if ("beforeDatasetsDraw" !== i.drawTime) return;
					const n = t.getSortedVisibleDatasetMetas();
					for (let s = n.length - 1; s >= 0; --s) {
						const e = n[s].$filler;
						Ho(e) && ar(t.ctx, e, t.chartArea);
					}
				},
				beforeDatasetDraw(t, e, i) {
					const n = e.meta.$filler;
					Ho(n) && "beforeDatasetDraw" === i.drawTime && ar(t.ctx, n, t.chartArea);
				},
				defaults: {propagate: !0, drawTime: "beforeDatasetDraw"},
			};
			const mr = (t, e) => {
					let {boxHeight: i = e, boxWidth: n = e} = t;
					return t.usePointStyle && ((i = Math.min(i, e)), (n = t.pointStyleWidth || Math.min(n, e))), {boxWidth: n, boxHeight: i, itemHeight: Math.max(e, i)};
				},
				pr = (t, e) => null !== t && null !== e && t.datasetIndex === e.datasetIndex && t.index === e.index;
			class gr extends da {
				constructor(t) {
					super(),
						(this._added = !1),
						(this.legendHitBoxes = []),
						(this._hoveredItem = null),
						(this.doughnutMode = !1),
						(this.chart = t.chart),
						(this.options = t.options),
						(this.ctx = t.ctx),
						(this.legendItems = void 0),
						(this.columnSizes = void 0),
						(this.lineWidths = void 0),
						(this.maxHeight = void 0),
						(this.maxWidth = void 0),
						(this.top = void 0),
						(this.bottom = void 0),
						(this.left = void 0),
						(this.right = void 0),
						(this.height = void 0),
						(this.width = void 0),
						(this._margins = void 0),
						(this.position = void 0),
						(this.weight = void 0),
						(this.fullSize = void 0);
				}
				update(t, e, i) {
					(this.maxWidth = t), (this.maxHeight = e), (this._margins = i), this.setDimensions(), this.buildLabels(), this.fit();
				}
				setDimensions() {
					this.isHorizontal()
						? ((this.width = this.maxWidth), (this.left = this._margins.left), (this.right = this.width))
						: ((this.height = this.maxHeight), (this.top = this._margins.top), (this.bottom = this.height));
				}
				buildLabels() {
					const t = this.options.labels || {};
					let e = gt(t.generateLabels, [this.chart], this) || [];
					t.filter && (e = e.filter((e) => t.filter(e, this.chart.data))), t.sort && (e = e.sort((e, i) => t.sort(e, i, this.chart.data))), this.options.reverse && e.reverse(), (this.legendItems = e);
				}
				fit() {
					const {options: t, ctx: e} = this;
					if (!t.display) return void (this.width = this.height = 0);
					const i = t.labels,
						n = vi(i.font),
						s = n.size,
						a = this._computeTitleHeight(),
						{boxWidth: o, itemHeight: r} = mr(i, s);
					let l, d;
					(e.font = n.string),
						this.isHorizontal() ? ((l = this.maxWidth), (d = this._fitRows(a, s, o, r) + 10)) : ((d = this.maxHeight), (l = this._fitCols(a, n, o, r) + 10)),
						(this.width = Math.min(l, t.maxWidth || this.maxWidth)),
						(this.height = Math.min(d, t.maxHeight || this.maxHeight));
				}
				_fitRows(t, e, i, n) {
					const {
							ctx: s,
							maxWidth: a,
							options: {
								labels: {padding: o},
							},
						} = this,
						r = (this.legendHitBoxes = []),
						l = (this.lineWidths = [0]),
						d = n + o;
					let c = t;
					(s.textAlign = "left"), (s.textBaseline = "middle");
					let h = -1,
						u = -d;
					return (
						this.legendItems.forEach((t, m) => {
							const p = i + e / 2 + s.measureText(t.text).width;
							(0 === m || l[l.length - 1] + p + 2 * o > a) && ((c += d), (l[l.length - (m > 0 ? 0 : 1)] = 0), (u += d), h++),
								(r[m] = {left: 0, top: u, row: h, width: p, height: n}),
								(l[l.length - 1] += p + o);
						}),
						c
					);
				}
				_fitCols(t, e, i, n) {
					const {
							ctx: s,
							maxHeight: a,
							options: {
								labels: {padding: o},
							},
						} = this,
						r = (this.legendHitBoxes = []),
						l = (this.columnSizes = []),
						d = a - t;
					let c = o,
						h = 0,
						u = 0,
						m = 0,
						p = 0;
					return (
						this.legendItems.forEach((t, a) => {
							const {itemWidth: g, itemHeight: f} = fr(i, e, s, t, n);
							a > 0 && u + f + 2 * o > d && ((c += h + o), l.push({width: h, height: u}), (m += h + o), p++, (h = u = 0)),
								(r[a] = {left: m, top: u, col: p, width: g, height: f}),
								(h = Math.max(h, g)),
								(u += f + o);
						}),
						(c += h),
						l.push({width: h, height: u}),
						c
					);
				}
				adjustHitBoxes() {
					if (!this.options.display) return;
					const t = this._computeTitleHeight(),
						{
							legendHitBoxes: e,
							options: {
								align: i,
								labels: {padding: n},
								rtl: s,
							},
						} = this,
						a = bn(s, this.left, this.width);
					if (this.isHorizontal()) {
						let s = 0,
							o = ke(i, this.left + n, this.right - this.lineWidths[s]);
						for (const r of e)
							s !== r.row && ((s = r.row), (o = ke(i, this.left + n, this.right - this.lineWidths[s]))), (r.top += this.top + t + n), (r.left = a.leftForLtr(a.x(o), r.width)), (o += r.width + n);
					} else {
						let s = 0,
							o = ke(i, this.top + t + n, this.bottom - this.columnSizes[s].height);
						for (const r of e)
							r.col !== s && ((s = r.col), (o = ke(i, this.top + t + n, this.bottom - this.columnSizes[s].height))),
								(r.top = o),
								(r.left += this.left + n),
								(r.left = a.leftForLtr(a.x(r.left), r.width)),
								(o += r.height + n);
					}
				}
				isHorizontal() {
					return "top" === this.options.position || "bottom" === this.options.position;
				}
				draw() {
					if (this.options.display) {
						const t = this.ctx;
						ti(t, this), this._draw(), ei(t);
					}
				}
				_draw() {
					const {options: t, columnSizes: e, lineWidths: i, ctx: n} = this,
						{align: s, labels: a} = t,
						o = je.color,
						r = bn(t.rtl, this.left, this.width),
						l = vi(a.font),
						{padding: d} = a,
						c = l.size,
						h = c / 2;
					let u;
					this.drawTitle(), (n.textAlign = r.textAlign("left")), (n.textBaseline = "middle"), (n.lineWidth = 0.5), (n.font = l.string);
					const {boxWidth: m, boxHeight: p, itemHeight: g} = mr(a, c),
						f = function (t, e, i) {
							if (isNaN(m) || m <= 0 || isNaN(p) || p < 0) return;
							n.save();
							const s = mt(i.lineWidth, 1);
							if (
								((n.fillStyle = mt(i.fillStyle, o)),
								(n.lineCap = mt(i.lineCap, "butt")),
								(n.lineDashOffset = mt(i.lineDashOffset, 0)),
								(n.lineJoin = mt(i.lineJoin, "miter")),
								(n.lineWidth = s),
								(n.strokeStyle = mt(i.strokeStyle, o)),
								n.setLineDash(mt(i.lineDash, [])),
								a.usePointStyle)
							) {
								const o = {radius: (p * Math.SQRT2) / 2, pointStyle: i.pointStyle, rotation: i.rotation, borderWidth: s},
									l = r.xPlus(t, m / 2),
									d = e + h;
								Ze(n, o, l, d, a.pointStyleWidth && m);
							} else {
								const a = e + Math.max((c - p) / 2, 0),
									o = r.leftForLtr(t, m),
									l = gi(i.borderRadius);
								n.beginPath(), Object.values(l).some((t) => 0 !== t) ? li(n, {x: o, y: a, w: m, h: p, radius: l}) : n.rect(o, a, m, p), n.fill(), 0 !== s && n.stroke();
							}
							n.restore();
						},
						v = function (t, e, i) {
							ri(n, i.text, t, e + g / 2, l, {strikethrough: i.hidden, textAlign: r.textAlign(i.textAlign)});
						},
						b = this.isHorizontal(),
						k = this._computeTitleHeight();
					(u = b ? {x: ke(s, this.left + d, this.right - i[0]), y: this.top + d + k, line: 0} : {x: this.left + d, y: ke(s, this.top + k + d, this.bottom - e[0].height), line: 0}),
						kn(this.ctx, t.textDirection);
					const x = g + d;
					this.legendItems.forEach((o, c) => {
						(n.strokeStyle = o.fontColor), (n.fillStyle = o.fontColor);
						const p = n.measureText(o.text).width,
							g = r.textAlign(o.textAlign || (o.textAlign = a.textAlign)),
							L = m + h + p;
						let _ = u.x,
							y = u.y;
						r.setWidth(this.width),
							b
								? c > 0 && _ + L + d > this.right && ((y = u.y += x), u.line++, (_ = u.x = ke(s, this.left + d, this.right - i[u.line])))
								: c > 0 && y + x > this.bottom && ((_ = u.x = _ + e[u.line].width + d), u.line++, (y = u.y = ke(s, this.top + k + d, this.bottom - e[u.line].height)));
						const w = r.x(_);
						if ((f(w, y, o), (_ = xe(g, _ + m + h, b ? _ + L : this.right, t.rtl)), v(r.x(_), y, o), b)) u.x += L + d;
						else if ("string" !== typeof o.text) {
							const t = l.lineHeight;
							u.y += kr(o, t) + d;
						} else u.y += x;
					}),
						xn(this.ctx, t.textDirection);
				}
				drawTitle() {
					const t = this.options,
						e = t.title,
						i = vi(e.font),
						n = fi(e.padding);
					if (!e.display) return;
					const s = bn(t.rtl, this.left, this.width),
						a = this.ctx,
						o = e.position,
						r = i.size / 2,
						l = n.top + r;
					let d,
						c = this.left,
						h = this.width;
					if (this.isHorizontal()) (h = Math.max(...this.lineWidths)), (d = this.top + l), (c = ke(t.align, c, this.right - h));
					else {
						const e = this.columnSizes.reduce((t, e) => Math.max(t, e.height), 0);
						d = l + ke(t.align, this.top, this.bottom - e - t.labels.padding - this._computeTitleHeight());
					}
					const u = ke(o, c, c + h);
					(a.textAlign = s.textAlign(be(o))), (a.textBaseline = "middle"), (a.strokeStyle = e.color), (a.fillStyle = e.color), (a.font = i.string), ri(a, e.text, u, d, i);
				}
				_computeTitleHeight() {
					const t = this.options.title,
						e = vi(t.font),
						i = fi(t.padding);
					return t.display ? e.lineHeight + i.height : 0;
				}
				_getLegendItemAt(t, e) {
					let i, n, s;
					if (oe(t, this.left, this.right) && oe(e, this.top, this.bottom))
						for (s = this.legendHitBoxes, i = 0; i < s.length; ++i) if (((n = s[i]), oe(t, n.left, n.left + n.width) && oe(e, n.top, n.top + n.height))) return this.legendItems[i];
					return null;
				}
				handleEvent(t) {
					const e = this.options;
					if (!xr(t.type, e)) return;
					const i = this._getLegendItemAt(t.x, t.y);
					if ("mousemove" === t.type || "mouseout" === t.type) {
						const n = this._hoveredItem,
							s = pr(n, i);
						n && !s && gt(e.onLeave, [t, n, this], this), (this._hoveredItem = i), i && !s && gt(e.onHover, [t, i, this], this);
					} else i && gt(e.onClick, [t, i, this], this);
				}
			}
			function fr(t, e, i, n, s) {
				const a = vr(n, t, e, i),
					o = br(s, n, e.lineHeight);
				return {itemWidth: a, itemHeight: o};
			}
			function vr(t, e, i, n) {
				let s = t.text;
				return s && "string" !== typeof s && (s = s.reduce((t, e) => (t.length > e.length ? t : e))), e + i.size / 2 + n.measureText(s).width;
			}
			function br(t, e, i) {
				let n = t;
				return "string" !== typeof e.text && (n = kr(e, i)), n;
			}
			function kr(t, e) {
				const i = t.text ? t.text.length : 0;
				return e * i;
			}
			function xr(t, e) {
				return !(("mousemove" !== t && "mouseout" !== t) || (!e.onHover && !e.onLeave)) || !(!e.onClick || ("click" !== t && "mouseup" !== t));
			}
			var Lr = {
				id: "legend",
				_element: gr,
				start(t, e, i) {
					const n = (t.legend = new gr({ctx: t.ctx, options: i, chart: t}));
					Ns.configure(t, n, i), Ns.addBox(t, n);
				},
				stop(t) {
					Ns.removeBox(t, t.legend), delete t.legend;
				},
				beforeUpdate(t, e, i) {
					const n = t.legend;
					Ns.configure(t, n, i), (n.options = i);
				},
				afterUpdate(t) {
					const e = t.legend;
					e.buildLabels(), e.adjustHitBoxes();
				},
				afterEvent(t, e) {
					e.replay || t.legend.handleEvent(e.event);
				},
				defaults: {
					display: !0,
					position: "top",
					align: "center",
					fullSize: !0,
					reverse: !1,
					weight: 1e3,
					onClick(t, e, i) {
						const n = e.datasetIndex,
							s = i.chart;
						s.isDatasetVisible(n) ? (s.hide(n), (e.hidden = !0)) : (s.show(n), (e.hidden = !1));
					},
					onHover: null,
					onLeave: null,
					labels: {
						color: (t) => t.chart.options.color,
						boxWidth: 40,
						padding: 10,
						generateLabels(t) {
							const e = t.data.datasets,
								{
									labels: {usePointStyle: i, pointStyle: n, textAlign: s, color: a, useBorderRadius: o, borderRadius: r},
								} = t.legend.options;
							return t._getSortedDatasetMetas().map((t) => {
								const l = t.controller.getStyle(i ? 0 : void 0),
									d = fi(l.borderWidth);
								return {
									text: e[t.index].label,
									fillStyle: l.backgroundColor,
									fontColor: a,
									hidden: !t.visible,
									lineCap: l.borderCapStyle,
									lineDash: l.borderDash,
									lineDashOffset: l.borderDashOffset,
									lineJoin: l.borderJoinStyle,
									lineWidth: (d.width + d.height) / 4,
									strokeStyle: l.borderColor,
									pointStyle: n || l.pointStyle,
									rotation: l.rotation,
									textAlign: s || l.textAlign,
									borderRadius: o && (r || l.borderRadius),
									datasetIndex: t.index,
								};
							}, this);
						},
					},
					title: {color: (t) => t.chart.options.color, display: !1, position: "center", text: ""},
				},
				descriptors: {_scriptable: (t) => !t.startsWith("on"), labels: {_scriptable: (t) => !["generateLabels", "filter", "sort"].includes(t)}},
			};
			class _r extends da {
				constructor(t) {
					super(),
						(this.chart = t.chart),
						(this.options = t.options),
						(this.ctx = t.ctx),
						(this._padding = void 0),
						(this.top = void 0),
						(this.bottom = void 0),
						(this.left = void 0),
						(this.right = void 0),
						(this.width = void 0),
						(this.height = void 0),
						(this.position = void 0),
						(this.weight = void 0),
						(this.fullSize = void 0);
				}
				update(t, e) {
					const i = this.options;
					if (((this.left = 0), (this.top = 0), !i.display)) return void (this.width = this.height = this.right = this.bottom = 0);
					(this.width = this.right = t), (this.height = this.bottom = e);
					const n = dt(i.text) ? i.text.length : 1;
					this._padding = fi(i.padding);
					const s = n * vi(i.font).lineHeight + this._padding.height;
					this.isHorizontal() ? (this.height = s) : (this.width = s);
				}
				isHorizontal() {
					const t = this.options.position;
					return "top" === t || "bottom" === t;
				}
				_drawArgs(t) {
					const {top: e, left: i, bottom: n, right: s, options: a} = this,
						o = a.align;
					let r,
						l,
						d,
						c = 0;
					return (
						this.isHorizontal()
							? ((l = ke(o, i, s)), (d = e + t), (r = s - i))
							: ("left" === a.position ? ((l = i + t), (d = ke(o, n, e)), (c = -0.5 * Pt)) : ((l = s - t), (d = ke(o, e, n)), (c = 0.5 * Pt)), (r = n - e)),
						{titleX: l, titleY: d, maxWidth: r, rotation: c}
					);
				}
				draw() {
					const t = this.ctx,
						e = this.options;
					if (!e.display) return;
					const i = vi(e.font),
						n = i.lineHeight,
						s = n / 2 + this._padding.top,
						{titleX: a, titleY: o, maxWidth: r, rotation: l} = this._drawArgs(s);
					ri(t, e.text, 0, 0, i, {color: e.color, maxWidth: r, rotation: l, textAlign: be(e.align), textBaseline: "middle", translation: [a, o]});
				}
			}
			function yr(t, e) {
				const i = new _r({ctx: t.ctx, options: e, chart: t});
				Ns.configure(t, i, e), Ns.addBox(t, i), (t.titleBlock = i);
			}
			var wr = {
				id: "title",
				_element: _r,
				start(t, e, i) {
					yr(t, i);
				},
				stop(t) {
					const e = t.titleBlock;
					Ns.removeBox(t, e), delete t.titleBlock;
				},
				beforeUpdate(t, e, i) {
					const n = t.titleBlock;
					Ns.configure(t, n, i), (n.options = i);
				},
				defaults: {align: "center", display: !1, font: {weight: "bold"}, fullSize: !0, padding: 10, position: "top", text: "", weight: 2e3},
				defaultRoutes: {color: "color"},
				descriptors: {_scriptable: !0, _indexable: !1},
			};
			new WeakMap();
			const Cr = {
				average(t) {
					if (!t.length) return !1;
					let e,
						i,
						n = new Set(),
						s = 0,
						a = 0;
					for (e = 0, i = t.length; e < i; ++e) {
						const i = t[e].element;
						if (i && i.hasValue()) {
							const t = i.tooltipPosition();
							n.add(t.x), (s += t.y), ++a;
						}
					}
					if (0 === a || 0 === n.size) return !1;
					const o = [...n].reduce((t, e) => t + e) / n.size;
					return {x: o, y: s / a};
				},
				nearest(t, e) {
					if (!t.length) return !1;
					let i,
						n,
						s,
						a = e.x,
						o = e.y,
						r = Number.POSITIVE_INFINITY;
					for (i = 0, n = t.length; i < n; ++i) {
						const n = t[i].element;
						if (n && n.hasValue()) {
							const t = n.getCenterPoint(),
								i = te(e, t);
							i < r && ((r = i), (s = n));
						}
					}
					if (s) {
						const t = s.tooltipPosition();
						(a = t.x), (o = t.y);
					}
					return {x: a, y: o};
				},
			};
			function Sr(t, e) {
				return e && (dt(e) ? Array.prototype.push.apply(t, e) : t.push(e)), t;
			}
			function Ar(t) {
				return ("string" === typeof t || t instanceof String) && t.indexOf("\n") > -1 ? t.split("\n") : t;
			}
			function Mr(t, e) {
				const {element: i, datasetIndex: n, index: s} = e,
					a = t.getDatasetMeta(n).controller,
					{label: o, value: r} = a.getLabelAndValue(s);
				return {chart: t, label: o, parsed: a.getParsed(s), raw: t.data.datasets[n].data[s], formattedValue: r, dataset: a.getDataset(), dataIndex: s, datasetIndex: n, element: i};
			}
			function Fr(t, e) {
				const i = t.chart.ctx,
					{body: n, footer: s, title: a} = t,
					{boxWidth: o, boxHeight: r} = e,
					l = vi(e.bodyFont),
					d = vi(e.titleFont),
					c = vi(e.footerFont),
					h = a.length,
					u = s.length,
					m = n.length,
					p = fi(e.padding);
				let g = p.height,
					f = 0,
					v = n.reduce((t, e) => t + e.before.length + e.lines.length + e.after.length, 0);
				if (((v += t.beforeBody.length + t.afterBody.length), h && (g += h * d.lineHeight + (h - 1) * e.titleSpacing + e.titleMarginBottom), v)) {
					const t = e.displayColors ? Math.max(r, l.lineHeight) : l.lineHeight;
					g += m * t + (v - m) * l.lineHeight + (v - 1) * e.bodySpacing;
				}
				u && (g += e.footerMarginTop + u * c.lineHeight + (u - 1) * e.footerSpacing);
				let b = 0;
				const k = function (t) {
					f = Math.max(f, i.measureText(t).width + b);
				};
				return (
					i.save(),
					(i.font = d.string),
					ft(t.title, k),
					(i.font = l.string),
					ft(t.beforeBody.concat(t.afterBody), k),
					(b = e.displayColors ? o + 2 + e.boxPadding : 0),
					ft(n, (t) => {
						ft(t.before, k), ft(t.lines, k), ft(t.after, k);
					}),
					(b = 0),
					(i.font = c.string),
					ft(t.footer, k),
					i.restore(),
					(f += p.width),
					{width: f, height: g}
				);
			}
			function Dr(t, e) {
				const {y: i, height: n} = e;
				return i < n / 2 ? "top" : i > t.height - n / 2 ? "bottom" : "center";
			}
			function Er(t, e, i, n) {
				const {x: s, width: a} = n,
					o = i.caretSize + i.caretPadding;
				return ("left" === t && s + a + o > e.width) || ("right" === t && s - a - o < 0) || void 0;
			}
			function Tr(t, e, i, n) {
				const {x: s, width: a} = i,
					{
						width: o,
						chartArea: {left: r, right: l},
					} = t;
				let d = "center";
				return "center" === n ? (d = s <= (r + l) / 2 ? "left" : "right") : s <= a / 2 ? (d = "left") : s >= o - a / 2 && (d = "right"), Er(d, t, e, i) && (d = "center"), d;
			}
			function Pr(t, e, i) {
				const n = i.yAlign || e.yAlign || Dr(t, i);
				return {xAlign: i.xAlign || e.xAlign || Tr(t, e, i, n), yAlign: n};
			}
			function Ir(t, e) {
				let {x: i, width: n} = t;
				return "right" === e ? (i -= n) : "center" === e && (i -= n / 2), i;
			}
			function Br(t, e, i) {
				let {y: n, height: s} = t;
				return "top" === e ? (n += i) : (n -= "bottom" === e ? s + i : s / 2), n;
			}
			function Or(t, e, i, n) {
				const {caretSize: s, caretPadding: a, cornerRadius: o} = t,
					{xAlign: r, yAlign: l} = i,
					d = s + a,
					{topLeft: c, topRight: h, bottomLeft: u, bottomRight: m} = gi(o);
				let p = Ir(e, r);
				const g = Br(e, l, d);
				return (
					"center" === l ? ("left" === r ? (p += d) : "right" === r && (p -= d)) : "left" === r ? (p -= Math.max(c, u) + s) : "right" === r && (p += Math.max(h, m) + s),
					{x: se(p, 0, n.width - e.width), y: se(g, 0, n.height - e.height)}
				);
			}
			function Rr(t, e, i) {
				const n = fi(i.padding);
				return "center" === e ? t.x + t.width / 2 : "right" === e ? t.x + t.width - n.right : t.x + n.left;
			}
			function Vr(t) {
				return Sr([], Ar(t));
			}
			function Nr(t, e, i) {
				return xi(t, {tooltip: e, tooltipItems: i, type: "tooltip"});
			}
			function zr(t, e) {
				const i = e && e.dataset && e.dataset.tooltip && e.dataset.tooltip.callbacks;
				return i ? t.override(i) : t;
			}
			const Wr = {
				beforeTitle: ot,
				title(t) {
					if (t.length > 0) {
						const e = t[0],
							i = e.chart.data.labels,
							n = i ? i.length : 0;
						if (this && this.options && "dataset" === this.options.mode) return e.dataset.label || "";
						if (e.label) return e.label;
						if (n > 0 && e.dataIndex < n) return i[e.dataIndex];
					}
					return "";
				},
				afterTitle: ot,
				beforeBody: ot,
				beforeLabel: ot,
				label(t) {
					if (this && this.options && "dataset" === this.options.mode) return t.label + ": " + t.formattedValue || t.formattedValue;
					let e = t.dataset.label || "";
					e && (e += ": ");
					const i = t.formattedValue;
					return lt(i) || (e += i), e;
				},
				labelColor(t) {
					const e = t.chart.getDatasetMeta(t.datasetIndex),
						i = e.controller.getStyle(t.dataIndex);
					return {borderColor: i.borderColor, backgroundColor: i.backgroundColor, borderWidth: i.borderWidth, borderDash: i.borderDash, borderDashOffset: i.borderDashOffset, borderRadius: 0};
				},
				labelTextColor() {
					return this.options.bodyColor;
				},
				labelPointStyle(t) {
					const e = t.chart.getDatasetMeta(t.datasetIndex),
						i = e.controller.getStyle(t.dataIndex);
					return {pointStyle: i.pointStyle, rotation: i.rotation};
				},
				afterLabel: ot,
				afterBody: ot,
				beforeFooter: ot,
				footer: ot,
				afterFooter: ot,
			};
			function Hr(t, e, i, n) {
				const s = t[e].call(i, n);
				return "undefined" === typeof s ? Wr[e].call(i, n) : s;
			}
			class Ur extends da {
				static positioners = Cr;
				constructor(t) {
					super(),
						(this.opacity = 0),
						(this._active = []),
						(this._eventPosition = void 0),
						(this._size = void 0),
						(this._cachedAnimations = void 0),
						(this._tooltipItems = []),
						(this.$animations = void 0),
						(this.$context = void 0),
						(this.chart = t.chart),
						(this.options = t.options),
						(this.dataPoints = void 0),
						(this.title = void 0),
						(this.beforeBody = void 0),
						(this.body = void 0),
						(this.afterBody = void 0),
						(this.footer = void 0),
						(this.xAlign = void 0),
						(this.yAlign = void 0),
						(this.x = void 0),
						(this.y = void 0),
						(this.height = void 0),
						(this.width = void 0),
						(this.caretX = void 0),
						(this.caretY = void 0),
						(this.labelColors = void 0),
						(this.labelPointStyles = void 0),
						(this.labelTextColors = void 0);
				}
				initialize(t) {
					(this.options = t), (this._cachedAnimations = void 0), (this.$context = void 0);
				}
				_resolveAnimations() {
					const t = this._cachedAnimations;
					if (t) return t;
					const e = this.chart,
						i = this.options.setContext(this.getContext()),
						n = i.enabled && e.options.animation && i.animations,
						s = new Wn(this.chart, n);
					return n._cacheable && (this._cachedAnimations = Object.freeze(s)), s;
				}
				getContext() {
					return this.$context || (this.$context = Nr(this.chart.getContext(), this, this._tooltipItems));
				}
				getTitle(t, e) {
					const {callbacks: i} = e,
						n = Hr(i, "beforeTitle", this, t),
						s = Hr(i, "title", this, t),
						a = Hr(i, "afterTitle", this, t);
					let o = [];
					return (o = Sr(o, Ar(n))), (o = Sr(o, Ar(s))), (o = Sr(o, Ar(a))), o;
				}
				getBeforeBody(t, e) {
					return Vr(Hr(e.callbacks, "beforeBody", this, t));
				}
				getBody(t, e) {
					const {callbacks: i} = e,
						n = [];
					return (
						ft(t, (t) => {
							const e = {before: [], lines: [], after: []},
								s = zr(i, t);
							Sr(e.before, Ar(Hr(s, "beforeLabel", this, t))), Sr(e.lines, Hr(s, "label", this, t)), Sr(e.after, Ar(Hr(s, "afterLabel", this, t))), n.push(e);
						}),
						n
					);
				}
				getAfterBody(t, e) {
					return Vr(Hr(e.callbacks, "afterBody", this, t));
				}
				getFooter(t, e) {
					const {callbacks: i} = e,
						n = Hr(i, "beforeFooter", this, t),
						s = Hr(i, "footer", this, t),
						a = Hr(i, "afterFooter", this, t);
					let o = [];
					return (o = Sr(o, Ar(n))), (o = Sr(o, Ar(s))), (o = Sr(o, Ar(a))), o;
				}
				_createItems(t) {
					const e = this._active,
						i = this.chart.data,
						n = [],
						s = [],
						a = [];
					let o,
						r,
						l = [];
					for (o = 0, r = e.length; o < r; ++o) l.push(Mr(this.chart, e[o]));
					return (
						t.filter && (l = l.filter((e, n, s) => t.filter(e, n, s, i))),
						t.itemSort && (l = l.sort((e, n) => t.itemSort(e, n, i))),
						ft(l, (e) => {
							const i = zr(t.callbacks, e);
							n.push(Hr(i, "labelColor", this, e)), s.push(Hr(i, "labelPointStyle", this, e)), a.push(Hr(i, "labelTextColor", this, e));
						}),
						(this.labelColors = n),
						(this.labelPointStyles = s),
						(this.labelTextColors = a),
						(this.dataPoints = l),
						l
					);
				}
				update(t, e) {
					const i = this.options.setContext(this.getContext()),
						n = this._active;
					let s,
						a = [];
					if (n.length) {
						const t = Cr[i.position].call(this, n, this._eventPosition);
						(a = this._createItems(i)),
							(this.title = this.getTitle(a, i)),
							(this.beforeBody = this.getBeforeBody(a, i)),
							(this.body = this.getBody(a, i)),
							(this.afterBody = this.getAfterBody(a, i)),
							(this.footer = this.getFooter(a, i));
						const e = (this._size = Fr(this, i)),
							o = Object.assign({}, t, e),
							r = Pr(this.chart, i, o),
							l = Or(i, o, r, this.chart);
						(this.xAlign = r.xAlign), (this.yAlign = r.yAlign), (s = {opacity: 1, x: l.x, y: l.y, width: e.width, height: e.height, caretX: t.x, caretY: t.y});
					} else 0 !== this.opacity && (s = {opacity: 0});
					(this._tooltipItems = a), (this.$context = void 0), s && this._resolveAnimations().update(this, s), t && i.external && i.external.call(this, {chart: this.chart, tooltip: this, replay: e});
				}
				drawCaret(t, e, i, n) {
					const s = this.getCaretPosition(t, i, n);
					e.lineTo(s.x1, s.y1), e.lineTo(s.x2, s.y2), e.lineTo(s.x3, s.y3);
				}
				getCaretPosition(t, e, i) {
					const {xAlign: n, yAlign: s} = this,
						{caretSize: a, cornerRadius: o} = i,
						{topLeft: r, topRight: l, bottomLeft: d, bottomRight: c} = gi(o),
						{x: h, y: u} = t,
						{width: m, height: p} = e;
					let g, f, v, b, k, x;
					return (
						"center" === s
							? ((k = u + p / 2), "left" === n ? ((g = h), (f = g - a), (b = k + a), (x = k - a)) : ((g = h + m), (f = g + a), (b = k - a), (x = k + a)), (v = g))
							: ((f = "left" === n ? h + Math.max(r, d) + a : "right" === n ? h + m - Math.max(l, c) - a : this.caretX),
							  "top" === s ? ((b = u), (k = b - a), (g = f - a), (v = f + a)) : ((b = u + p), (k = b + a), (g = f + a), (v = f - a)),
							  (x = b)),
						{x1: g, x2: f, x3: v, y1: b, y2: k, y3: x}
					);
				}
				drawTitle(t, e, i) {
					const n = this.title,
						s = n.length;
					let a, o, r;
					if (s) {
						const l = bn(i.rtl, this.x, this.width);
						for (
							t.x = Rr(this, i.titleAlign, i),
								e.textAlign = l.textAlign(i.titleAlign),
								e.textBaseline = "middle",
								a = vi(i.titleFont),
								o = i.titleSpacing,
								e.fillStyle = i.titleColor,
								e.font = a.string,
								r = 0;
							r < s;
							++r
						)
							e.fillText(n[r], l.x(t.x), t.y + a.lineHeight / 2), (t.y += a.lineHeight + o), r + 1 === s && (t.y += i.titleMarginBottom - o);
					}
				}
				_drawColorBox(t, e, i, n, s) {
					const a = this.labelColors[i],
						o = this.labelPointStyles[i],
						{boxHeight: r, boxWidth: l} = s,
						d = vi(s.bodyFont),
						c = Rr(this, "left", s),
						h = n.x(c),
						u = r < d.lineHeight ? (d.lineHeight - r) / 2 : 0,
						m = e.y + u;
					if (s.usePointStyle) {
						const e = {radius: Math.min(l, r) / 2, pointStyle: o.pointStyle, rotation: o.rotation, borderWidth: 1},
							i = n.leftForLtr(h, l) + l / 2,
							d = m + r / 2;
						(t.strokeStyle = s.multiKeyBackground), (t.fillStyle = s.multiKeyBackground), Je(t, e, i, d), (t.strokeStyle = a.borderColor), (t.fillStyle = a.backgroundColor), Je(t, e, i, d);
					} else {
						(t.lineWidth = ct(a.borderWidth) ? Math.max(...Object.values(a.borderWidth)) : a.borderWidth || 1),
							(t.strokeStyle = a.borderColor),
							t.setLineDash(a.borderDash || []),
							(t.lineDashOffset = a.borderDashOffset || 0);
						const e = n.leftForLtr(h, l),
							i = n.leftForLtr(n.xPlus(h, 1), l - 2),
							o = gi(a.borderRadius);
						Object.values(o).some((t) => 0 !== t)
							? (t.beginPath(),
							  (t.fillStyle = s.multiKeyBackground),
							  li(t, {x: e, y: m, w: l, h: r, radius: o}),
							  t.fill(),
							  t.stroke(),
							  (t.fillStyle = a.backgroundColor),
							  t.beginPath(),
							  li(t, {x: i, y: m + 1, w: l - 2, h: r - 2, radius: o}),
							  t.fill())
							: ((t.fillStyle = s.multiKeyBackground), t.fillRect(e, m, l, r), t.strokeRect(e, m, l, r), (t.fillStyle = a.backgroundColor), t.fillRect(i, m + 1, l - 2, r - 2));
					}
					t.fillStyle = this.labelTextColors[i];
				}
				drawBody(t, e, i) {
					const {body: n} = this,
						{bodySpacing: s, bodyAlign: a, displayColors: o, boxHeight: r, boxWidth: l, boxPadding: d} = i,
						c = vi(i.bodyFont);
					let h = c.lineHeight,
						u = 0;
					const m = bn(i.rtl, this.x, this.width),
						p = function (i) {
							e.fillText(i, m.x(t.x + u), t.y + h / 2), (t.y += h + s);
						},
						g = m.textAlign(a);
					let f, v, b, k, x, L, _;
					for (
						e.textAlign = a,
							e.textBaseline = "middle",
							e.font = c.string,
							t.x = Rr(this, g, i),
							e.fillStyle = i.bodyColor,
							ft(this.beforeBody, p),
							u = o && "right" !== g ? ("center" === a ? l / 2 + d : l + 2 + d) : 0,
							k = 0,
							L = n.length;
						k < L;
						++k
					) {
						for (
							f = n[k],
								v = this.labelTextColors[k],
								e.fillStyle = v,
								ft(f.before, p),
								b = f.lines,
								o && b.length && (this._drawColorBox(e, t, k, m, i), (h = Math.max(c.lineHeight, r))),
								x = 0,
								_ = b.length;
							x < _;
							++x
						)
							p(b[x]), (h = c.lineHeight);
						ft(f.after, p);
					}
					(u = 0), (h = c.lineHeight), ft(this.afterBody, p), (t.y -= s);
				}
				drawFooter(t, e, i) {
					const n = this.footer,
						s = n.length;
					let a, o;
					if (s) {
						const r = bn(i.rtl, this.x, this.width);
						for (
							t.x = Rr(this, i.footerAlign, i),
								t.y += i.footerMarginTop,
								e.textAlign = r.textAlign(i.footerAlign),
								e.textBaseline = "middle",
								a = vi(i.footerFont),
								e.fillStyle = i.footerColor,
								e.font = a.string,
								o = 0;
							o < s;
							++o
						)
							e.fillText(n[o], r.x(t.x), t.y + a.lineHeight / 2), (t.y += a.lineHeight + i.footerSpacing);
					}
				}
				drawBackground(t, e, i, n) {
					const {xAlign: s, yAlign: a} = this,
						{x: o, y: r} = t,
						{width: l, height: d} = i,
						{topLeft: c, topRight: h, bottomLeft: u, bottomRight: m} = gi(n.cornerRadius);
					(e.fillStyle = n.backgroundColor),
						(e.strokeStyle = n.borderColor),
						(e.lineWidth = n.borderWidth),
						e.beginPath(),
						e.moveTo(o + c, r),
						"top" === a && this.drawCaret(t, e, i, n),
						e.lineTo(o + l - h, r),
						e.quadraticCurveTo(o + l, r, o + l, r + h),
						"center" === a && "right" === s && this.drawCaret(t, e, i, n),
						e.lineTo(o + l, r + d - m),
						e.quadraticCurveTo(o + l, r + d, o + l - m, r + d),
						"bottom" === a && this.drawCaret(t, e, i, n),
						e.lineTo(o + u, r + d),
						e.quadraticCurveTo(o, r + d, o, r + d - u),
						"center" === a && "left" === s && this.drawCaret(t, e, i, n),
						e.lineTo(o, r + c),
						e.quadraticCurveTo(o, r, o + c, r),
						e.closePath(),
						e.fill(),
						n.borderWidth > 0 && e.stroke();
				}
				_updateAnimationTarget(t) {
					const e = this.chart,
						i = this.$animations,
						n = i && i.x,
						s = i && i.y;
					if (n || s) {
						const i = Cr[t.position].call(this, this._active, this._eventPosition);
						if (!i) return;
						const a = (this._size = Fr(this, t)),
							o = Object.assign({}, i, this._size),
							r = Pr(e, t, o),
							l = Or(t, o, r, e);
						(n._to === l.x && s._to === l.y) ||
							((this.xAlign = r.xAlign),
							(this.yAlign = r.yAlign),
							(this.width = a.width),
							(this.height = a.height),
							(this.caretX = i.x),
							(this.caretY = i.y),
							this._resolveAnimations().update(this, l));
					}
				}
				_willRender() {
					return !!this.opacity;
				}
				draw(t) {
					const e = this.options.setContext(this.getContext());
					let i = this.opacity;
					if (!i) return;
					this._updateAnimationTarget(e);
					const n = {width: this.width, height: this.height},
						s = {x: this.x, y: this.y};
					i = Math.abs(i) < 0.001 ? 0 : i;
					const a = fi(e.padding),
						o = this.title.length || this.beforeBody.length || this.body.length || this.afterBody.length || this.footer.length;
					e.enabled &&
						o &&
						(t.save(),
						(t.globalAlpha = i),
						this.drawBackground(s, t, n, e),
						kn(t, e.textDirection),
						(s.y += a.top),
						this.drawTitle(s, t, e),
						this.drawBody(s, t, e),
						this.drawFooter(s, t, e),
						xn(t, e.textDirection),
						t.restore());
				}
				getActiveElements() {
					return this._active || [];
				}
				setActiveElements(t, e) {
					const i = this._active,
						n = t.map(({datasetIndex: t, index: e}) => {
							const i = this.chart.getDatasetMeta(t);
							if (!i) throw new Error("Cannot find a dataset at index " + t);
							return {datasetIndex: t, element: i.data[e], index: e};
						}),
						s = !vt(i, n),
						a = this._positionChanged(n, e);
					(s || a) && ((this._active = n), (this._eventPosition = e), (this._ignoreReplayEvents = !0), this.update(!0));
				}
				handleEvent(t, e, i = !0) {
					if (e && this._ignoreReplayEvents) return !1;
					this._ignoreReplayEvents = !1;
					const n = this.options,
						s = this._active || [],
						a = this._getActiveElements(t, s, e, i),
						o = this._positionChanged(a, t),
						r = e || !vt(a, s) || o;
					return r && ((this._active = a), (n.enabled || n.external) && ((this._eventPosition = {x: t.x, y: t.y}), this.update(!0, e))), r;
				}
				_getActiveElements(t, e, i, n) {
					const s = this.options;
					if ("mouseout" === t.type) return [];
					if (!n) return e.filter((t) => this.chart.data.datasets[t.datasetIndex] && void 0 !== this.chart.getDatasetMeta(t.datasetIndex).controller.getParsed(t.index));
					const a = this.chart.getElementsAtEventForMode(t, s.mode, s, i);
					return s.reverse && a.reverse(), a;
				}
				_positionChanged(t, e) {
					const {caretX: i, caretY: n, options: s} = this,
						a = Cr[s.position].call(this, t, e);
					return !1 !== a && (i !== a.x || n !== a.y);
				}
			}
			var Xr = {
				id: "tooltip",
				_element: Ur,
				positioners: Cr,
				afterInit(t, e, i) {
					i && (t.tooltip = new Ur({chart: t, options: i}));
				},
				beforeUpdate(t, e, i) {
					t.tooltip && t.tooltip.initialize(i);
				},
				reset(t, e, i) {
					t.tooltip && t.tooltip.initialize(i);
				},
				afterDraw(t) {
					const e = t.tooltip;
					if (e && e._willRender()) {
						const i = {tooltip: e};
						if (!1 === t.notifyPlugins("beforeTooltipDraw", {...i, cancelable: !0})) return;
						e.draw(t.ctx), t.notifyPlugins("afterTooltipDraw", i);
					}
				},
				afterEvent(t, e) {
					if (t.tooltip) {
						const i = e.replay;
						t.tooltip.handleEvent(e.event, i, e.inChartArea) && (e.changed = !0);
					}
				},
				defaults: {
					enabled: !0,
					external: null,
					position: "average",
					backgroundColor: "rgba(0,0,0,0.8)",
					titleColor: "#fff",
					titleFont: {weight: "bold"},
					titleSpacing: 2,
					titleMarginBottom: 6,
					titleAlign: "left",
					bodyColor: "#fff",
					bodySpacing: 2,
					bodyFont: {},
					bodyAlign: "left",
					footerColor: "#fff",
					footerSpacing: 2,
					footerMarginTop: 6,
					footerFont: {weight: "bold"},
					footerAlign: "left",
					padding: 6,
					caretPadding: 2,
					caretSize: 5,
					cornerRadius: 6,
					boxHeight: (t, e) => e.bodyFont.size,
					boxWidth: (t, e) => e.bodyFont.size,
					multiKeyBackground: "#fff",
					displayColors: !0,
					boxPadding: 0,
					borderColor: "rgba(0,0,0,0)",
					borderWidth: 0,
					animation: {duration: 400, easing: "easeOutQuart"},
					animations: {numbers: {type: "number", properties: ["x", "y", "width", "height", "caretX", "caretY"]}, opacity: {easing: "linear", duration: 200}},
					callbacks: Wr,
				},
				defaultRoutes: {bodyFont: "font", footerFont: "font", titleFont: "font"},
				descriptors: {
					_scriptable: (t) => "filter" !== t && "itemSort" !== t && "external" !== t,
					_indexable: !1,
					callbacks: {_scriptable: !1, _indexable: !1},
					animation: {_fallback: !1},
					animations: {_fallback: "animation"},
				},
				additionalOptionScopes: ["interaction"],
			};
			const Gr = (t, e, i, n) => ("string" === typeof e ? ((i = t.push(e) - 1), n.unshift({index: i, label: e})) : isNaN(e) && (i = null), i);
			function jr(t, e, i, n) {
				const s = t.indexOf(e);
				if (-1 === s) return Gr(t, e, i, n);
				const a = t.lastIndexOf(e);
				return s !== a ? i : s;
			}
			const $r = (t, e) => (null === t ? null : se(Math.round(t), 0, e));
			function Yr(t) {
				const e = this.getLabels();
				return t >= 0 && t < e.length ? e[t] : t;
			}
			class Kr extends Fa {
				static id = "category";
				static defaults = {ticks: {callback: Yr}};
				constructor(t) {
					super(t), (this._startValue = void 0), (this._valueRange = 0), (this._addedLabels = []);
				}
				init(t) {
					const e = this._addedLabels;
					if (e.length) {
						const t = this.getLabels();
						for (const {index: i, label: n} of e) t[i] === n && t.splice(i, 1);
						this._addedLabels = [];
					}
					super.init(t);
				}
				parse(t, e) {
					if (lt(t)) return null;
					const i = this.getLabels();
					return (e = isFinite(e) && i[e] === t ? e : jr(i, t, mt(e, t), this._addedLabels)), $r(e, i.length - 1);
				}
				determineDataLimits() {
					const {minDefined: t, maxDefined: e} = this.getUserBounds();
					let {min: i, max: n} = this.getMinMax(!0);
					"ticks" === this.options.bounds && (t || (i = 0), e || (n = this.getLabels().length - 1)), (this.min = i), (this.max = n);
				}
				buildTicks() {
					const t = this.min,
						e = this.max,
						i = this.options.offset,
						n = [];
					let s = this.getLabels();
					(s = 0 === t && e === s.length - 1 ? s : s.slice(t, e + 1)), (this._valueRange = Math.max(s.length - (i ? 0 : 1), 1)), (this._startValue = this.min - (i ? 0.5 : 0));
					for (let a = t; a <= e; a++) n.push({value: a});
					return n;
				}
				getLabelForValue(t) {
					return Yr.call(this, t);
				}
				configure() {
					super.configure(), this.isHorizontal() || (this._reversePixels = !this._reversePixels);
				}
				getPixelForValue(t) {
					return "number" !== typeof t && (t = this.parse(t)), null === t ? NaN : this.getPixelForDecimal((t - this._startValue) / this._valueRange);
				}
				getPixelForTick(t) {
					const e = this.ticks;
					return t < 0 || t > e.length - 1 ? null : this.getPixelForValue(e[t].value);
				}
				getValueForPixel(t) {
					return Math.round(this._startValue + this.getDecimalForPixel(t) * this._valueRange);
				}
				getBasePixel() {
					return this.bottom;
				}
			}
			function qr(t, e) {
				const i = [],
					n = 1e-14,
					{bounds: s, step: a, min: o, max: r, precision: l, count: d, maxTicks: c, maxDigits: h, includeBounds: u} = t,
					m = a || 1,
					p = c - 1,
					{min: g, max: f} = e,
					v = !lt(o),
					b = !lt(r),
					k = !lt(d),
					x = (f - g) / (h + 1);
				let L,
					_,
					y,
					w,
					C = Xt((f - g) / p / m) * m;
				if (C < n && !v && !b) return [{value: g}, {value: f}];
				(w = Math.ceil(f / C) - Math.floor(g / C)),
					w > p && (C = Xt((w * C) / p / m) * m),
					lt(l) || ((L = Math.pow(10, l)), (C = Math.ceil(C * L) / L)),
					"ticks" === s ? ((_ = Math.floor(g / C) * C), (y = Math.ceil(f / C) * C)) : ((_ = g), (y = f)),
					v && b && a && Yt((r - o) / a, C / 1e3)
						? ((w = Math.round(Math.min((r - o) / C, c))), (C = (r - o) / w), (_ = o), (y = r))
						: k
						? ((_ = v ? o : _), (y = b ? r : y), (w = d - 1), (C = (y - _) / w))
						: ((w = (y - _) / C), (w = Ut(w, Math.round(w), C / 1e3) ? Math.round(w) : Math.ceil(w)));
				const S = Math.max(Zt(C), Zt(_));
				(L = Math.pow(10, lt(l) ? S : l)), (_ = Math.round(_ * L) / L), (y = Math.round(y * L) / L);
				let A = 0;
				for (v && (u && _ !== o ? (i.push({value: o}), _ < o && A++, Ut(Math.round((_ + A * C) * L) / L, o, Jr(o, x, t)) && A++) : _ < o && A++); A < w; ++A) {
					const t = Math.round((_ + A * C) * L) / L;
					if (b && t > r) break;
					i.push({value: t});
				}
				return b && u && y !== r ? (i.length && Ut(i[i.length - 1].value, r, Jr(r, x, t)) ? (i[i.length - 1].value = r) : i.push({value: r})) : (b && y !== r) || i.push({value: y}), i;
			}
			function Jr(t, e, {horizontal: i, minRotation: n}) {
				const s = qt(n),
					a = (i ? Math.sin(s) : Math.cos(s)) || 0.001,
					o = 0.75 * e * ("" + t).length;
				return Math.min(e / a, o);
			}
			class Zr extends Fa {
				constructor(t) {
					super(t), (this.start = void 0), (this.end = void 0), (this._startValue = void 0), (this._endValue = void 0), (this._valueRange = 0);
				}
				parse(t, e) {
					return lt(t) || (("number" === typeof t || t instanceof Number) && !isFinite(+t)) ? null : +t;
				}
				handleTickRangeOptions() {
					const {beginAtZero: t} = this.options,
						{minDefined: e, maxDefined: i} = this.getUserBounds();
					let {min: n, max: s} = this;
					const a = (t) => (n = e ? n : t),
						o = (t) => (s = i ? s : t);
					if (t) {
						const t = Ht(n),
							e = Ht(s);
						t < 0 && e < 0 ? o(0) : t > 0 && e > 0 && a(0);
					}
					if (n === s) {
						let e = 0 === s ? 1 : Math.abs(0.05 * s);
						o(s + e), t || a(n - e);
					}
					(this.min = n), (this.max = s);
				}
				getTickLimit() {
					const t = this.options.ticks;
					let e,
						{maxTicksLimit: i, stepSize: n} = t;
					return (
						n
							? ((e = Math.ceil(this.max / n) - Math.floor(this.min / n) + 1),
							  e > 1e3 && (console.warn(`scales.${this.id}.ticks.stepSize: ${n} would result generating up to ${e} ticks. Limiting to 1000.`), (e = 1e3)))
							: ((e = this.computeTickLimit()), (i = i || 11)),
						i && (e = Math.min(i, e)),
						e
					);
				}
				computeTickLimit() {
					return Number.POSITIVE_INFINITY;
				}
				buildTicks() {
					const t = this.options,
						e = t.ticks;
					let i = this.getTickLimit();
					i = Math.max(2, i);
					const n = {
							maxTicks: i,
							bounds: t.bounds,
							min: t.min,
							max: t.max,
							precision: e.precision,
							step: e.stepSize,
							count: e.count,
							maxDigits: this._maxDigits(),
							horizontal: this.isHorizontal(),
							minRotation: e.minRotation || 0,
							includeBounds: !1 !== e.includeBounds,
						},
						s = this._range || this,
						a = qr(n, s);
					return "ticks" === t.bounds && Kt(a, this, "value"), t.reverse ? (a.reverse(), (this.start = this.max), (this.end = this.min)) : ((this.start = this.min), (this.end = this.max)), a;
				}
				configure() {
					const t = this.ticks;
					let e = this.min,
						i = this.max;
					if ((super.configure(), this.options.offset && t.length)) {
						const n = (i - e) / Math.max(t.length - 1, 1) / 2;
						(e -= n), (i += n);
					}
					(this._startValue = e), (this._endValue = i), (this._valueRange = i - e);
				}
				getLabelForValue(t) {
					return Oe(t, this.chart.options.locale, this.options.ticks.format);
				}
			}
			class Qr extends Zr {
				static id = "linear";
				static defaults = {ticks: {callback: Ne.formatters.numeric}};
				determineDataLimits() {
					const {min: t, max: e} = this.getMinMax(!0);
					(this.min = ht(t) ? t : 0), (this.max = ht(e) ? e : 1), this.handleTickRangeOptions();
				}
				computeTickLimit() {
					const t = this.isHorizontal(),
						e = t ? this.width : this.height,
						i = qt(this.options.ticks.minRotation),
						n = (t ? Math.sin(i) : Math.cos(i)) || 0.001,
						s = this._resolveTickFontOptions(0);
					return Math.ceil(e / Math.min(40, s.lineHeight / n));
				}
				getPixelForValue(t) {
					return null === t ? NaN : this.getPixelForDecimal((t - this._startValue) / this._valueRange);
				}
				getValueForPixel(t) {
					return this._startValue + this.getDecimalForPixel(t) * this._valueRange;
				}
			}
			Ne.formatters.logarithmic;
			Ne.formatters.numeric;
			const tl = {
					millisecond: {common: !0, size: 1, steps: 1e3},
					second: {common: !0, size: 1e3, steps: 60},
					minute: {common: !0, size: 6e4, steps: 60},
					hour: {common: !0, size: 36e5, steps: 24},
					day: {common: !0, size: 864e5, steps: 30},
					week: {common: !1, size: 6048e5, steps: 4},
					month: {common: !0, size: 2628e6, steps: 12},
					quarter: {common: !1, size: 7884e6, steps: 4},
					year: {common: !0, size: 3154e7},
				},
				el = Object.keys(tl);
			function il(t, e) {
				return t - e;
			}
			function nl(t, e) {
				if (lt(e)) return null;
				const i = t._adapter,
					{parser: n, round: s, isoWeekday: a} = t._parseOpts;
				let o = e;
				return (
					"function" === typeof n && (o = n(o)),
					ht(o) || (o = "string" === typeof n ? i.parse(o, n) : i.parse(o)),
					null === o ? null : (s && (o = "week" !== s || (!$t(a) && !0 !== a) ? i.startOf(o, s) : i.startOf(o, "isoWeek", a)), +o)
				);
			}
			function sl(t, e, i, n) {
				const s = el.length;
				for (let a = el.indexOf(t); a < s - 1; ++a) {
					const t = tl[el[a]],
						s = t.steps ? t.steps : Number.MAX_SAFE_INTEGER;
					if (t.common && Math.ceil((i - e) / (s * t.size)) <= n) return el[a];
				}
				return el[s - 1];
			}
			function al(t, e, i, n, s) {
				for (let a = el.length - 1; a >= el.indexOf(i); a--) {
					const i = el[a];
					if (tl[i].common && t._adapter.diff(s, n, i) >= e - 1) return i;
				}
				return el[i ? el.indexOf(i) : 0];
			}
			function ol(t) {
				for (let e = el.indexOf(t) + 1, i = el.length; e < i; ++e) if (tl[el[e]].common) return el[e];
			}
			function rl(t, e, i) {
				if (i) {
					if (i.length) {
						const {lo: n, hi: s} = re(i, e),
							a = i[n] >= e ? i[n] : i[s];
						t[a] = !0;
					}
				} else t[e] = !0;
			}
			function ll(t, e, i, n) {
				const s = t._adapter,
					a = +s.startOf(e[0].value, n),
					o = e[e.length - 1].value;
				let r, l;
				for (r = a; r <= o; r = +s.add(r, 1, n)) (l = i[r]), l >= 0 && (e[l].major = !0);
				return e;
			}
			function dl(t, e, i) {
				const n = [],
					s = {},
					a = e.length;
				let o, r;
				for (o = 0; o < a; ++o) (r = e[o]), (s[r] = o), n.push({value: r, major: !1});
				return 0 !== a && i ? ll(t, n, s, i) : n;
			}
			class cl extends Fa {
				static id = "time";
				static defaults = {
					bounds: "data",
					adapters: {},
					time: {parser: !1, unit: !1, round: !1, isoWeekday: !1, minUnit: "millisecond", displayFormats: {}},
					ticks: {source: "auto", callback: !1, major: {enabled: !1}},
				};
				constructor(t) {
					super(t), (this._cache = {data: [], labels: [], all: []}), (this._unit = "day"), (this._majorUnit = void 0), (this._offsets = {}), (this._normalized = !1), (this._parseOpts = void 0);
				}
				init(t, e = {}) {
					const i = t.time || (t.time = {}),
						n = (this._adapter = new ms._date(t.adapters.date));
					n.init(e), _t(i.displayFormats, n.formats()), (this._parseOpts = {parser: i.parser, round: i.round, isoWeekday: i.isoWeekday}), super.init(t), (this._normalized = e.normalized);
				}
				parse(t, e) {
					return void 0 === t ? null : nl(this, t);
				}
				beforeLayout() {
					super.beforeLayout(), (this._cache = {data: [], labels: [], all: []});
				}
				determineDataLimits() {
					const t = this.options,
						e = this._adapter,
						i = t.time.unit || "day";
					let {min: n, max: s, minDefined: a, maxDefined: o} = this.getUserBounds();
					function r(t) {
						a || isNaN(t.min) || (n = Math.min(n, t.min)), o || isNaN(t.max) || (s = Math.max(s, t.max));
					}
					(a && o) || (r(this._getLabelBounds()), ("ticks" === t.bounds && "labels" === t.ticks.source) || r(this.getMinMax(!1))),
						(n = ht(n) && !isNaN(n) ? n : +e.startOf(Date.now(), i)),
						(s = ht(s) && !isNaN(s) ? s : +e.endOf(Date.now(), i) + 1),
						(this.min = Math.min(n, s - 1)),
						(this.max = Math.max(n + 1, s));
				}
				_getLabelBounds() {
					const t = this.getLabelTimestamps();
					let e = Number.POSITIVE_INFINITY,
						i = Number.NEGATIVE_INFINITY;
					return t.length && ((e = t[0]), (i = t[t.length - 1])), {min: e, max: i};
				}
				buildTicks() {
					const t = this.options,
						e = t.time,
						i = t.ticks,
						n = "labels" === i.source ? this.getLabelTimestamps() : this._generate();
					"ticks" === t.bounds && n.length && ((this.min = this._userMin || n[0]), (this.max = this._userMax || n[n.length - 1]));
					const s = this.min,
						a = this.max,
						o = ce(n, s, a);
					return (
						(this._unit = e.unit || (i.autoSkip ? sl(e.minUnit, this.min, this.max, this._getLabelCapacity(s)) : al(this, o.length, e.minUnit, this.min, this.max))),
						(this._majorUnit = i.major.enabled && "year" !== this._unit ? ol(this._unit) : void 0),
						this.initOffsets(n),
						t.reverse && o.reverse(),
						dl(this, o, this._majorUnit)
					);
				}
				afterAutoSkip() {
					this.options.offsetAfterAutoskip && this.initOffsets(this.ticks.map((t) => +t.value));
				}
				initOffsets(t = []) {
					let e,
						i,
						n = 0,
						s = 0;
					this.options.offset &&
						t.length &&
						((e = this.getDecimalForValue(t[0])),
						(n = 1 === t.length ? 1 - e : (this.getDecimalForValue(t[1]) - e) / 2),
						(i = this.getDecimalForValue(t[t.length - 1])),
						(s = 1 === t.length ? i : (i - this.getDecimalForValue(t[t.length - 2])) / 2));
					const a = t.length < 3 ? 0.5 : 0.25;
					(n = se(n, 0, a)), (s = se(s, 0, a)), (this._offsets = {start: n, end: s, factor: 1 / (n + 1 + s)});
				}
				_generate() {
					const t = this._adapter,
						e = this.min,
						i = this.max,
						n = this.options,
						s = n.time,
						a = s.unit || sl(s.minUnit, e, i, this._getLabelCapacity(e)),
						o = mt(n.ticks.stepSize, 1),
						r = "week" === a && s.isoWeekday,
						l = $t(r) || !0 === r,
						d = {};
					let c,
						h,
						u = e;
					if ((l && (u = +t.startOf(u, "isoWeek", r)), (u = +t.startOf(u, l ? "day" : a)), t.diff(i, e, a) > 1e5 * o))
						throw new Error(e + " and " + i + " are too far apart with stepSize of " + o + " " + a);
					const m = "data" === n.ticks.source && this.getDataTimestamps();
					for (c = u, h = 0; c < i; c = +t.add(c, o, a), h++) rl(d, c, m);
					return (
						(c !== i && "ticks" !== n.bounds && 1 !== h) || rl(d, c, m),
						Object.keys(d)
							.sort(il)
							.map((t) => +t)
					);
				}
				getLabelForValue(t) {
					const e = this._adapter,
						i = this.options.time;
					return i.tooltipFormat ? e.format(t, i.tooltipFormat) : e.format(t, i.displayFormats.datetime);
				}
				format(t, e) {
					const i = this.options,
						n = i.time.displayFormats,
						s = this._unit,
						a = e || n[s];
					return this._adapter.format(t, a);
				}
				_tickFormatFunction(t, e, i, n) {
					const s = this.options,
						a = s.ticks.callback;
					if (a) return gt(a, [t, e, i], this);
					const o = s.time.displayFormats,
						r = this._unit,
						l = this._majorUnit,
						d = r && o[r],
						c = l && o[l],
						h = i[e],
						u = l && c && h && h.major;
					return this._adapter.format(t, n || (u ? c : d));
				}
				generateTickLabels(t) {
					let e, i, n;
					for (e = 0, i = t.length; e < i; ++e) (n = t[e]), (n.label = this._tickFormatFunction(n.value, e, t));
				}
				getDecimalForValue(t) {
					return null === t ? NaN : (t - this.min) / (this.max - this.min);
				}
				getPixelForValue(t) {
					const e = this._offsets,
						i = this.getDecimalForValue(t);
					return this.getPixelForDecimal((e.start + i) * e.factor);
				}
				getValueForPixel(t) {
					const e = this._offsets,
						i = this.getDecimalForPixel(t) / e.factor - e.end;
					return this.min + i * (this.max - this.min);
				}
				_getLabelSize(t) {
					const e = this.options.ticks,
						i = this.ctx.measureText(t).width,
						n = qt(this.isHorizontal() ? e.maxRotation : e.minRotation),
						s = Math.cos(n),
						a = Math.sin(n),
						o = this._resolveTickFontOptions(0).size;
					return {w: i * s + o * a, h: i * a + o * s};
				}
				_getLabelCapacity(t) {
					const e = this.options.time,
						i = e.displayFormats,
						n = i[e.unit] || i.millisecond,
						s = this._tickFormatFunction(t, 0, dl(this, [t], this._majorUnit), n),
						a = this._getLabelSize(s),
						o = Math.floor(this.isHorizontal() ? this.width / a.w : this.height / a.h) - 1;
					return o > 0 ? o : 1;
				}
				getDataTimestamps() {
					let t,
						e,
						i = this._cache.data || [];
					if (i.length) return i;
					const n = this.getMatchingVisibleMetas();
					if (this._normalized && n.length) return (this._cache.data = n[0].controller.getAllParsedValues(this));
					for (t = 0, e = n.length; t < e; ++t) i = i.concat(n[t].controller.getAllParsedValues(this));
					return (this._cache.data = this.normalize(i));
				}
				getLabelTimestamps() {
					const t = this._cache.labels || [];
					let e, i;
					if (t.length) return t;
					const n = this.getLabels();
					for (e = 0, i = n.length; e < i; ++e) t.push(nl(this, n[e]));
					return (this._cache.labels = this._normalized ? t : this.normalize(t));
				}
				normalize(t) {
					return pe(t.sort(il));
				}
			}
			cl.defaults;
			var hl = i(50953);
			const ul = {
					data: {type: Object, required: !0},
					options: {type: Object, default: () => ({})},
					plugins: {type: Array, default: () => []},
					datasetIdKey: {type: String, default: "label"},
					updateMode: {type: String, default: void 0},
				},
				ml = {ariaLabel: {type: String}, ariaDescribedby: {type: String}},
				pl = {type: {type: String, required: !0}, destroyDelay: {type: Number, default: 0}, ...ul, ...ml},
				gl = "2" === n.rE[0] ? (t, e) => Object.assign(t, {attrs: e}) : (t, e) => Object.assign(t, e);
			function fl(t) {
				return (0, hl.ju)(t) ? (0, hl.ux)(t) : t;
			}
			function vl(t) {
				let e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : t;
				return (0, hl.ju)(e) ? new Proxy(t, {}) : t;
			}
			function bl(t, e) {
				const i = t.options;
				i && e && Object.assign(i, e);
			}
			function kl(t, e) {
				t.labels = e;
			}
			function xl(t, e, i) {
				const n = [];
				t.datasets = e.map((e) => {
					const s = t.datasets.find((t) => t[i] === e[i]);
					return s && e.data && !n.includes(s) ? (n.push(s), Object.assign(s, e), s) : {...e};
				});
			}
			function Ll(t, e) {
				const i = {labels: [], datasets: []};
				return kl(i, t.labels), xl(i, t.datasets, e), i;
			}
			const _l = (0, n.pM)({
				props: pl,
				setup(t, e) {
					let {expose: i, slots: s} = e;
					const a = (0, hl.KR)(null),
						o = (0, hl.IJ)(null);
					i({chart: o});
					const r = () => {
							if (!a.value) return;
							const {type: e, data: i, options: n, plugins: s, datasetIdKey: r} = t,
								l = Ll(i, r),
								d = vl(l, i);
							o.value = new ko(a.value, {type: e, data: d, options: {...n}, plugins: s});
						},
						l = () => {
							const e = (0, hl.ux)(o.value);
							e &&
								(t.destroyDelay > 0
									? setTimeout(() => {
											e.destroy(), (o.value = null);
									  }, t.destroyDelay)
									: (e.destroy(), (o.value = null)));
						},
						d = (e) => {
							e.update(t.updateMode);
						};
					return (
						(0, n.sV)(r),
						(0, n.hi)(l),
						(0, n.wB)(
							[() => t.options, () => t.data],
							(e, i) => {
								let [s, a] = e,
									[r, l] = i;
								const c = (0, hl.ux)(o.value);
								if (!c) return;
								let h = !1;
								if (s) {
									const t = fl(s),
										e = fl(r);
									t && t !== e && (bl(c, t), (h = !0));
								}
								if (a) {
									const e = fl(a.labels),
										i = fl(l.labels),
										n = fl(a.datasets),
										s = fl(l.datasets);
									e !== i && (kl(c.config.data, e), (h = !0)), n && n !== s && (xl(c.config.data, n, t.datasetIdKey), (h = !0));
								}
								h &&
									(0, n.dY)(() => {
										d(c);
									});
							},
							{deep: !0}
						),
						() => (0, n.h)("canvas", {role: "img", ariaLabel: t.ariaLabel, ariaDescribedby: t.ariaDescribedby, ref: a}, [(0, n.h)("p", {}, [s.default ? s.default() : ""])])
					);
				},
			});
			function yl(t, e) {
				return (
					ko.register(e),
					(0, n.pM)({
						props: ul,
						setup(e, i) {
							let {expose: s} = i;
							const a = (0, hl.IJ)(null),
								o = (t) => {
									a.value = t?.chart;
								};
							return s({chart: a}), () => (0, n.h)(_l, gl({ref: o}, {type: t, ...e}));
						},
					})
				);
			}
			const wl = yl("line", cs);
			ko.register(wr, Xr, Lr, Po, Qr, Kr, Bo, ur);
			var Cl = {
					name: "LineChart",
					components: {LineChartGenerator: wl},
					props: {
						chartOptions: {type: Object},
						chartData: {type: Object},
						chartId: {type: String, default: "bar-chart"},
						datasetIdKey: {type: String, default: "label"},
						width: {type: Number, default: 400},
						height: {type: Number, default: 460},
						cssClasses: {default: "", type: String},
						styles: {type: Object, default: () => {}},
						plugins: {type: Object, default: () => {}},
					},
				},
				Sl = i(66262);
			const Al = (0, Sl.A)(Cl, [["render", p]]);
			var Ml = Al,
				Fl = i(53751);
			const Dl = {class: "admin-profit-element"},
				El = {class: "element-loading", key: "loading"},
				Tl = {class: "element-content", key: "content"},
				Pl = {class: "element-title"},
				Il = {class: "gradient-green"},
				Bl = {class: "element-date"};
			function Ol(t, e, i, a, o, r) {
				return (
					(0, n.uX)(),
					(0, n.CE)("div", Dl, [
						(0, n.bF)(
							Fl.eB,
							{name: "fade", mode: "out-in"},
							{
								default: (0, n.k6)(() => [
									null === t.adminStatsData.data || !0 === t.adminStatsData.loading
										? ((0, n.uX)(), (0, n.CE)("div", El, e[0] || (e[0] = [(0, n.Lk)("div", {class: "element-loading"}, null, -1)])))
										: ((0, n.uX)(),
										  (0, n.CE)("div", Tl, [
												(0, n.Lk)("div", Pl, (0, s.v_)(r.adminGetTitle), 1),
												(0, n.Lk)("span", Il, "$" + (0, s.v_)(r.adminFormatValue(i.stats.profit)), 1),
												(0, n.Lk)("div", Bl, (0, s.v_)(r.adminGetDate), 1),
										  ])),
								]),
								_: 1,
							}
						),
					])
				);
			}
			var Rl = {
				name: "AdminProfitElement",
				props: ["type", "stats"],
				methods: {
					adminFormatValue(t) {
						return parseFloat(Math.floor(t / 10) / 100)
							.toFixed(2)
							.toString()
							.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
					},
				},
				computed: {
					...(0, m.L8)(["adminStatsData"]),
					adminGetTitle() {
						let t = "PROFIT ON " + this.type.toUpperCase() + " $";
						return "overall" === this.type && (t = "OVERALL PROFIT $"), t;
					},
					adminGetDate() {
						let t = new Date(this.stats.start).toLocaleDateString("en-US");
						return "day" !== this.type && (t = new Date(this.stats.start).toLocaleDateString("en-US") + " - " + new Date(this.stats.end).toLocaleDateString("en-US")), t;
					},
				},
			};
			const Vl = (0, Sl.A)(Rl, [
				["render", Ol],
				["__scopeId", "data-v-27aae6ef"],
			]);
			var Nl = Vl,
				zl = {
					name: "AdminDashboard",
					components: {LineChart: Ml, AdminProfitElement: Nl},
					data() {
						return {
							adminMode: "daily",
							adminChartOptions: {
								responsive: !0,
								maintainAspectRatio: !1,
								plugins: {legend: !1},
								hover: {mode: null},
								tooltips: {enabled: !1, mode: null},
								layout: {padding: {top: 25}},
								scales: {yUsers: {type: "linear", display: !1, grid: {display: !1}}, yWagered: {type: "linear", display: !1, grid: {display: !1}}, x: {display: !1}},
							},
						};
					},
					methods: {
						...(0, m.i0)(["adminGetStatsDataSocket"]),
						adminSetMode(t) {
							this.adminMode = t;
						},
					},
					computed: {
						...(0, m.L8)(["generalTimeDiff", "adminStatsData"]),
						adminGetChartData() {
							let t = {
								labels: [],
								datasets: [{label: "USERS", yAxisID: "yUsers", data: [], fill: !0, backgroundColor: "rgba(75, 192, 192, 0.2)", borderColor: "#01f6f8", pointRadius: 5, pointBorderColor: "#ffffff"}],
							};
							if (null !== this.adminStatsData.data) {
								const e = "weekly" === this.adminMode ? 7 : "monthly" === this.adminMode ? 30 : 1,
									i = new Date(new Date().getTime() + this.generalTimeDiff).getTime();
								for (let n = 0; n < 14; n++) {
									let s = 0;
									for (let a = 0; a < e; a++) {
										const o = 864e5,
											r = new Date(i - o * e * n - o * a).toLocaleDateString("en-US");
										0 === a && t.labels.unshift(r);
										const l = this.adminStatsData.data.list.findIndex((t) => new Date(t.createdAt).toLocaleDateString("en-US") === r);
										-1 !== l && (s += this.adminStatsData.data.list[l].stats.total.user);
									}
									t.datasets[0].data.unshift(s);
								}
							}
							return t;
						},
					},
					created() {
						if (!1 === this.adminStatsData.loading) {
							const t = {};
							this.adminGetStatsDataSocket(t);
						}
					},
				};
			const Wl = (0, Sl.A)(zl, [
				["render", u],
				["__scopeId", "data-v-5f160edb"],
			]);
			var Hl = Wl;
		},
		46566: function (t, e, i) {
			i.r(e),
				i.d(e, {
					default: function () {
						return X;
					},
				});
			var n = i(20641),
				s = i(53751),
				a = i(90033);
			const o = {class: "admin-affiliates"},
				r = {class: "affiliates-list"},
				l = {class: "list-content"},
				d = {class: "content-loading", key: "loading"},
				c = {class: "content-list", key: "data"},
				h = {class: "content-empty", key: "empty"},
				u = {class: "list-pagination"},
				m = ["disabled"],
				p = {class: "pagination-info"},
				g = {class: "text-green-gradient"},
				f = ["disabled"],
				v = {class: "affiliates-filters"};
			function b(t, e, i, b, k, x) {
				const L = (0, n.g2)("LoadingAnimation"),
					_ = (0, n.g2)("AdminAffiliatesElement"),
					y = (0, n.g2)("AdminFilterSearch"),
					w = (0, n.g2)("AdminFilterSort");
				return (
					(0, n.uX)(),
					(0, n.CE)("div", o, [
						(0, n.Lk)("div", r, [
							e[5] ||
								(e[5] = (0, n.Fv)(
									'<div class="list-header" data-v-9fe89cd8><div class="header-username" data-v-9fe89cd8>USERNAME</div><div class="header-code" data-v-9fe89cd8>CODE</div><div class="header-earned" data-v-9fe89cd8>EARNED</div><div class="header-option" data-v-9fe89cd8>OPTION</div></div>',
									1
								)),
							(0, n.Lk)("div", l, [
								(0, n.bF)(
									s.eB,
									{name: "fade", mode: "out-in"},
									{
										default: (0, n.k6)(() => [
											null === t.adminAffiliateList.data || !0 === t.adminAffiliateList.loading
												? ((0, n.uX)(), (0, n.CE)("div", d, [(0, n.bF)(L)]))
												: t.adminAffiliateList.data.length > 0
												? ((0, n.uX)(),
												  (0, n.CE)("div", c, [
														((0, n.uX)(!0),
														(0, n.CE)(
															n.FK,
															null,
															(0, n.pI)(t.adminAffiliateList.data, (t) => ((0, n.uX)(), (0, n.Wv)(_, {key: t._id, affiliate: t}, null, 8, ["affiliate"]))),
															128
														)),
												  ]))
												: ((0, n.uX)(), (0, n.CE)("div", h, "No affiliates found.")),
										]),
										_: 1,
									}
								),
							]),
							(0, n.Lk)("div", u, [
								(0, n.Lk)(
									"button",
									{onClick: e[0] || (e[0] = (e) => x.adminSetPage(t.adminAffiliateList.page - 1)), class: "button-prev", disabled: t.adminAffiliateList.page <= 1},
									e[2] ||
										(e[2] = [
											(0, n.Lk)(
												"div",
												{class: "button-inner"},
												[
													(0, n.Lk)("svg", {width: "12", height: "11", viewBox: "0 0 12 11", fill: "none", xmlns: "http://www.w3.org/2000/svg"}, [
														(0, n.Lk)("path", {
															d: "M11.2788 4.30337C11.2297 4.2954 11.18 4.29173 11.1302 4.29237H2.66447L2.84907 4.20651C3.02951 4.12111 3.19366 4.00487 3.33417 3.86307L5.70819 1.48906C6.02085 1.19059 6.07339 0.710444 5.83269 0.351417C5.55254 -0.0311676 5.0153 -0.114237 4.63269 0.165907C4.60178 0.188552 4.5724 0.213237 4.54479 0.2398L0.251817 4.53278C-0.0836794 4.8679 -0.0839745 5.41152 0.251146 5.74702C0.251361 5.74723 0.251602 5.74747 0.251817 5.74769L4.54479 10.0407C4.88056 10.3755 5.42418 10.3747 5.75903 10.039C5.78538 10.0125 5.80999 9.98443 5.83269 9.95481C6.07339 9.59578 6.02085 9.11564 5.70819 8.81717L3.33847 6.43886C3.21249 6.31275 3.06766 6.20701 2.90917 6.12547L2.65159 6.00956H11.083C11.5216 6.02585 11.9064 5.71946 11.9888 5.28834C12.0647 4.82027 11.7468 4.3793 11.2788 4.30337Z",
														}),
													]),
												],
												-1
											),
										]),
									8,
									m
								),
								(0, n.Lk)("div", p, [
									e[3] || (e[3] = (0, n.eW)(" PAGE ", -1)),
									(0, n.Lk)("span", g, (0, a.v_)(t.adminAffiliateList.page), 1),
									(0, n.eW)(" / " + (0, a.v_)(Math.ceil(t.adminAffiliateList.count / 12) <= 0 ? "1" : Math.ceil(t.adminAffiliateList.count / 12)), 1),
								]),
								(0, n.Lk)(
									"button",
									{
										onClick: e[1] || (e[1] = (e) => x.adminSetPage(t.adminAffiliateList.page + 1)),
										class: "button-next",
										disabled: t.adminAffiliateList.page >= Math.ceil(t.adminAffiliateList.count / 12),
									},
									e[4] ||
										(e[4] = [
											(0, n.Lk)(
												"div",
												{class: "button-inner"},
												[
													(0, n.Lk)("svg", {width: "12", height: "11", viewBox: "0 0 12 11", fill: "none", xmlns: "http://www.w3.org/2000/svg"}, [
														(0, n.Lk)("path", {
															d: "M0.721245 4.30337C0.770346 4.2954 0.820037 4.29173 0.869755 4.29237H9.33553L9.15093 4.20651C8.97049 4.12111 8.80634 4.00487 8.66583 3.86307L6.29181 1.48906C5.97915 1.19059 5.92661 0.710444 6.16731 0.351417C6.44746 -0.0311676 6.9847 -0.114237 7.36731 0.165907C7.39822 0.188552 7.4276 0.213237 7.45521 0.2398L11.7482 4.53278C12.0837 4.8679 12.084 5.41152 11.7489 5.74702C11.7486 5.74723 11.7484 5.74747 11.7482 5.74769L7.45521 10.0407C7.11944 10.3755 6.57582 10.3747 6.24097 10.039C6.21462 10.0125 6.19001 9.98443 6.16731 9.95481C5.92661 9.59578 5.97915 9.11564 6.29181 8.81717L8.66153 6.43886C8.78751 6.31275 8.93234 6.20701 9.09083 6.12547L9.34841 6.00956H0.917005C0.478396 6.02585 0.0935841 5.71946 0.0111866 5.28834C-0.0647192 4.82027 0.253177 4.3793 0.721245 4.30337Z",
														}),
													]),
												],
												-1
											),
										]),
									8,
									f
								),
							]),
						]),
						(0, n.Lk)("div", v, [(0, n.bF)(y), (0, n.bF)(w)]),
					])
				);
			}
			var k = i(66278),
				x = i(87069),
				L = i(41864);
			const _ = {class: "admin-affiliates-element"},
				y = {class: "element-section section-user"},
				w = {class: "section-content"},
				C = {class: "content-avatar"},
				S = ["innerHTML"],
				A = {class: "element-section section-code"},
				M = {class: "section-content"},
				F = {class: "element-section section-earned"},
				D = {class: "section-content"},
				E = {class: "content-value"},
				T = {class: "element-section section-option"},
				P = {class: "section-content"};
			function I(t, e, i, s, o, r) {
				const l = (0, n.g2)("AvatarImage");
				return (
					(0, n.uX)(),
					(0, n.CE)("div", _, [
						(0, n.Lk)("div", y, [
							e[1] || (e[1] = (0, n.Lk)("div", {class: "section-title"}, "USERNAME", -1)),
							(0, n.Lk)("div", w, [
								(0, n.Lk)("div", C, [(0, n.bF)(l, {image: i.affiliate.avatar}, null, 8, ["image"])]),
								(0, n.Lk)("div", {innerHTML: i.affiliate.username, class: "content-username"}, null, 8, S),
								(0, n.Lk)("div", {class: (0, a.C4)(["content-rank", ["rank-" + i.affiliate.rank]])}, (0, a.v_)(i.affiliate.rank.toUpperCase()), 3),
							]),
						]),
						(0, n.Lk)("div", A, [e[2] || (e[2] = (0, n.Lk)("div", {class: "section-title"}, "CODE", -1)), (0, n.Lk)("div", M, (0, a.v_)(i.affiliate.affiliates.code), 1)]),
						(0, n.Lk)("div", F, [
							e[4] || (e[4] = (0, n.Lk)("div", {class: "section-title"}, "EARNED", -1)),
							(0, n.Lk)("div", D, [
								e[3] || (e[3] = (0, n.Lk)("img", {src: L, alt: "icon"}, null, -1)),
								(0, n.Lk)("div", E, [
									(0, n.Lk)("span", null, (0, a.v_)(r.adminFormatValue(i.affiliate.affiliates.earned).split(".")[0]), 1),
									(0, n.eW)("." + (0, a.v_)(r.adminFormatValue(i.affiliate.affiliates.earned).split(".")[1]), 1),
								]),
							]),
						]),
						(0, n.Lk)("div", T, [
							e[6] || (e[6] = (0, n.Lk)("div", {class: "section-title"}, "OPTION", -1)),
							(0, n.Lk)("div", P, [
								(0, n.Lk)(
									"button",
									{onClick: e[0] || (e[0] = (t) => r.adminViewButton())},
									e[5] ||
										(e[5] = [
											(0, n.Lk)(
												"svg",
												{width: "17", height: "10", viewBox: "0 0 17 10", fill: "none", xmlns: "http://www.w3.org/2000/svg"},
												[
													(0, n.Lk)("path", {
														d: "M8.5 0C5.25197 0 2.30648 1.7536 0.133016 4.60192C-0.0443388 4.83528 -0.0443388 5.16129 0.133016 5.39465C2.30648 8.2464 5.25197 10 8.5 10C11.748 10 14.6935 8.2464 16.867 5.39808C17.0443 5.16472 17.0443 4.83871 16.867 4.60535C14.6935 1.7536 11.748 0 8.5 0ZM8.733 8.52093C6.57691 8.65477 4.79641 6.90117 4.93203 4.77008C5.04332 3.01304 6.4865 1.58888 8.267 1.47907C10.4231 1.34523 12.2036 3.09883 12.068 5.22992C11.9532 6.98353 10.51 8.40769 8.733 8.52093ZM8.62519 6.8943C7.46369 6.96637 6.50389 6.02265 6.58039 4.87646C6.63951 3.92931 7.41848 3.16404 8.37829 3.10227C9.53979 3.0302 10.4996 3.97392 10.4231 5.12011C10.3605 6.07069 9.58152 6.83596 8.62519 6.8943Z",
													}),
												],
												-1
											),
											(0, n.eW)(" VIEW ", -1),
										])
								),
							]),
						]),
					])
				);
			}
			var B = i(10838),
				O = {
					name: "AdminAffiliatesElement",
					components: {AvatarImage: B.A},
					props: ["affiliate"],
					methods: {
						...(0, k.i0)(["modalsSetShow", "modalsSetData"]),
						adminFormatValue(t) {
							return parseFloat(Math.floor(t / 10) / 100)
								.toFixed(2)
								.toString()
								.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
						},
						adminViewButton() {
							this.modalsSetData({affiliate: this.affiliate}), this.modalsSetShow("AdminAffiliate");
						},
					},
				},
				R = i(66262);
			const V = (0, R.A)(O, [
				["render", I],
				["__scopeId", "data-v-7f61e29a"],
			]);
			var N = V,
				z = i(41167),
				W = i(3338),
				H = {
					name: "AdminAffiliates",
					components: {LoadingAnimation: x.A, AdminAffiliatesElement: N, AdminFilterSearch: z.A, AdminFilterSort: W.A},
					methods: {
						...(0, k.i0)(["adminGetAffiliateListSocket", "adminSetAffiliateListPage", "adminSetFilterSearch"]),
						adminSetPage(t) {
							if (this.adminAffiliateList.page === t) return;
							if (t < 1 || t > Math.ceil(this.adminAffiliateList.count / 12)) return;
							this.adminSetAffiliateListPage(t);
							const e = {page: this.adminAffiliateList.page, search: this.adminFilterSearch, sort: this.adminFilterSort.toLowerCase()};
							this.adminGetAffiliateListSocket(e);
						},
					},
					computed: {...(0, k.L8)(["adminAffiliateList", "adminFilterSearch", "adminFilterSort"])},
					created() {
						if (!1 === this.adminAffiliateList.loading) {
							const t = {page: this.adminAffiliateList.page, search: this.adminFilterSearch, sort: this.adminFilterSort.toLowerCase()};
							this.adminGetAffiliateListSocket(t);
						}
					},
					beforeRouteLeave(t, e, i) {
						this.adminSetFilterSearch(""), i();
					},
				};
			const U = (0, R.A)(H, [
				["render", b],
				["__scopeId", "data-v-9fe89cd8"],
			]);
			var X = U;
		},
		47165: function (t, e, i) {
			i.r(e),
				i.d(e, {
					default: function () {
						return rt;
					},
				});
			var n = i(20641),
				s = i(53751),
				a = i(90033);
			const o = {class: "admin-boxes"},
				r = {class: "boxes-list"},
				l = {class: "list-content"},
				d = {class: "content-loading", key: "loading"},
				c = {class: "content-list", key: "data"},
				h = {class: "content-empty", key: "empty"},
				u = {class: "list-pagination"},
				m = ["disabled"],
				p = {class: "pagination-info"},
				g = {class: "text-green-gradient"},
				f = ["disabled"],
				v = {class: "boxes-filters"},
				b = {class: "filters-create"},
				k = {class: "create-items"};
			function x(t, e, i, x, L, _) {
				const y = (0, n.g2)("LoadingAnimation"),
					w = (0, n.g2)("AdminBoxesElement"),
					C = (0, n.g2)("AdminFilterSearch"),
					S = (0, n.g2)("AdminItemElement"),
					A = (0, n.g2)("AdminFilterItem");
				return (
					(0, n.uX)(),
					(0, n.CE)("div", o, [
						(0, n.Lk)("div", r, [
							e[9] ||
								(e[9] = (0, n.Fv)(
									'<div class="list-header" data-v-3f1708f4><div class="header-name" data-v-3f1708f4>NAME</div><div class="header-amount" data-v-3f1708f4>AMOUNT</div><div class="header-state" data-v-3f1708f4>STATE</div><div class="header-option" data-v-3f1708f4>OPTION</div></div>',
									1
								)),
							(0, n.Lk)("div", l, [
								(0, n.bF)(
									s.eB,
									{name: "fade", mode: "out-in"},
									{
										default: (0, n.k6)(() => [
											null === t.adminBoxList.data || !0 === t.adminBoxList.loading
												? ((0, n.uX)(), (0, n.CE)("div", d, [(0, n.bF)(y)]))
												: t.adminBoxList.data.length > 0
												? ((0, n.uX)(),
												  (0, n.CE)("div", c, [
														((0, n.uX)(!0),
														(0, n.CE)(
															n.FK,
															null,
															(0, n.pI)(t.adminBoxList.data, (t) => ((0, n.uX)(), (0, n.Wv)(w, {key: t._id, box: t}, null, 8, ["box"]))),
															128
														)),
												  ]))
												: ((0, n.uX)(), (0, n.CE)("div", h, "No boxes found.")),
										]),
										_: 1,
									}
								),
							]),
							(0, n.Lk)("div", u, [
								(0, n.Lk)(
									"button",
									{onClick: e[0] || (e[0] = (e) => _.adminSetPage(t.adminBoxList.page - 1)), class: "button-prev", disabled: t.adminBoxList.page <= 1},
									e[6] ||
										(e[6] = [
											(0, n.Lk)(
												"div",
												{class: "button-inner"},
												[
													(0, n.Lk)("svg", {width: "12", height: "11", viewBox: "0 0 12 11", fill: "none", xmlns: "http://www.w3.org/2000/svg"}, [
														(0, n.Lk)("path", {
															d: "M11.2788 4.30337C11.2297 4.2954 11.18 4.29173 11.1302 4.29237H2.66447L2.84907 4.20651C3.02951 4.12111 3.19366 4.00487 3.33417 3.86307L5.70819 1.48906C6.02085 1.19059 6.07339 0.710444 5.83269 0.351417C5.55254 -0.0311676 5.0153 -0.114237 4.63269 0.165907C4.60178 0.188552 4.5724 0.213237 4.54479 0.2398L0.251817 4.53278C-0.0836794 4.8679 -0.0839745 5.41152 0.251146 5.74702C0.251361 5.74723 0.251602 5.74747 0.251817 5.74769L4.54479 10.0407C4.88056 10.3755 5.42418 10.3747 5.75903 10.039C5.78538 10.0125 5.80999 9.98443 5.83269 9.95481C6.07339 9.59578 6.02085 9.11564 5.70819 8.81717L3.33847 6.43886C3.21249 6.31275 3.06766 6.20701 2.90917 6.12547L2.65159 6.00956H11.083C11.5216 6.02585 11.9064 5.71946 11.9888 5.28834C12.0647 4.82027 11.7468 4.3793 11.2788 4.30337Z",
														}),
													]),
												],
												-1
											),
										]),
									8,
									m
								),
								(0, n.Lk)("div", p, [
									e[7] || (e[7] = (0, n.eW)(" PAGE ", -1)),
									(0, n.Lk)("span", g, (0, a.v_)(t.adminBoxList.page), 1),
									(0, n.eW)(" / " + (0, a.v_)(Math.ceil(t.adminBoxList.count / 12) <= 0 ? "1" : Math.ceil(t.adminBoxList.count / 12)), 1),
								]),
								(0, n.Lk)(
									"button",
									{onClick: e[1] || (e[1] = (e) => _.adminSetPage(t.adminBoxList.page + 1)), class: "button-next", disabled: t.adminBoxList.page >= Math.ceil(t.adminBoxList.count / 12)},
									e[8] ||
										(e[8] = [
											(0, n.Lk)(
												"div",
												{class: "button-inner"},
												[
													(0, n.Lk)("svg", {width: "12", height: "11", viewBox: "0 0 12 11", fill: "none", xmlns: "http://www.w3.org/2000/svg"}, [
														(0, n.Lk)("path", {
															d: "M0.721245 4.30337C0.770346 4.2954 0.820037 4.29173 0.869755 4.29237H9.33553L9.15093 4.20651C8.97049 4.12111 8.80634 4.00487 8.66583 3.86307L6.29181 1.48906C5.97915 1.19059 5.92661 0.710444 6.16731 0.351417C6.44746 -0.0311676 6.9847 -0.114237 7.36731 0.165907C7.39822 0.188552 7.4276 0.213237 7.45521 0.2398L11.7482 4.53278C12.0837 4.8679 12.084 5.41152 11.7489 5.74702C11.7486 5.74723 11.7484 5.74747 11.7482 5.74769L7.45521 10.0407C7.11944 10.3755 6.57582 10.3747 6.24097 10.039C6.21462 10.0125 6.19001 9.98443 6.16731 9.95481C5.92661 9.59578 5.97915 9.11564 6.29181 8.81717L8.66153 6.43886C8.78751 6.31275 8.93234 6.20701 9.09083 6.12547L9.34841 6.00956H0.917005C0.478396 6.02585 0.0935841 5.71946 0.0111866 5.28834C-0.0647192 4.82027 0.253177 4.3793 0.721245 4.30337Z",
														}),
													]),
												],
												-1
											),
										]),
									8,
									f
								),
							]),
						]),
						(0, n.Lk)("div", v, [
							(0, n.bF)(C),
							(0, n.Lk)("div", b, [
								(0, n.bo)((0, n.Lk)("input", {"onUpdate:modelValue": e[2] || (e[2] = (t) => (L.adminName = t)), type: "text", placeholder: "Enter name here..."}, null, 512), [[s.Jo, L.adminName]]),
								(0, n.Lk)("input", {onChange: e[3] || (e[3] = (...t) => _.adminChangeImage && _.adminChangeImage(...t)), id: "image", type: "file", accept: "image/*"}, null, 32),
								(0, n.bo)((0, n.Lk)("input", {"onUpdate:modelValue": e[4] || (e[4] = (t) => (L.adminCategories = t)), type: "text", placeholder: "Enter categories here..."}, null, 512), [
									[s.Jo, L.adminCategories],
								]),
								e[11] || (e[11] = (0, n.Lk)("div", {class: "create-info"}, "Categories: featured, low risk, 50/50, high risk and partners. Separate categories with comma.", -1)),
								(0, n.Lk)("div", k, [
									e[10] || (e[10] = (0, n.Lk)("div", {class: "items-title"}, "ITEMS", -1)),
									((0, n.uX)(!0),
									(0, n.CE)(
										n.FK,
										null,
										(0, n.pI)(L.adminItems, (t, e) => ((0, n.uX)(), (0, n.Wv)(S, {key: e, item: t}, null, 8, ["item"]))),
										128
									)),
								]),
								(0, n.bF)(A),
								(0, n.Lk)("button", {onClick: e[5] || (e[5] = (t) => _.adminCreateButton()), class: "button-create"}, "CREATE BOX"),
							]),
						]),
					])
				);
			}
			i(44114), i(18111), i(61701), i(18237), i(13579);
			var L = i(66278),
				_ = i(87069),
				y = i(41167);
			const w = {class: "item-menu"},
				C = {class: "menu-inner"},
				S = ["onClick"],
				A = ["src"];
			function M(t, e, i, o, r, l) {
				return (
					(0, n.uX)(),
					(0, n.CE)(
						"div",
						{class: (0, a.C4)(["admin-filter-item", {"item-open": !0 === r.adminDropdown}])},
						[
							(0, n.bo)(
								(0, n.Lk)(
									"input",
									{"onUpdate:modelValue": e[0] || (e[0] = (t) => (r.adminSearch = t)), onFocus: e[1] || (e[1] = (t) => l.adminToggleDropdown()), type: "text", placeholder: "Add item..."},
									null,
									544
								),
								[[s.Jo, r.adminSearch]]
							),
							(0, n.Lk)("div", w, [
								(0, n.Lk)("div", C, [
									((0, n.uX)(!0),
									(0, n.CE)(
										n.FK,
										null,
										(0, n.pI)(
											l.adminGetItems,
											(t, e) => (
												(0, n.uX)(),
												(0, n.CE)(
													"button",
													{key: e, onClick: (e) => l.adminSetButton(t)},
													[(0, n.Lk)("img", {src: t.image}, null, 8, A), (0, n.Lk)("span", null, (0, a.v_)(t.name), 1), (0, n.eW)(" (" + (0, a.v_)(l.adminFormatValue(t.amountFixed)) + ") ", 1)],
													8,
													S
												)
											)
										),
										128
									)),
								]),
							]),
						],
						2
					)
				);
			}
			i(22489);
			var F = {
					name: "AdminFilterItem",
					data() {
						return {adminDropdown: !1, adminSearch: ""};
					},
					methods: {
						adminFormatValue(t) {
							return parseFloat(Math.floor(t / 10) / 100)
								.toFixed(2)
								.toString()
								.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
						},
						adminToggleDropdown() {
							this.adminDropdown = !this.adminDropdown;
						},
						adminSetButton(t) {
							this.adminToggleDropdown(), this.$parent.adminAddButton(t);
						},
					},
					computed: {
						...(0, L.L8)(["adminBoxList"]),
						adminGetItems() {
							let t = [];
							return (
								null !== this.adminBoxList.items &&
									((t = this.adminBoxList.items.filter((t) => !0 === t.name.toLowerCase().includes(this.adminSearch.toLowerCase().trim()))), t.sort((t, e) => e.amount - t.amount)),
								t.slice(0, 30)
							);
						},
					},
					created() {
						let t = this;
						document.addEventListener("click", function (e) {
							t.$el.contains(e.target) || 1 != t.adminDropdown || t.adminToggleDropdown();
						});
					},
				},
				D = i(66262);
			const E = (0, D.A)(F, [
				["render", M],
				["__scopeId", "data-v-3f6026e7"],
			]);
			var T = E,
				P = i(41864);
			const I = {class: "admin-item-element"},
				B = {class: "element-info"},
				O = ["src"],
				R = {class: "info-text"},
				V = {class: "text-amount"},
				N = {class: "amount-value"};
			function z(t, e, i, o, r, l) {
				const d = (0, n.g2)("IconClose");
				return (
					(0, n.uX)(),
					(0, n.CE)("div", I, [
						(0, n.Lk)("div", B, [
							(0, n.Lk)("img", {src: i.item.item.image}, null, 8, O),
							(0, n.Lk)("div", R, [
								(0, n.eW)((0, a.v_)(i.item.item.name) + " ", 1),
								(0, n.Lk)("div", V, [
									e[2] || (e[2] = (0, n.Lk)("img", {src: P, alt: "icon"}, null, -1)),
									(0, n.Lk)("div", N, [
										(0, n.Lk)("span", null, (0, a.v_)(l.adminFormatValue(i.item.item.amountFixed).split(".")[0]), 1),
										(0, n.eW)("." + (0, a.v_)(l.adminFormatValue(i.item.item.amountFixed).split(".")[1]), 1),
									]),
								]),
							]),
						]),
						(0, n.bo)(
							(0, n.Lk)(
								"input",
								{"onUpdate:modelValue": e[0] || (e[0] = (t) => (i.item.percentage = t)), type: "number", min: "0.001", max: "100", placeholder: "Enter item percentage here..."},
								null,
								512
							),
							[[s.Jo, i.item.percentage]]
						),
						(0, n.Lk)("button", {onClick: e[1] || (e[1] = (e) => t.$parent.adminRemoveButton(i.item)), class: "button-remove"}, [(0, n.bF)(d)]),
					])
				);
			}
			var W = i(63261),
				H = {
					name: "AdminItemElement",
					components: {IconClose: W.A},
					props: ["item"],
					methods: {
						adminFormatValue(t) {
							return parseFloat(Math.floor(t / 10) / 100)
								.toFixed(2)
								.toString()
								.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
						},
					},
				};
			const U = (0, D.A)(H, [
				["render", z],
				["__scopeId", "data-v-42819280"],
			]);
			var X = U;
			const G = {class: "admin-boxes-element"},
				j = {class: "element-section section-name"},
				$ = {class: "section-content"},
				Y = {class: "element-section section-amount"},
				K = {class: "section-content"},
				q = {class: "content-value"},
				J = {class: "section-content"},
				Z = {class: "element-section section-option"},
				Q = {class: "section-content"},
				tt = ["disabled"];
			function et(t, e, i, s, o, r) {
				return (
					(0, n.uX)(),
					(0, n.CE)("div", G, [
						(0, n.Lk)("div", j, [e[1] || (e[1] = (0, n.Lk)("div", {class: "section-title"}, "NAME", -1)), (0, n.Lk)("div", $, (0, a.v_)(i.box.name), 1)]),
						(0, n.Lk)("div", Y, [
							e[3] || (e[3] = (0, n.Lk)("div", {class: "section-title"}, "AMOUNT", -1)),
							(0, n.Lk)("div", K, [
								e[2] || (e[2] = (0, n.Lk)("img", {src: P, alt: "icon"}, null, -1)),
								(0, n.Lk)("div", q, [
									(0, n.Lk)("span", null, (0, a.v_)(r.adminFormatValue(i.box.amount).split(".")[0]), 1),
									(0, n.eW)("." + (0, a.v_)(r.adminFormatValue(i.box.amount).split(".")[1]), 1),
								]),
							]),
						]),
						(0, n.Lk)(
							"div",
							{class: (0, a.C4)(["element-section section-state", ["state-" + i.box.state]])},
							[e[4] || (e[4] = (0, n.Lk)("div", {class: "section-title"}, "STATE", -1)), (0, n.Lk)("div", J, (0, a.v_)(i.box.state), 1)],
							2
						),
						(0, n.Lk)("div", Z, [
							e[6] || (e[6] = (0, n.Lk)("div", {class: "section-title"}, "OPTION", -1)),
							(0, n.Lk)("div", Q, [
								(0, n.Lk)(
									"button",
									{onClick: e[0] || (e[0] = (t) => r.adminViewButton()), disabled: "AdminBoxRemove" === t.socketSendLoading},
									e[5] ||
										(e[5] = [
											(0, n.Lk)(
												"svg",
												{width: "17", height: "10", viewBox: "0 0 17 10", fill: "none", xmlns: "http://www.w3.org/2000/svg"},
												[
													(0, n.Lk)("path", {
														d: "M8.5 0C5.25197 0 2.30648 1.7536 0.133016 4.60192C-0.0443388 4.83528 -0.0443388 5.16129 0.133016 5.39465C2.30648 8.2464 5.25197 10 8.5 10C11.748 10 14.6935 8.2464 16.867 5.39808C17.0443 5.16472 17.0443 4.83871 16.867 4.60535C14.6935 1.7536 11.748 0 8.5 0ZM8.733 8.52093C6.57691 8.65477 4.79641 6.90117 4.93203 4.77008C5.04332 3.01304 6.4865 1.58888 8.267 1.47907C10.4231 1.34523 12.2036 3.09883 12.068 5.22992C11.9532 6.98353 10.51 8.40769 8.733 8.52093ZM8.62519 6.8943C7.46369 6.96637 6.50389 6.02265 6.58039 4.87646C6.63951 3.92931 7.41848 3.16404 8.37829 3.10227C9.53979 3.0302 10.4996 3.97392 10.4231 5.12011C10.3605 6.07069 9.58152 6.83596 8.62519 6.8943Z",
													}),
												],
												-1
											),
											(0, n.eW)(" VIEW ", -1),
										]),
									8,
									tt
								),
							]),
						]),
					])
				);
			}
			var it = {
				name: "AdminBoxesElement",
				props: ["box"],
				methods: {
					...(0, L.i0)(["adminSendBoxRemoveSocket"]),
					adminFormatValue(t) {
						return parseFloat(Math.floor(t / 10) / 100)
							.toFixed(2)
							.toString()
							.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
					},
					adminRemoveButton() {
						const t = {boxId: this.box._id};
						this.adminSendBoxRemoveSocket(t);
					},
					adminViewButton() {},
				},
				computed: {...(0, L.L8)(["socketSendLoading"])},
			};
			const nt = (0, D.A)(it, [
				["render", et],
				["__scopeId", "data-v-11bb0bba"],
			]);
			var st = nt,
				at = {
					name: "AdminBoxes",
					components: {LoadingAnimation: _.A, AdminFilterSearch: y.A, AdminFilterItem: T, AdminBoxesElement: st, AdminItemElement: X},
					data() {
						return {adminName: null, adminImage: null, adminCategories: null, adminItems: []};
					},
					methods: {
						...(0, L.i0)(["notificationShow", "adminSetFilterSearch", "adminSetBoxListPage", "adminGetBoxListSocket", "adminSendBoxCreateSocket"]),
						adminFormatValue(t) {
							return parseFloat(Math.floor(t / 10) / 100)
								.toFixed(2)
								.toString()
								.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
						},
						adminFormatImage(t) {
							const e = new FileReader();
							(e.onload = (t) => {
								this.adminImage = t.target.result;
							}),
								e.readAsDataURL(t);
						},
						adminSetPage(t) {
							if (this.adminBoxList.page === t) return;
							if (t < 1 || t > Math.ceil(this.adminBoxList.count / 12)) return;
							this.adminSetBoxListPage(t);
							const e = {page: this.adminBoxList.page, search: this.adminFilterSearch};
							this.adminGetBoxListSocket(e);
						},
						adminChangeImage(t) {
							const e = t.target.files[0];
							this.adminFormatImage(e);
						},
						adminRemoveButton(t) {
							const e = this.adminItems.findIndex((e) => e.item._id === t.item._id);
							-1 !== e && this.adminItems.splice(e, 1);
						},
						adminAddButton(t) {
							!0 !== this.adminItems.some((e) => e.item._id === t._id)
								? this.adminItems.push({item: t, percentage: null})
								: this.notificationShow({type: "error", message: "You can select items only once per box."});
						},
						adminCreateButton() {
							const t = this.adminItems.map((t) => ({item: t.item._id, tickets: Math.floor(1e3 * t.percentage)}));
							if (null === this.adminName || "" === this.adminName.trim()) return void this.notificationShow({type: "error", message: "Your entered box name is invalid."});
							if (t.length <= 0 || 1e5 !== t.reduce((t, e) => t + e.tickets, 0)) return void this.notificationShow({type: "error", message: "Your entered items are invalid."});
							const e = {name: this.adminName, image: this.adminImage, categories: this.adminCategories.split(","), items: t};
							console.log(e), this.adminSendBoxCreateSocket(e);
						},
					},
					computed: {...(0, L.L8)(["adminBoxList", "adminFilterSearch"])},
					created() {
						if (!1 === this.adminBoxList.loading) {
							const t = {page: this.adminBoxList.page, search: this.adminFilterSearch};
							this.adminGetBoxListSocket(t);
						}
					},
					beforeRouteLeave(t, e, i) {
						this.adminSetFilterSearch(""), i();
					},
				};
			const ot = (0, D.A)(at, [
				["render", x],
				["__scopeId", "data-v-3f1708f4"],
			]);
			var rt = ot;
		},
		48986: function (t, e, i) {
			i.r(e),
				i.d(e, {
					default: function () {
						return X;
					},
				});
			var n = i(20641),
				s = i(53751),
				a = i(90033);
			const o = {class: "admin-users"},
				r = {class: "users-list"},
				l = {class: "list-content"},
				d = {class: "content-loading", key: "loading"},
				c = {class: "content-list", key: "data"},
				h = {class: "content-empty", key: "empty"},
				u = {class: "list-pagination"},
				m = ["disabled"],
				p = {class: "pagination-info"},
				g = {class: "text-green-gradient"},
				f = ["disabled"],
				v = {class: "users-filters"};
			function b(t, e, i, b, k, x) {
				const L = (0, n.g2)("LoadingAnimation"),
					_ = (0, n.g2)("AdminUsersElement"),
					y = (0, n.g2)("AdminFilterSearch"),
					w = (0, n.g2)("AdminFilterSort");
				return (
					(0, n.uX)(),
					(0, n.CE)("div", o, [
						(0, n.Lk)("div", r, [
							e[5] ||
								(e[5] = (0, n.Lk)(
									"div",
									{class: "list-header"},
									[(0, n.Lk)("div", {class: "header-username"}, "USERNAME"), (0, n.Lk)("div", {class: "header-rbxid"}, "RBX ID"), (0, n.Lk)("div", {class: "header-option"}, "OPTION")],
									-1
								)),
							(0, n.Lk)("div", l, [
								(0, n.bF)(
									s.eB,
									{name: "fade", mode: "out-in"},
									{
										default: (0, n.k6)(() => [
											null === t.adminUserList.data || !0 === t.adminUserList.loading
												? ((0, n.uX)(), (0, n.CE)("div", d, [(0, n.bF)(L)]))
												: t.adminUserList.data.length > 0
												? ((0, n.uX)(),
												  (0, n.CE)("div", c, [
														((0, n.uX)(!0),
														(0, n.CE)(
															n.FK,
															null,
															(0, n.pI)(t.adminUserList.data, (t) => ((0, n.uX)(), (0, n.Wv)(_, {key: t._id, user: t}, null, 8, ["user"]))),
															128
														)),
												  ]))
												: ((0, n.uX)(), (0, n.CE)("div", h, "No users found.")),
										]),
										_: 1,
									}
								),
							]),
							(0, n.Lk)("div", u, [
								(0, n.Lk)(
									"button",
									{onClick: e[0] || (e[0] = (e) => x.adminSetPage(t.adminUserList.page - 1)), class: "button-prev", disabled: t.adminUserList.page <= 1},
									e[2] ||
										(e[2] = [
											(0, n.Lk)(
												"div",
												{class: "button-inner"},
												[
													(0, n.Lk)("svg", {width: "12", height: "11", viewBox: "0 0 12 11", fill: "none", xmlns: "http://www.w3.org/2000/svg"}, [
														(0, n.Lk)("path", {
															d: "M11.2788 4.30337C11.2297 4.2954 11.18 4.29173 11.1302 4.29237H2.66447L2.84907 4.20651C3.02951 4.12111 3.19366 4.00487 3.33417 3.86307L5.70819 1.48906C6.02085 1.19059 6.07339 0.710444 5.83269 0.351417C5.55254 -0.0311676 5.0153 -0.114237 4.63269 0.165907C4.60178 0.188552 4.5724 0.213237 4.54479 0.2398L0.251817 4.53278C-0.0836794 4.8679 -0.0839745 5.41152 0.251146 5.74702C0.251361 5.74723 0.251602 5.74747 0.251817 5.74769L4.54479 10.0407C4.88056 10.3755 5.42418 10.3747 5.75903 10.039C5.78538 10.0125 5.80999 9.98443 5.83269 9.95481C6.07339 9.59578 6.02085 9.11564 5.70819 8.81717L3.33847 6.43886C3.21249 6.31275 3.06766 6.20701 2.90917 6.12547L2.65159 6.00956H11.083C11.5216 6.02585 11.9064 5.71946 11.9888 5.28834C12.0647 4.82027 11.7468 4.3793 11.2788 4.30337Z",
														}),
													]),
												],
												-1
											),
										]),
									8,
									m
								),
								(0, n.Lk)("div", p, [
									e[3] || (e[3] = (0, n.eW)(" PAGE ", -1)),
									(0, n.Lk)("span", g, (0, a.v_)(t.adminUserList.page), 1),
									(0, n.eW)(" / " + (0, a.v_)(Math.ceil(t.adminUserList.count / 12) <= 0 ? "1" : Math.ceil(t.adminUserList.count / 12)), 1),
								]),
								(0, n.Lk)(
									"button",
									{onClick: e[1] || (e[1] = (e) => x.adminSetPage(t.adminUserList.page + 1)), class: "button-next", disabled: t.adminUserList.page >= Math.ceil(t.adminUserList.count / 12)},
									e[4] ||
										(e[4] = [
											(0, n.Lk)(
												"div",
												{class: "button-inner"},
												[
													(0, n.Lk)("svg", {width: "12", height: "11", viewBox: "0 0 12 11", fill: "none", xmlns: "http://www.w3.org/2000/svg"}, [
														(0, n.Lk)("path", {
															d: "M0.721245 4.30337C0.770346 4.2954 0.820037 4.29173 0.869755 4.29237H9.33553L9.15093 4.20651C8.97049 4.12111 8.80634 4.00487 8.66583 3.86307L6.29181 1.48906C5.97915 1.19059 5.92661 0.710444 6.16731 0.351417C6.44746 -0.0311676 6.9847 -0.114237 7.36731 0.165907C7.39822 0.188552 7.4276 0.213237 7.45521 0.2398L11.7482 4.53278C12.0837 4.8679 12.084 5.41152 11.7489 5.74702C11.7486 5.74723 11.7484 5.74747 11.7482 5.74769L7.45521 10.0407C7.11944 10.3755 6.57582 10.3747 6.24097 10.039C6.21462 10.0125 6.19001 9.98443 6.16731 9.95481C5.92661 9.59578 5.97915 9.11564 6.29181 8.81717L8.66153 6.43886C8.78751 6.31275 8.93234 6.20701 9.09083 6.12547L9.34841 6.00956H0.917005C0.478396 6.02585 0.0935841 5.71946 0.0111866 5.28834C-0.0647192 4.82027 0.253177 4.3793 0.721245 4.30337Z",
														}),
													]),
												],
												-1
											),
										]),
									8,
									f
								),
							]),
						]),
						(0, n.Lk)("div", v, [(0, n.bF)(y), (0, n.bF)(w)]),
					])
				);
			}
			var k = i(66278),
				x = i(87069),
				L = i(41167),
				_ = i(3338),
				y = i(41864);
			const w = {class: "admin-users-element"},
				C = {class: "element-user"},
				S = {class: "user-content"},
				A = {class: "content-avatar"},
				M = ["innerHTML"],
				F = {class: "element-rbxid"},
				D = {class: "rbxid-content"},
				E = {class: "element-balance"},
				T = {class: "balance-content"},
				P = {class: "content-value"},
				I = {class: "element-option"},
				B = {class: "option-content"};
			function O(t, e, i, s, o, r) {
				const l = (0, n.g2)("AvatarImage");
				return (
					(0, n.uX)(),
					(0, n.CE)("div", w, [
						(0, n.Lk)("div", C, [
							e[1] || (e[1] = (0, n.Lk)("div", {class: "user-title"}, "USERNAME", -1)),
							(0, n.Lk)("div", S, [
								(0, n.Lk)("div", A, [(0, n.bF)(l, {image: i.user.avatar}, null, 8, ["image"])]),
								(0, n.Lk)("div", {innerHTML: i.user.username, class: "content-username"}, null, 8, M),
								(0, n.Lk)("div", {class: (0, a.C4)(["content-rank", ["rank-" + i.user.rank]])}, (0, a.v_)(i.user.rank.toUpperCase()), 3),
							]),
						]),
						(0, n.Lk)("div", F, [e[2] || (e[2] = (0, n.Lk)("div", {class: "rbxid-title"}, "RBX ID", -1)), (0, n.Lk)("div", D, (0, a.v_)(i.user.robloxId), 1)]),
						(0, n.Lk)("div", E, [
							e[4] || (e[4] = (0, n.Lk)("div", {class: "balance-title"}, "BALANCE", -1)),
							(0, n.Lk)("div", T, [
								e[3] || (e[3] = (0, n.Lk)("img", {src: y, alt: "icon"}, null, -1)),
								(0, n.Lk)("div", P, [
									(0, n.Lk)("span", null, (0, a.v_)(r.adminFormatValue(i.user.balance).split(".")[0]), 1),
									(0, n.eW)("." + (0, a.v_)(r.adminFormatValue(i.user.balance).split(".")[1]), 1),
								]),
							]),
						]),
						(0, n.Lk)("div", I, [
							e[6] || (e[6] = (0, n.Lk)("div", {class: "option-title"}, "OPTION", -1)),
							(0, n.Lk)("div", B, [
								(0, n.Lk)(
									"button",
									{onClick: e[0] || (e[0] = (t) => r.adminViewButton())},
									e[5] ||
										(e[5] = [
											(0, n.Lk)(
												"svg",
												{width: "17", height: "10", viewBox: "0 0 17 10", fill: "none", xmlns: "http://www.w3.org/2000/svg"},
												[
													(0, n.Lk)("path", {
														d: "M8.5 0C5.25197 0 2.30648 1.7536 0.133016 4.60192C-0.0443388 4.83528 -0.0443388 5.16129 0.133016 5.39465C2.30648 8.2464 5.25197 10 8.5 10C11.748 10 14.6935 8.2464 16.867 5.39808C17.0443 5.16472 17.0443 4.83871 16.867 4.60535C14.6935 1.7536 11.748 0 8.5 0ZM8.733 8.52093C6.57691 8.65477 4.79641 6.90117 4.93203 4.77008C5.04332 3.01304 6.4865 1.58888 8.267 1.47907C10.4231 1.34523 12.2036 3.09883 12.068 5.22992C11.9532 6.98353 10.51 8.40769 8.733 8.52093ZM8.62519 6.8943C7.46369 6.96637 6.50389 6.02265 6.58039 4.87646C6.63951 3.92931 7.41848 3.16404 8.37829 3.10227C9.53979 3.0302 10.4996 3.97392 10.4231 5.12011C10.3605 6.07069 9.58152 6.83596 8.62519 6.8943Z",
													}),
												],
												-1
											),
											(0, n.eW)(" VIEW ", -1),
										])
								),
							]),
						]),
					])
				);
			}
			var R = i(10838),
				V = {
					name: "AdminUsersElement",
					components: {AvatarImage: R.A},
					props: ["user"],
					methods: {
						...(0, k.i0)(["modalsSetShow", "modalsSetData"]),
						adminFormatValue(t) {
							return parseFloat(Math.floor(t / 10) / 100)
								.toFixed(2)
								.toString()
								.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
						},
						adminViewButton() {
							this.modalsSetData({user: this.user}), this.modalsSetShow("AdminUser");
						},
					},
				},
				N = i(66262);
			const z = (0, N.A)(V, [
				["render", O],
				["__scopeId", "data-v-32d71c12"],
			]);
			var W = z,
				H = {
					name: "AdminUsers",
					components: {LoadingAnimation: x.A, AdminFilterSearch: L.A, AdminFilterSort: _.A, AdminUsersElement: W},
					methods: {
						...(0, k.i0)(["adminGetUserListSocket", "adminSetUserListPage", "adminSetFilterSearch"]),
						adminSetPage(t) {
							if (this.adminUserList.page === t) return;
							if (t < 1 || t > Math.ceil(this.adminUserList.count / 12)) return;
							this.adminSetUserListPage(t);
							const e = {page: this.adminUserList.page, search: this.adminFilterSearch, sort: this.adminFilterSort.toLowerCase()};
							this.adminGetUserListSocket(e);
						},
					},
					computed: {...(0, k.L8)(["adminUserList", "adminFilterSearch", "adminFilterSort"])},
					created() {
						if (!1 === this.adminUserList.loading) {
							const t = {page: this.adminUserList.page, search: this.adminFilterSearch, sort: this.adminFilterSort.toLowerCase()};
							this.adminGetUserListSocket(t);
						}
					},
					beforeRouteLeave(t, e, i) {
						this.adminSetFilterSearch(""), i();
					},
				};
			const U = (0, N.A)(H, [
				["render", b],
				["__scopeId", "data-v-d4119a42"],
			]);
			var X = U;
		},
		50279: function (t, e, i) {
			i.r(e),
				i.d(e, {
					default: function () {
						return x;
					},
				});
			var n = i(20641),
				s = i(53751);
			const a = {class: "admin"},
				o = {class: "admin-container"},
				r = {class: "container-header"},
				l = {class: "container-content"};
			function d(t, e, i, d, c, h) {
				const u = (0, n.g2)("router-link"),
					m = (0, n.g2)("AdminFilterNavbar"),
					p = (0, n.g2)("router-view");
				return (
					(0, n.uX)(),
					(0, n.CE)("div", a, [
						(0, n.Lk)("div", o, [
							(0, n.Lk)("div", r, [
								(0, n.bF)(u, {to: "/admin", class: "header-title text-green-gradient"}, {default: (0, n.k6)(() => e[0] || (e[0] = [(0, n.eW)("ADMIN PANEL", -1)])), _: 1, __: [0]}),
								(0, n.bF)(m),
							]),
							(0, n.Lk)("div", l, [(0, n.bF)(s.eB, {name: "slide-fade", mode: "out-in"}, {default: (0, n.k6)(() => [(0, n.bF)(p)]), _: 1})]),
						]),
					])
				);
			}
			var c = i(90033);
			const h = {class: "button-value"},
				u = {class: "sidebar-menu"};
			function m(t, e, i, s, a, o) {
				const r = (0, n.g2)("router-link");
				return (
					(0, n.uX)(),
					(0, n.CE)(
						"div",
						{class: (0, c.C4)(["admin-sidebar", {"sidebar-open": a.sidebarOpen}])},
						[
							(0, n.Lk)("button", {onClick: e[0] || (e[0] = (...t) => o.toggleSidebar && o.toggleSidebar(...t)), class: "button-toggle"}, [
								(0, n.Lk)("div", h, (0, c.v_)(o.adminGetRoute), 1),
								e[1] ||
									(e[1] = (0, n.Lk)(
										"svg",
										{width: "10", height: "6", viewBox: "0 0 10 6", fill: "none", xmlns: "http://www.w3.org/2000/svg"},
										[
											(0, n.Lk)("path", {
												d: "M9.5176 1.66411e-06L0.482354 8.43375e-08C0.0547936 9.58042e-09 -0.16302 0.516304 0.143533 0.822859L4.66115 5.34052C4.8467 5.52607 5.15325 5.52607 5.33888 5.34052L9.8565 0.822861C10.163 0.516306 9.94516 1.73887e-06 9.5176 1.66411e-06Z",
											}),
										],
										-1
									)),
							]),
							(0, n.Lk)("div", u, [
								(0, n.bF)(r, {to: "/admin", onClick: o.toggleSidebar}, {default: (0, n.k6)(() => e[2] || (e[2] = [(0, n.eW)("Dashboard", -1)])), _: 1, __: [2]}, 8, ["onClick"]),
								(0, n.bF)(r, {to: "/admin/users", onClick: o.toggleSidebar}, {default: (0, n.k6)(() => e[3] || (e[3] = [(0, n.eW)("Users", -1)])), _: 1, __: [3]}, 8, ["onClick"]),
								(0, n.bF)(r, {to: "/admin/games", onClick: o.toggleSidebar}, {default: (0, n.k6)(() => e[4] || (e[4] = [(0, n.eW)("Games", -1)])), _: 1, __: [4]}, 8, ["onClick"]),
								(0, n.bF)(r, {to: "/admin/cashier", onClick: o.toggleSidebar}, {default: (0, n.k6)(() => e[5] || (e[5] = [(0, n.eW)("Cashier", -1)])), _: 1, __: [5]}, 8, ["onClick"]),
								(0, n.bF)(r, {to: "/admin/providers", onClick: o.toggleSidebar}, {default: (0, n.k6)(() => e[6] || (e[6] = [(0, n.eW)("Providers", -1)])), _: 1, __: [6]}, 8, ["onClick"]),
								(0, n.bF)(r, {to: "/admin/promo", onClick: o.toggleSidebar}, {default: (0, n.k6)(() => e[7] || (e[7] = [(0, n.eW)("Promo", -1)])), _: 1, __: [7]}, 8, ["onClick"]),
								(0, n.bF)(r, {to: "/admin/bonus", onClick: o.toggleSidebar}, {default: (0, n.k6)(() => e[8] || (e[8] = [(0, n.eW)("Bonuses", -1)])), _: 1, __: [8]}, 8, ["onClick"]),
								(0, n.bF)(r, {to: "/admin/notice", onClick: o.toggleSidebar}, {default: (0, n.k6)(() => e[9] || (e[9] = [(0, n.eW)("Notice", -1)])), _: 1, __: [9]}, 8, ["onClick"]),
								(0, n.bF)(r, {to: "/admin/news", onClick: o.toggleSidebar}, {default: (0, n.k6)(() => e[10] || (e[10] = [(0, n.eW)("News", -1)])), _: 1, __: [10]}, 8, ["onClick"]),
								(0, n.bF)(r, {to: "/admin/support", onClick: o.toggleSidebar}, {default: (0, n.k6)(() => e[11] || (e[11] = [(0, n.eW)("Customer Services", -1)])), _: 1, __: [11]}, 8, ["onClick"]),
								(0, n.bF)(r, {to: "/admin/leaderboard", onClick: o.toggleSidebar}, {default: (0, n.k6)(() => e[12] || (e[12] = [(0, n.eW)("Leaderboard", -1)])), _: 1, __: [12]}, 8, ["onClick"]),
								(0, n.bF)(r, {to: "/admin/affiliates", onClick: o.toggleSidebar}, {default: (0, n.k6)(() => e[13] || (e[13] = [(0, n.eW)("Affiliates", -1)])), _: 1, __: [13]}, 8, ["onClick"]),
								(0, n.bF)(r, {to: "/admin/rain", onClick: o.toggleSidebar}, {default: (0, n.k6)(() => e[14] || (e[14] = [(0, n.eW)("Rain", -1)])), _: 1, __: [14]}, 8, ["onClick"]),
								(0, n.bF)(r, {to: "/admin/boxes", onClick: o.toggleSidebar}, {default: (0, n.k6)(() => e[15] || (e[15] = [(0, n.eW)("Boxes", -1)])), _: 1, __: [15]}, 8, ["onClick"]),
								(0, n.bF)(r, {to: "/admin/filter", onClick: o.toggleSidebar}, {default: (0, n.k6)(() => e[16] || (e[16] = [(0, n.eW)("Filter", -1)])), _: 1, __: [16]}, 8, ["onClick"]),
								(0, n.bF)(r, {to: "/admin/settings", onClick: o.toggleSidebar}, {default: (0, n.k6)(() => e[17] || (e[17] = [(0, n.eW)("Settings", -1)])), _: 1, __: [17]}, 8, ["onClick"]),
							]),
						],
						2
					)
				);
			}
			var p = {
					name: "AdminSidebar",
					data() {
						return {sidebarOpen: !0};
					},
					methods: {
						toggleSidebar() {
							this.sidebarOpen = !this.sidebarOpen;
						},
					},
					computed: {
						adminGetRoute() {
							let t = this.$route.name.replace("Admin", "");
							return "Stats" === t && (t = "Stats Book"), t;
						},
					},
					created() {
						let t = this;
						document.addEventListener("click", function (e) {
							!t.$el.contains(e.target) && t.sidebarOpen && t.toggleSidebar();
						});
					},
				},
				g = i(66262);
			const f = (0, g.A)(p, [
				["render", m],
				["__scopeId", "data-v-15dba0d4"],
			]);
			var v = f,
				b = {name: "Admin", metaInfo: {title: "Admin - https://arcanebet366.com"}, components: {AdminFilterNavbar: v}};
			const k = (0, g.A)(b, [
				["render", d],
				["__scopeId", "data-v-15bbd2cc"],
			]);
			var x = k;
		},
		50589: function (t, e, i) {
			i.r(e),
				i.d(e, {
					default: function () {
						return B;
					},
				});
			var n = i(20641);
			const s = {class: "admin-settings"},
				a = {class: "settings-section"},
				o = {class: "settings-section"},
				r = {class: "settings-section"},
				l = {class: "settings-section"},
				d = {class: "settings-section"},
				c = {class: "settings-section"},
				h = {class: "settings-section"},
				u = {class: "settings-section"},
				m = {class: "settings-section"};
			function p(t, e, i, p, g, f) {
				const v = (0, n.g2)("AdminSettingsToggle"),
					b = (0, n.g2)("AdminSettingsSelect");
				return (
					(0, n.uX)(),
					(0, n.CE)("div", s, [
						(0, n.Lk)("div", a, [
							e[0] || (e[0] = (0, n.Lk)("div", {class: "section-title"}, "General", -1)),
							(0, n.bF)(v, {name: "Maintenance", setting: "general.maintenance.enabled"}),
							(0, n.bF)(v, {name: "Rain", setting: "general.rain.enabled"}),
							(0, n.bF)(v, {name: "Leaderboard", setting: "general.leaderboard.enabled"}),
							(0, n.bF)(v, {name: "Tip", setting: "general.tip.enabled"}),
							(0, n.bF)(v, {name: "Affiliate Redeem", setting: "general.affiliate.enabled"}),
							(0, n.bF)(b, {name: "Reward Multiplier", setting: "general.reward.multiplier"}),
						]),
						(0, n.Lk)("div", o, [e[1] || (e[1] = (0, n.Lk)("div", {class: "section-title"}, "Chat", -1)), (0, n.bF)(v, {name: "Enabled", setting: "chat.enabled"})]),
						(0, n.Lk)("div", r, [
							e[2] || (e[2] = (0, n.Lk)("div", {class: "section-title"}, "Games", -1)),
							(0, n.bF)(v, {name: "Crash", setting: "games.crash.enabled"}),
							(0, n.bF)(v, {name: "Roll", setting: "games.roll.enabled"}),
							(0, n.bF)(v, {name: "Blackjack", setting: "games.blackjack.enabled"}),
							(0, n.bF)(v, {name: "Dice Duels", setting: "games.duels.enabled"}),
							(0, n.bF)(v, {name: "Mines", setting: "games.mines.enabled"}),
							(0, n.bF)(v, {name: "Towers", setting: "games.towers.enabled"}),
							(0, n.bF)(v, {name: "Unbox", setting: "games.unbox.enabled"}),
							(0, n.bF)(v, {name: "Battles", setting: "games.battles.enabled"}),
							(0, n.bF)(v, {name: "Upgrader", setting: "games.upgrader.enabled"}),
						]),
						(0, n.Lk)("div", l, [
							e[3] || (e[3] = (0, n.Lk)("div", {class: "section-title"}, "Robux", -1)),
							(0, n.bF)(v, {name: "Deposit", setting: "robux.deposit.enabled"}),
							(0, n.bF)(v, {name: "Withdraw", setting: "robux.withdraw.enabled"}),
						]),
						(0, n.Lk)("div", d, [
							e[4] || (e[4] = (0, n.Lk)("div", {class: "section-title"}, "Limited", -1)),
							(0, n.bF)(v, {name: "Deposit", setting: "limited.deposit.enabled"}),
							(0, n.bF)(v, {name: "Withdraw", setting: "limited.withdraw.enabled"}),
						]),
						(0, n.Lk)("div", c, [
							e[5] || (e[5] = (0, n.Lk)("div", {class: "section-title"}, "Steam", -1)),
							(0, n.bF)(v, {name: "Deposit", setting: "steam.deposit.enabled"}),
							(0, n.bF)(v, {name: "Withdraw", setting: "steam.withdraw.enabled"}),
						]),
						(0, n.Lk)("div", h, [
							e[6] || (e[6] = (0, n.Lk)("div", {class: "section-title"}, "Crypto", -1)),
							(0, n.bF)(v, {name: "Deposit", setting: "crypto.deposit.enabled"}),
							(0, n.bF)(v, {name: "Withdraw", setting: "crypto.withdraw.enabled"}),
						]),
						(0, n.Lk)("div", u, [
							e[7] || (e[7] = (0, n.Lk)("div", {class: "section-title"}, "Gift", -1)),
							(0, n.bF)(v, {name: "Deposit", setting: "gift.deposit.enabled"}),
							(0, n.bF)(v, {name: "Withdraw", setting: "gift.withdraw.enabled"}),
						]),
						(0, n.Lk)("div", m, [
							e[8] || (e[8] = (0, n.Lk)("div", {class: "section-title"}, "Credit", -1)),
							(0, n.bF)(v, {name: "Deposit", setting: "credit.deposit.enabled"}),
							(0, n.bF)(v, {name: "Withdraw", setting: "credit.withdraw.enabled"}),
						]),
					])
				);
			}
			var g = i(90033);
			const f = {class: "admin-settings-toggle"},
				v = {class: "toggle-name"},
				b = ["disabled"];
			function k(t, e, i, s, a, o) {
				return (
					(0, n.uX)(),
					(0, n.CE)("div", f, [
						(0, n.Lk)("div", v, (0, g.v_)(i.name), 1),
						(0, n.Lk)(
							"button",
							{onClick: e[0] || (e[0] = (t) => o.adminSettingsToggle(!o.adminGetValue)), class: (0, g.C4)({"button-active": !0 === o.adminGetValue}), disabled: null !== t.socketSendLoading},
							null,
							10,
							b
						),
					])
				);
			}
			var x = i(66278),
				L = {
					name: "AdminSettingsToggle",
					props: ["name", "setting"],
					methods: {
						...(0, x.i0)(["adminSendSettingValueSocket"]),
						adminSettingsToggle(t) {
							const e = {setting: this.setting, value: t};
							this.adminSendSettingValueSocket(e);
						},
					},
					computed: {
						...(0, x.L8)(["socketSendLoading", "generalSettings"]),
						adminGetValue() {
							let t = this.generalSettings;
							for (let e of this.setting.split(".")) t = t[e];
							return t;
						},
					},
				},
				_ = i(66262);
			const y = (0, _.A)(L, [
				["render", k],
				["__scopeId", "data-v-4e37736d"],
			]);
			var w = y,
				C = i(53751);
			const S = {class: "admin-settings-select"},
				A = {class: "select-name"},
				M = ["disabled"];
			function F(t, e, i, s, a, o) {
				return (
					(0, n.uX)(),
					(0, n.CE)("div", S, [
						(0, n.Lk)("div", A, (0, g.v_)(i.name), 1),
						(0, n.bo)(
							(0, n.Lk)(
								"select",
								{"onUpdate:modelValue": e[0] || (e[0] = (t) => (a.adminValue = t)), onChange: e[1] || (e[1] = (t) => o.adminSettingsSelect()), disabled: null !== t.socketSendLoading},
								e[2] || (e[2] = [(0, n.Lk)("option", {value: "0.5"}, "0.5", -1), (0, n.Lk)("option", {value: "1"}, "1", -1), (0, n.Lk)("option", {value: "2"}, "2", -1)]),
								40,
								M
							),
							[[C.u1, a.adminValue]]
						),
					])
				);
			}
			var D = {
				name: "AdminSettingsSelect",
				props: ["name", "setting"],
				data() {
					return {adminValue: null};
				},
				methods: {
					...(0, x.i0)(["adminSendSettingValueSocket"]),
					adminSettingsSelect(t) {
						const e = {setting: this.setting, value: this.adminValue};
						this.adminSendSettingValueSocket(e);
					},
				},
				computed: {
					...(0, x.L8)(["socketSendLoading", "generalSettings"]),
					adminGetValue() {
						let t = this.generalSettings;
						for (let e of this.setting.split(".")) t = t[e];
						return t;
					},
				},
				created() {
					this.adminValue = this.adminGetValue;
				},
			};
			const E = (0, _.A)(D, [
				["render", F],
				["__scopeId", "data-v-5ced4a39"],
			]);
			var T = E,
				P = {name: "AdminSettings", components: {AdminSettingsToggle: w, AdminSettingsSelect: T}};
			const I = (0, _.A)(P, [
				["render", p],
				["__scopeId", "data-v-d577d6a4"],
			]);
			var B = I;
		},
		61474: function (t, e, i) {
			i.r(e),
				i.d(e, {
					default: function () {
						return B;
					},
				});
			var n = i(20641),
				s = i(53751),
				a = i(90033);
			const o = {class: "admin-filter"},
				r = {class: "filter-list"},
				l = {class: "list-content"},
				d = {class: "content-loading", key: "loading"},
				c = {class: "content-list", key: "data"},
				h = {class: "content-empty", key: "empty"},
				u = {class: "list-pagination"},
				m = ["disabled"],
				p = {class: "pagination-info"},
				g = {class: "text-green-gradient"},
				f = ["disabled"],
				v = {class: "filter-filters"},
				b = {class: "filters-add"};
			function k(t, e, i, k, x, L) {
				const _ = (0, n.g2)("LoadingAnimation"),
					y = (0, n.g2)("AdminFilterElement"),
					w = (0, n.g2)("AdminFilterSearch");
				return (
					(0, n.uX)(),
					(0, n.CE)("div", o, [
						(0, n.Lk)("div", r, [
							e[7] || (e[7] = (0, n.Lk)("div", {class: "list-header"}, [(0, n.Lk)("div", {class: "header-phrase"}, "BANNED PHRASES"), (0, n.Lk)("div", {class: "header-option"}, "OPTION")], -1)),
							(0, n.Lk)("div", l, [
								(0, n.bF)(
									s.eB,
									{name: "fade", mode: "out-in"},
									{
										default: (0, n.k6)(() => [
											null === t.adminFilterList.data || !0 === t.adminFilterList.loading
												? ((0, n.uX)(), (0, n.CE)("div", d, [(0, n.bF)(_)]))
												: t.adminFilterList.data.length > 0
												? ((0, n.uX)(),
												  (0, n.CE)("div", c, [
														((0, n.uX)(!0),
														(0, n.CE)(
															n.FK,
															null,
															(0, n.pI)(t.adminFilterList.data, (t) => ((0, n.uX)(), (0, n.Wv)(y, {key: t._id, filter: t}, null, 8, ["filter"]))),
															128
														)),
												  ]))
												: ((0, n.uX)(), (0, n.CE)("div", h, "No filter phrases found.")),
										]),
										_: 1,
									}
								),
							]),
							(0, n.Lk)("div", u, [
								(0, n.Lk)(
									"button",
									{onClick: e[0] || (e[0] = (e) => L.adminSetPage(t.adminFilterList.page - 1)), class: "button-prev", disabled: t.adminFilterList.page <= 1},
									e[4] ||
										(e[4] = [
											(0, n.Lk)(
												"div",
												{class: "button-inner"},
												[
													(0, n.Lk)("svg", {width: "12", height: "11", viewBox: "0 0 12 11", fill: "none", xmlns: "http://www.w3.org/2000/svg"}, [
														(0, n.Lk)("path", {
															d: "M11.2788 4.30337C11.2297 4.2954 11.18 4.29173 11.1302 4.29237H2.66447L2.84907 4.20651C3.02951 4.12111 3.19366 4.00487 3.33417 3.86307L5.70819 1.48906C6.02085 1.19059 6.07339 0.710444 5.83269 0.351417C5.55254 -0.0311676 5.0153 -0.114237 4.63269 0.165907C4.60178 0.188552 4.5724 0.213237 4.54479 0.2398L0.251817 4.53278C-0.0836794 4.8679 -0.0839745 5.41152 0.251146 5.74702C0.251361 5.74723 0.251602 5.74747 0.251817 5.74769L4.54479 10.0407C4.88056 10.3755 5.42418 10.3747 5.75903 10.039C5.78538 10.0125 5.80999 9.98443 5.83269 9.95481C6.07339 9.59578 6.02085 9.11564 5.70819 8.81717L3.33847 6.43886C3.21249 6.31275 3.06766 6.20701 2.90917 6.12547L2.65159 6.00956H11.083C11.5216 6.02585 11.9064 5.71946 11.9888 5.28834C12.0647 4.82027 11.7468 4.3793 11.2788 4.30337Z",
														}),
													]),
												],
												-1
											),
										]),
									8,
									m
								),
								(0, n.Lk)("div", p, [
									e[5] || (e[5] = (0, n.eW)(" PAGE ", -1)),
									(0, n.Lk)("span", g, (0, a.v_)(t.adminFilterList.page), 1),
									(0, n.eW)(" / " + (0, a.v_)(Math.ceil(t.adminFilterList.count / 12) <= 0 ? "1" : Math.ceil(t.adminFilterList.count / 12)), 1),
								]),
								(0, n.Lk)(
									"button",
									{onClick: e[1] || (e[1] = (e) => L.adminSetPage(t.adminFilterList.page + 1)), class: "button-next", disabled: t.adminFilterList.page >= Math.ceil(t.adminFilterList.count / 12)},
									e[6] ||
										(e[6] = [
											(0, n.Lk)(
												"div",
												{class: "button-inner"},
												[
													(0, n.Lk)("svg", {width: "12", height: "11", viewBox: "0 0 12 11", fill: "none", xmlns: "http://www.w3.org/2000/svg"}, [
														(0, n.Lk)("path", {
															d: "M0.721245 4.30337C0.770346 4.2954 0.820037 4.29173 0.869755 4.29237H9.33553L9.15093 4.20651C8.97049 4.12111 8.80634 4.00487 8.66583 3.86307L6.29181 1.48906C5.97915 1.19059 5.92661 0.710444 6.16731 0.351417C6.44746 -0.0311676 6.9847 -0.114237 7.36731 0.165907C7.39822 0.188552 7.4276 0.213237 7.45521 0.2398L11.7482 4.53278C12.0837 4.8679 12.084 5.41152 11.7489 5.74702C11.7486 5.74723 11.7484 5.74747 11.7482 5.74769L7.45521 10.0407C7.11944 10.3755 6.57582 10.3747 6.24097 10.039C6.21462 10.0125 6.19001 9.98443 6.16731 9.95481C5.92661 9.59578 5.97915 9.11564 6.29181 8.81717L8.66153 6.43886C8.78751 6.31275 8.93234 6.20701 9.09083 6.12547L9.34841 6.00956H0.917005C0.478396 6.02585 0.0935841 5.71946 0.0111866 5.28834C-0.0647192 4.82027 0.253177 4.3793 0.721245 4.30337Z",
														}),
													]),
												],
												-1
											),
										]),
									8,
									f
								),
							]),
						]),
						(0, n.Lk)("div", v, [
							(0, n.bF)(w),
							(0, n.Lk)("div", b, [
								(0, n.bo)((0, n.Lk)("input", {"onUpdate:modelValue": e[2] || (e[2] = (t) => (x.adminPhrase = t)), type: "text", placeholder: "Enter phrase here..."}, null, 512), [
									[s.Jo, x.adminPhrase],
								]),
								(0, n.Lk)("button", {onClick: e[3] || (e[3] = (...t) => L.adminAddButton && L.adminAddButton(...t))}, "ADD PHRASE"),
							]),
						]),
					])
				);
			}
			var x = i(66278),
				L = i(87069);
			i(18111), i(22489);
			const _ = {class: "admin-filter-element"},
				y = {class: "element-section section-phrase"},
				w = {class: "section-content"},
				C = {class: "element-section section-option"},
				S = {class: "section-content"};
			function A(t, e, i, s, o, r) {
				return (
					(0, n.uX)(),
					(0, n.CE)("div", _, [
						(0, n.Lk)("div", y, [e[1] || (e[1] = (0, n.Lk)("div", {class: "section-title"}, "PHRASE", -1)), (0, n.Lk)("div", w, (0, a.v_)(i.filter.phrase), 1)]),
						(0, n.Lk)("div", C, [
							e[3] || (e[3] = (0, n.Lk)("div", {class: "section-title"}, "OPTION", -1)),
							(0, n.Lk)("div", S, [
								(0, n.Lk)(
									"button",
									{onClick: e[0] || (e[0] = (t) => r.adminRemoveButton())},
									e[2] ||
										(e[2] = [
											(0, n.Lk)(
												"svg",
												{xmlns: "http://www.w3.org/2000/svg", width: "11", viewBox: "0 0 448 512"},
												[
													(0, n.Lk)("path", {
														d: "M135.2 17.7C140.6 6.8 151.7 0 163.8 0H284.2c12.1 0 23.2 6.8 28.6 17.7L320 32h96c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 96 0 81.7 0 64S14.3 32 32 32h96l7.2-14.3zM32 128H416V448c0 35.3-28.7 64-64 64H96c-35.3 0-64-28.7-64-64V128zm96 64c-8.8 0-16 7.2-16 16V432c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16V432c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16V432c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16z",
													}),
												],
												-1
											),
											(0, n.eW)(" REMOVE ", -1),
										])
								),
							]),
						]),
					])
				);
			}
			var M = {
					name: "AdminFilterElement",
					props: ["filter"],
					methods: {
						...(0, x.i0)(["adminSendFilterRemoveSocket"]),
						adminRemoveButton() {
							const t = {filterId: this.filter._id};
							this.adminSendFilterRemoveSocket(t);
						},
					},
				},
				F = i(66262);
			const D = (0, F.A)(M, [
				["render", A],
				["__scopeId", "data-v-74cde30c"],
			]);
			var E = D,
				T = i(41167),
				P = {
					name: "AdminAffiliates",
					components: {LoadingAnimation: L.A, AdminFilterElement: E, AdminFilterSearch: T.A},
					data() {
						return {adminPhrase: null};
					},
					methods: {
						...(0, x.i0)(["notificationShow", "adminGetFilterListSocket", "adminSetFilterListPage", "adminSetFilterSearch", "adminSendFilterCreateSocket"]),
						adminSetPage(t) {
							if (this.adminFilterList.page === t) return;
							if (t < 1 || t > Math.ceil(this.adminFilterList.count / 12)) return;
							this.adminSetFilterListPage(t);
							const e = {page: this.adminFilterList.page, search: this.adminFilterSearch};
							this.adminGetFilterListSocket(e);
						},
						adminAddButton() {
							if (null === this.adminPhrase || "" === this.adminPhrase.trim()) return void this.notificationShow({type: "error", message: "Your entered filter phrase is invalid."});
							const t = {phrase: this.adminPhrase};
							this.adminSendFilterCreateSocket(t), (this.adminPhrase = null);
						},
					},
					computed: {...(0, x.L8)(["adminFilterList", "adminFilterSearch"])},
					created() {
						if (!1 === this.adminFilterList.loading) {
							const t = {page: this.adminFilterList.page, search: this.adminFilterSearch};
							this.adminGetFilterListSocket(t);
						}
					},
					beforeRouteLeave(t, e, i) {
						this.adminSetFilterSearch(""), i();
					},
				};
			const I = (0, F.A)(P, [
				["render", k],
				["__scopeId", "data-v-b213a6ec"],
			]);
			var B = I;
		},
		72445: function (t, e, i) {
			i.r(e),
				i.d(e, {
					default: function () {
						return f;
					},
				});
			var n = i(20641),
				s = i(53751),
				a = i(90033);
			const o = {class: "admin-support"},
				r = ["onClick"],
				l = ["onClick"],
				d = {key: 0, class: "modal"},
				c = {class: "modal-content"};
			function h(t, e, i, h, u, m) {
				return (
					(0, n.uX)(),
					(0, n.CE)("div", o, [
						e[24] || (e[24] = (0, n.Lk)("h1", null, "Customer Services Management", -1)),
						(0, n.Lk)(
							"form",
							{onSubmit: e[4] || (e[4] = (0, s.D$)((...t) => m.addCustomerService && m.addCustomerService(...t), ["prevent"]))},
							[
								e[12] || (e[12] = (0, n.Lk)("label", {for: "platform"}, "Platform:", -1)),
								(0, n.bo)(
									(0, n.Lk)(
										"select",
										{"onUpdate:modelValue": e[0] || (e[0] = (t) => (u.newCustomerService.platform = t)), required: ""},
										e[11] ||
											(e[11] = [
												(0, n.Fv)(
													'<option value="Telegram" data-v-480ffc8b>Telegram</option><option value="WhatsApp" data-v-480ffc8b>WhatsApp</option><option value="Live Support" data-v-480ffc8b>Live Support</option><option value="Facebook" data-v-480ffc8b>Facebook</option><option value="YouTube" data-v-480ffc8b>YouTube</option><option value="X" data-v-480ffc8b>X</option><option value="TikTok" data-v-480ffc8b>TikTok</option>',
													7
												),
											]),
										512
									),
									[[s.u1, u.newCustomerService.platform]]
								),
								e[13] || (e[13] = (0, n.Lk)("label", {for: "title"}, "Title:", -1)),
								(0, n.bo)((0, n.Lk)("input", {"onUpdate:modelValue": e[1] || (e[1] = (t) => (u.newCustomerService.title = t)), type: "text", required: ""}, null, 512), [
									[s.Jo, u.newCustomerService.title],
								]),
								e[14] || (e[14] = (0, n.Lk)("label", {for: "link"}, "Link:", -1)),
								(0, n.bo)((0, n.Lk)("input", {"onUpdate:modelValue": e[2] || (e[2] = (t) => (u.newCustomerService.link = t)), type: "text", required: ""}, null, 512), [
									[s.Jo, u.newCustomerService.link],
								]),
								e[15] || (e[15] = (0, n.Lk)("label", {for: "workingHours"}, "Working Hours:", -1)),
								(0, n.bo)(
									(0, n.Lk)("input", {"onUpdate:modelValue": e[3] || (e[3] = (t) => (u.newCustomerService.workingHours = t)), type: "text", placeholder: "09:00 - 18:00", required: ""}, null, 512),
									[[s.Jo, u.newCustomerService.workingHours]]
								),
								e[16] || (e[16] = (0, n.Lk)("button", {type: "submit"}, "Add Customer Service", -1)),
							],
							32
						),
						e[25] || (e[25] = (0, n.Lk)("h2", null, "Customer Services List", -1)),
						(0, n.Lk)("table", null, [
							e[17] ||
								(e[17] = (0, n.Lk)(
									"thead",
									null,
									[
										(0, n.Lk)("tr", null, [
											(0, n.Lk)("th", null, "Platform"),
											(0, n.Lk)("th", null, "Title"),
											(0, n.Lk)("th", null, "Link"),
											(0, n.Lk)("th", null, "Working Hours"),
											(0, n.Lk)("th", null, "Actions"),
										]),
									],
									-1
								)),
							(0, n.Lk)("tbody", null, [
								((0, n.uX)(!0),
								(0, n.CE)(
									n.FK,
									null,
									(0, n.pI)(
										u.customerServices,
										(t) => (
											(0, n.uX)(),
											(0, n.CE)("tr", {key: t._id}, [
												(0, n.Lk)("td", null, (0, a.v_)(t.platform), 1),
												(0, n.Lk)("td", null, (0, a.v_)(t.title), 1),
												(0, n.Lk)("td", null, (0, a.v_)(t.link), 1),
												(0, n.Lk)("td", null, (0, a.v_)(t.workingHours), 1),
												(0, n.Lk)("td", null, [
													(0, n.Lk)("button", {onClick: (e) => m.editCustomerService(t)}, "Edit", 8, r),
													(0, n.Lk)("button", {onClick: (e) => m.deleteCustomerService(t._id)}, "Delete", 8, l),
												]),
											])
										)
									),
									128
								)),
							]),
						]),
						u.editMode
							? ((0, n.uX)(),
							  (0, n.CE)("div", d, [
									(0, n.Lk)("div", c, [
										e[19] || (e[19] = (0, n.Lk)("h3", null, "Edit Customer Service", -1)),
										e[20] || (e[20] = (0, n.Lk)("label", {for: "platform"}, "Platform:", -1)),
										(0, n.bo)(
											(0, n.Lk)(
												"select",
												{"onUpdate:modelValue": e[5] || (e[5] = (t) => (u.editCustomerServiceData.platform = t)), required: ""},
												e[18] || (e[18] = [(0, n.Lk)("option", {value: "Telegram"}, "Telegram", -1), (0, n.Lk)("option", {value: "WhatsApp"}, "WhatsApp", -1)]),
												512
											),
											[[s.u1, u.editCustomerServiceData.platform]]
										),
										e[21] || (e[21] = (0, n.Lk)("label", {for: "title"}, "Title:", -1)),
										(0, n.bo)((0, n.Lk)("input", {"onUpdate:modelValue": e[6] || (e[6] = (t) => (u.editCustomerServiceData.title = t)), type: "text", required: ""}, null, 512), [
											[s.Jo, u.editCustomerServiceData.title],
										]),
										e[22] || (e[22] = (0, n.Lk)("label", {for: "link"}, "Link:", -1)),
										(0, n.bo)((0, n.Lk)("input", {"onUpdate:modelValue": e[7] || (e[7] = (t) => (u.editCustomerServiceData.link = t)), type: "text", required: ""}, null, 512), [
											[s.Jo, u.editCustomerServiceData.link],
										]),
										e[23] || (e[23] = (0, n.Lk)("label", {for: "workingHours"}, "Working Hours:", -1)),
										(0, n.bo)(
											(0, n.Lk)(
												"input",
												{"onUpdate:modelValue": e[8] || (e[8] = (t) => (u.editCustomerServiceData.workingHours = t)), type: "text", placeholder: "09:00 - 18:00", required: ""},
												null,
												512
											),
											[[s.Jo, u.editCustomerServiceData.workingHours]]
										),
										(0, n.Lk)("button", {onClick: e[9] || (e[9] = (...t) => m.updateCustomerService && m.updateCustomerService(...t))}, "Save Changes"),
										(0, n.Lk)("button", {onClick: e[10] || (e[10] = (...t) => m.cancelEdit && m.cancelEdit(...t))}, "Cancel"),
									]),
							  ]))
							: (0, n.Q3)("", !0),
					])
				);
			}
			var u = i(94335),
				m = {
					data() {
						return {customerServices: [], newCustomerService: {platform: "", title: "", link: "", workingHours: ""}, editCustomerServiceData: null, editMode: !1};
					},
					mounted() {
						this.fetchCustomerServices();
					},
					methods: {
						async fetchCustomerServices() {
							const t = await u.A.get("https://api.guotai9189.com/customerservices");
							this.customerServices = t.data;
						},
						async addCustomerService() {
							try {
								await u.A.post("https://api.guotai9189.com/customerservices/add", this.newCustomerService),
									this.fetchCustomerServices(),
									(this.newCustomerService = {platform: "", title: "", link: "", workingHours: ""});
							} catch (t) {
								console.error("Error adding customer service:", t);
							}
						},
						editCustomerService(t) {
							(this.editCustomerServiceData = {...t}), (this.editMode = !0);
						},
						async updateCustomerService() {
							try {
								await u.A.put(`https://api.guotai9189.com/customerservices/${this.editCustomerServiceData._id}`, this.editCustomerServiceData), this.fetchCustomerServices(), (this.editMode = !1);
							} catch (t) {
								console.error("Error updating customer service:", t);
							}
						},
						async deleteCustomerService(t) {
							try {
								await u.A.delete(`https://api.guotai9189.com/customerservices/${t}`), this.fetchCustomerServices();
							} catch (e) {
								console.error("Error deleting customer service:", e);
							}
						},
						cancelEdit() {
							this.editMode = !1;
						},
					},
				},
				p = i(66262);
			const g = (0, p.A)(m, [
				["render", h],
				["__scopeId", "data-v-480ffc8b"],
			]);
			var f = g;
		},
	},
]);
//# sourceMappingURL=group-admin.c436612c.js.map
