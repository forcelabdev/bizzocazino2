module.exports = {
	apps: [
		{
			name: "Bizzocazino-backend",
			script: "index.js",
			exec_mode: "cluster",
			instances: 4,
			env: {
				NODE_ENV: "production"
			}
		}
	]
}
