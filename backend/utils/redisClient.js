const Redis = require("ioredis");

// Cluster mode'a (pm2 exec_mode: "cluster") geçiş nedeniyle eklendi:
// - Online kullanıcı seti artık process-local bir Set değil, TÜM instance'ların
//   paylaştığı bu Redis üzerinde tutuluyor (bkz. utils/io.js).
// - Socket.IO Redis adapter'ı (bkz. index.js) io.emit/broadcast'lerin sadece
//   isteği alan instance'a değil, TÜM instance'lara (ve onlara bağlı socket'lere)
//   ulaşmasını sağlıyor.
// Sunucuda zaten redis-server 127.0.0.1:6379'da çalışıyor (aaPanel ile kurulu),
// REDIS_HOST/REDIS_PORT env değişkenleri tanımlıysa onlar kullanılır.
const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

let sharedClient = null;

const buildOptions = () => ({
	host: REDIS_HOST,
	port: REDIS_PORT,
	password: REDIS_PASSWORD,
	// Socket.IO adapter'ı subscribe modundayken komut kuyruğa alınabilmeli;
	// bağlantı kopukluklarında istekleri sonsuza kadar bekletmemek için sınır koyuyoruz.
	maxRetriesPerRequest: 20,
	retryStrategy: (times) => Math.min(times * 200, 5000),
});

/**
 * Genel amaçlı (online kullanıcı seti gibi basit okuma/yazma) paylaşılan tekil Redis client.
 */
const getClient = () => {
	if (!sharedClient) {
		sharedClient = new Redis(buildOptions());
		sharedClient.on("error", (err) => {
			console.error("[Redis] Client hatası:", err.message);
		});
	}
	return sharedClient;
};

/**
 * Socket.IO Redis adapter'ı için ayrı pub/sub client çifti oluşturur.
 * Adapter kendi pub/sub bağlantılarını izole tutmalı, bu yüzden paylaşılan
 * genel client'tan AYRI instance döndürülür.
 */
const createRedisClients = () => {
	const pubClient = new Redis(buildOptions());
	const subClient = pubClient.duplicate();

	pubClient.on("error", (err) => console.error("[Redis][socket.io pub] hata:", err.message));
	subClient.on("error", (err) => console.error("[Redis][socket.io sub] hata:", err.message));

	return { pubClient, subClient };
};

module.exports = { getClient, createRedisClients };
