const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const User = require("../database/models/User");
const Setting = require("../database/models/Setting");
const {
  ACCOUNT_SUSPENDED_CODE,
  assertUserNotSuspended,
  sendUserSuspensionResponse,
} = require("../utils/userSuspension");

 
// Google Login
exports.googleLogin = async (req, res) => {
  try {
    const token = req.body.token || req.body.credential;

    if (!token) {
      return res.status(400).json({ success: false, message: "Missing Google ID token" });
    }

    // 🔑 Setting modelinden auth bilgilerini çek
    const settings = await Setting.findOne();
    if (!settings || !settings.auth?.google?.enabled) {
      return res.status(400).json({ success: false, message: "Google login is disabled" });
    }

    const GOOGLE_CLIENT_ID = settings.auth.google.clientId;
    const JWT_SECRET = settings.auth.jwt.secret;
    const JWT_EXPIRES = settings.auth.jwt.expiresIn;

    const client = new OAuth2Client(GOOGLE_CLIENT_ID);

    // 1. Google token doğrula
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub, email, name, picture } = payload;

    if (!sub) {
      return res.status(400).json({ success: false, message: "Invalid Google token" });
    }

    // 2. Kullanıcıyı bul
    let user = await User.findOne({ "google.id": sub });

    if (!user) {
      if (email) {
        user = await User.findOne({ "local.email": email });
      }

      if (user) {
        user.google = { id: sub, email };
        await user.save();
      } else {
        // Yeni kullanıcı oluştur
        user = new User({
          name: name || (email ? email.split("@")[0] : `google_${Date.now()}`),
          username: (email ? email.split("@")[0] : "googleuser") + "_" + Date.now(),
          local: { email: email || null, emailVerified: !!email },
          google: { id: sub, email },
          avatar: picture,
          phone: null, // Eksik olacak
          currency: { fiatCurrency: null } // Eksik olacak
        });
        await user.save();
      }
    }

    assertUserNotSuspended(user);

    // 3. JWT oluştur
    const tokenJwt = jwt.sign(
      { id: user._id, email: user.local?.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    // 4. Eksik bilgi kontrolü
    if (!user.phone || !user.currency?.fiatCurrency) {
      return res.json({
        success: true,
        extraInfoRequired: true,
        userId: user._id,
        token: tokenJwt,
        user: {
          id: user._id,
          name: user.name,
          email: user.local?.email,
          avatar: user.avatar,
          phone: user.phone || null,
          fiatCurrency: user.currency?.fiatCurrency || null,
        },
      });
    }

    // 5. Normal login
    res.json({
      success: true,
      token: tokenJwt,
      user: {
        id: user._id,
        name: user.name,
        email: user.local?.email,
        avatar: user.avatar,
        phone: user.phone || null,
        fiatCurrency: user.currency?.fiatCurrency || null,
      },
    });

  } catch (error) {
    console.error("Google login error:", error);
    if (error.code === ACCOUNT_SUSPENDED_CODE) {
      return sendUserSuspensionResponse(res);
    }
    res.status(401).json({ success: false, message: "Google login failed" });
  }
};


// Social login sonrası eksik bilgileri tamamlama
exports.completeSocialLogin = async (req, res) => {
  try {
    const { userId, phone, fiatCurrency } = req.body;

    if (!userId || !phone || !fiatCurrency) {
      return res.status(400).json({
        success: false,
        message: "UserId, phone and fiatCurrency are required",
      });
    }

    // Kullanıcıyı bul
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    assertUserNotSuspended(user);

    // Telefon + fiatCurrency kaydet
    user.phone = phone;
    user.currency = { fiatCurrency };
    await user.save();

    // ✅ JWT verelim ki kullanıcı direkt giriş yapabilsin
    const settings = await Setting.findOne();
    const JWT_SECRET = settings.auth.jwt.secret;
    const JWT_EXPIRES = settings.auth.jwt.expiresIn;

    const tokenJwt = jwt.sign(
      { id: user._id, email: user.local?.email || user.google?.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({
      success: true,
      message: "Social login completed successfully",
      token: tokenJwt,
      user: {
        id: user._id,
        name: user.name,
        email: user.local?.email || user.google?.email,
        phone: user.phone,
        fiatCurrency: user.currency?.fiatCurrency,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error("completeSocialLogin error:", err);
    if (err.code === ACCOUNT_SUSPENDED_CODE) {
      return sendUserSuspensionResponse(res);
    }
    res.status(500).json({ success: false, message: "Server error" });
  }
};
