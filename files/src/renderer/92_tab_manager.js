"use strict";

function NewTabManager(hub) {
	let manager = Object.create(null);

	manager.hub = hub;
	manager.tabs = [];
	manager.active_tab_id = null;
	manager.next_tab_id = 1;

	manager.active = function() {
		if (this.active_tab_id === null) {
			throw new Error("NewTabManager.active(): no active tab");
		}
		let tab = this.find(this.active_tab_id);
		if (!tab) {
			throw new Error("NewTabManager.active(): invalid active tab");
		}
		return tab;
	};

	manager.find = function(id) {
		for (let tab of this.tabs) {
			if (tab.id === id) {
				return tab;
			}
		}
		return null;
	};

	manager.new_tab = function() {
		let tab = NewTab(this.next_tab_id, this.hub);
		this.next_tab_id++;
		this.tabs.push(tab);
		if (this.active_tab_id === null) {
			this.active_tab_id = tab.id;
		}
		return tab;
	};

	manager.close_tab = function(id) {
		if (this.tabs.length <= 1) {
			return null;
		}
		let index = this.tabs.findIndex(tab => tab.id === id);
		if (index < 0) {
			return null;
		}
		return this.tabs.splice(index, 1)[0];
	};

	manager.switch_to = function(id) {
		if (!this.find(id)) {
			throw new Error("NewTabManager.switch_to(): bad tab id");
		}
		this.active_tab_id = id;
		return this.active();
	};

	manager.next_tab = function() {
		if (this.tabs.length === 0) {
			return null;
		}
		let index = this.tabs.findIndex(tab => tab.id === this.active_tab_id);
		if (index < 0) {
			return this.tabs[0].id;
		}
		return this.tabs[(index + 1) % this.tabs.length].id;
	};

	manager.previous_tab = function() {
		if (this.tabs.length === 0) {
			return null;
		}
		let index = this.tabs.findIndex(tab => tab.id === this.active_tab_id);
		if (index < 0) {
			return this.tabs[0].id;
		}
		return this.tabs[(index + this.tabs.length - 1) % this.tabs.length].id;
	};

	manager.count = function() {
		return this.tabs.length;
	};

	return manager;
}
