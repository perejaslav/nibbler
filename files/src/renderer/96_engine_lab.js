"use strict";

function NewEngineLabView(hub) {
	let view = Object.create(null);

	function safe(value) {
		return SafeStringHTML(value === null || value === undefined ? "" : String(value));
	}

	function score_text(info) {
		if (!info) return "—";
		if (info.score && info.score.type === "mate") return `M${info.score.value}`;
		if (info.score && info.score.type === "cp") {
			let pawns = info.score.value / 100;
			return `${pawns >= 0 ? "+" : ""}${pawns.toFixed(2)}`;
		}
		return info.wdl ? `${Math.round((info.wdl.win + info.wdl.draw * 0.5) / 10)}%` : "—";
	}

	function session_card(session) {
		let info = session.lastInfo;
		let engine_name = session.name || (session.engine && session.engine.name) || session.profileKey || session.sessionId;
		let pv = info && Array.isArray(info.pv) ? info.pv.join(" ") : "";
		return `<section class="engine-lab-card">
			<div class="engine-lab-card-title">${safe(engine_name)}</div>
			<div class="engine-lab-card-state">${safe(session.lifecycleState)} / ${safe(session.searchState)}</div>
			<div class="engine-lab-card-stats">${safe(score_text(info))} | depth ${safe(info && info.depth)} | ${safe(info && info.nodes)} nodes | ${safe(info && info.nps)} n/s</div>
			<div class="engine-lab-card-pv">${safe(pv)}</div>
		</section>`;
	}

	view.draw = function() {
		let tab = hub.active_tab();
		if (!tab || !tab.comparison_mode) return;
		let sessions = hub.engine_manager.sessions_for_tab(tab.id);
		let consensus = hub.engine_manager.get_consensus(tab.id);
		let candidate_rows = consensus.candidates.map(candidate =>
			`<div class="engine-lab-candidate"><span>${safe(candidate.move)}</span><span>${candidate.support}/${consensus.agreement.total}</span><span>${candidate.averageQ === null ? "—" : candidate.averageQ.toFixed(3)}</span></div>`
		).join("");
		enginebox.innerHTML = `<div class="engine-lab-panel">
			<div class="engine-lab-heading">Engine comparison</div>
			<div class="engine-lab-cards">${sessions.map(session_card).join("")}</div>
			<div class="engine-lab-consensus">Consensus: ${safe(consensus.agreement.level)} | Best move: ${safe(consensus.bestMove)} | Support: ${consensus.agreement.support}/${consensus.agreement.total}</div>
			<div class="engine-lab-candidates">${candidate_rows}</div>
		</div>`;
	};

	return view;
}
