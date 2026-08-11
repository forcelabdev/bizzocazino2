module.exports = {
	apps: [
		{
			name: "Bizzocazino-backend",
			script: "app.js",
			exec_mode: "cluster",
			instances: 4,
			env: {
				NODE_ENV: "production"
			}
		}
	]
}