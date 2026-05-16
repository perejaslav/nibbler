"use strict";

function can_delete_other_lines(node) {
	if (!node) {
		return false;
	}

	if (!node.is_main_line()) {
		return true;
	}

	let current = node.get_root();
	while (current.children.length > 0) {
		if (current.children.length > 1) {
			return true;
		}
		current = current.children[0];
	}

	return false;
}

function build_movelist_context_menu_state(node) {
	if (!node) {
		return {
			can_return_to_main_line: false,
			can_promote_to_main_line: false,
			can_promote: false,
			can_delete_node: false,
			can_delete_children: false,
			can_delete_siblings: false,
			can_delete_other_lines: false,
		};
	}

	let has_parent = !!node.parent;
	let has_children = node.children.length > 0;
	let has_siblings = has_parent && node.parent.children.length > 1;
	let on_main_line = node.is_main_line();

	return {
		can_return_to_main_line: node.return_to_main_line_helper() !== node,
		can_promote_to_main_line: !on_main_line,
		can_promote: has_parent && node.parent.children[0] !== node,
		can_delete_node: has_parent,
		can_delete_children: has_children,
		can_delete_siblings: has_siblings,
		can_delete_other_lines: can_delete_other_lines(node),
	};
}

module.exports = {
	build_movelist_context_menu_state,
};
