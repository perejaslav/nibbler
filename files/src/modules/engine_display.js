"use strict";

function name_from_id_line(line) {
	if (typeof line !== "string" || !line.startsWith("id name ")) return "";
	return line.slice("id name ".length).trim();
}

module.exports = {name_from_id_line};
