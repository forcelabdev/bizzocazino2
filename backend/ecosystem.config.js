module.exports = {
	apps: [
		{
			// ÖNEMLİ: pm2 process adı sunucuda ZATEN "bizzocazino2-backend" olarak
			// yönetiliyor (pm2 logs / pm2 restart komutlarında bu ad kullanılıyor).
			// Adı DEĞİŞTİRMEYİN — değiştirirseniz pm2 bunu YENİ bir process sayar,
			// eskisi silinmeden ikisi birlikte ayakta kalıp port çakışmasına yol açar.
			name: "bizzocazino2-backend",
			// Önceki config "app.js" yazıyordu ama gerçek giriş dosyası "index.js" —
			// bu script alanı gerçekte hiç kullanılmıyordu çünkü process pm2 dışında
			// "npm start" ile manuel başlatılıyordu. Artık pm2 bu dosyayı gerçekten
			// kullanacağı için doğru dosya adı kritik.
			script: "index.js",
			cwd: __dirname,

			// Zero-downtime deploy'un temeli: fork yerine cluster mode + birden
			// fazla instance. "pm2 reload bizzocazino2-backend" komutu instance'ları
			// TEK TEK (biri her zaman ayaktayken) yeniden başlatır — nginx'e gelen
			// hiçbir istek "Connection refused" almaz. instances: 2 sunucunun
			// kaynaklarına göre güvenli bir başlangıç; gerekirse artırılabilir.
			exec_mode: "cluster",
			instances: 2,

			// index.js artık server.listen() sonrası process.send("ready") gönderiyor.
			// wait_ready: true olmadan pm2, yeni worker'ın portu dinlemeye BAŞLADIĞI
			// anı değil, process'in sadece SPAWN olduğu anı "hazır" sayar — bu da
			// reload sırasında eski worker çok erken kapanıp kısa bir kesinti
			// penceresi (tam da bu kesintiyi düzeltmeye çalıştığımız pencere)
			// oluşmasına sebep olabilir.
			wait_ready: true,
			listen_timeout: 10000,

			// index.js SIGINT/SIGTERM alınca server.close() ile mevcut istekleri
			// bitirip kapanıyor; kill_timeout bu graceful shutdown'a pm2'nin ne kadar
			// süre tanıyacağını belirler (bu süre sonunda pm2 zorla SIGKILL gönderir).
			kill_timeout: 12000,

			// Art arda çöken bir process'i sonsuz hızda yeniden başlatıp CPU'yu
			// kilitlememek için artan bekleme süresi.
			exp_backoff_restart_delay: 200,

			env: {
				NODE_ENV: "production",
			},
		},
	],
};
