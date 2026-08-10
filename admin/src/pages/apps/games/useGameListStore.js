import axios from "@axios";
import { defineStore } from "pinia";

export const useGameListStore = defineStore("GameListStore", {
	actions: {
		async fetchGames(params) {
			try {
				const { data } = await axios.get("/admin/games", { params });
				return data;
			} catch (error) {
				console.error("fetchGames error:", error);
				return { data: [], total: 0 };
			}
		},

		async deleteGame(id) {
			try {
				await axios.delete(`/admin/games/${id}`);
			} catch (error) {
				console.error("deleteGame error:", error);
				throw error;
			}
		},

		async updateGameFeature(id, featured) {
			try {
				await axios.put(`/admin/games/${id}`, { featured });
			} catch (error) {
				console.error("updateGameFeature error:", error);
				throw error;
			}
		},
	},
});
