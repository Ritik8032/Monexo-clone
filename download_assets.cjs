const fs = require('fs');
const path = require('path');
const https = require('https');

const assets = [
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/airtel.jpg",
      "https://refer.tezflow.top/static/icon/airtel.jpg"
    ],
    paths: ["static/icon/airtel.jpg", "static/images/airtel.jpg"]
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/amazon.png",
      "https://refer.tezflow.top/static/icon/amazon.png"
    ],
    paths: ["static/icon/amazon.png", "static/images/amazon.png"]
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/bharatpe.png",
      "https://refer.tezflow.top/static/icon/bharatpe.png"
    ],
    paths: ["static/icon/bharatpe.png", "static/images/bharatpe.png"]
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/esaf.png",
      "https://refer.tezflow.top/static/icon/esaf.png"
    ],
    paths: ["static/icon/esaf.png", "static/images/esaf.png"]
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/freecharge.png",
      "https://refer.tezflow.top/static/icon/freecharge.png"
    ],
    paths: ["static/icon/freecharge.png", "static/images/freecharge.png"]
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/IndusPay.png",
      "https://refer.tezflow.top/static/icon/IndusPay.png"
    ],
    paths: ["static/icon/IndusPay.png", "static/images/IndusPay.png"]
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/iob.png",
      "https://refer.tezflow.top/static/icon/iob.png"
    ],
    paths: ["static/icon/iob.png", "static/images/iob.png"]
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/jiof.jpg",
      "https://refer.tezflow.top/static/icon/jiof.jpg"
    ],
    paths: ["static/icon/jiof.jpg", "static/images/jiof.jpg"]
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/mobikwik.png",
      "https://refer.tezflow.top/static/icon/mobikwik.png"
    ],
    paths: ["static/icon/mobikwik.png", "static/images/mobikwik.png"]
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/navi.png",
      "https://refer.tezflow.top/static/icon/navi.png"
    ],
    paths: ["static/icon/navi.png", "static/images/navi.png"]
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/paytm.png",
      "https://refer.tezflow.top/static/icon/paytm.png"
    ],
    paths: ["static/icon/paytm.png", "static/images/paytm.png"]
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/paytm_business.png",
      "https://refer.tezflow.top/static/icon/paytm_business.png"
    ],
    paths: ["static/icon/paytm_business.png", "static/images/paytm_business.png"]
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/phonepe.png",
      "https://refer.tezflow.top/static/icon/phonepe.png"
    ],
    paths: ["static/icon/phonepe.png", "static/images/phonepe.png"]
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/phonepe_business.png",
      "https://refer.tezflow.top/static/icon/phonepe_business.png"
    ],
    paths: ["static/icon/phonepe_business.png", "static/images/phonepe_business.png"]
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/slice.png",
      "https://refer.tezflow.top/static/icon/slice.png"
    ],
    paths: ["static/icon/slice.png", "static/images/slice.png"]
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/utkarsh.jpg",
      "https://refer.tezflow.top/static/icon/utkarsh.jpg"
    ],
    paths: ["static/icon/utkarsh.jpg", "static/images/utkarsh.jpg"]
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/avatar.png",
      "https://refer.tezflow.top/static/images/avatar.png"
    ],
    paths: ["static/images/avatar.png", "static/icon/avatar.png"]
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/Linkupi.png",
      "https://refer.tezflow.top/static/icon/Linkupi.png"
    ],
    paths: ["static/icon/Linkupi.png", "static/images/Linkupi.png"]
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/UPItutorial.png",
      "https://refer.tezflow.top/static/icon/UPItutorial.png"
    ],
    paths: ["static/icon/UPItutorial.png", "static/images/UPItutorial.png"]
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/i.png",
      "https://refer.tezflow.top/static/icon/i.png"
    ],
    paths: ["static/icon/i.png", "static/images/i.png"]
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/teamlelve.png",
      "https://refer.tezflow.top/static/icon/teamlelve.png"
    ],
    paths: ["static/icon/teamlelve.png", "static/images/teamlelve.png"]
  },
  // Login Phone (Uses password.png as per prompt: "password.png Ise login page pe phone wale png me dalo")
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/password.png",
      "https://web.tivrapay.com/static/icon/password.png"
    ],
    paths: ["static/icon/phone.png", "static/images/phone.png"]
  },
  // Login Password (Uses phone.png as per prompt: "and ise password wale me https://.../phone.png")
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/phone.png",
      "https://web.tivrapay.com/static/icon/phone.png"
    ],
    paths: ["static/icon/password.png", "static/images/password.png"]
  },
  // Today Profit (Uses gift.png as per prompt: "today profit me ye gift.png")
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/gift.png",
      "https://web.tivrapay.com/static/icon/gift.png"
    ],
    paths: ["static/icon/profit.png", "static/images/profit.png", "static/icon/gift.png", "static/images/gift.png"]
  },
  // Batch (upi sell / activity history) (Uses batch.png as per prompt: "upi sell me ye batch.png" and "activity history me ye batch.png")
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/batch.png",
      "https://web.tivrapay.com/static/icon/batch.png"
    ],
    paths: ["static/icon/batch.png", "static/images/batch.png", "static/icon/upi.png", "static/images/upi.png"]
  },
  // Deposit history (buy history / transfer token) (Uses deposithistory.png as per prompt: "buy history me ye deposithistory.png" and "transfer token me ye deposithistory.png")
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/deposithistory.png",
      "https://web.tivrapay.com/static/icon/deposithistory.png"
    ],
    paths: ["static/icon/deposithistory.png", "static/images/deposithistory.png"]
  },
  // Service (official service) (Uses service.png as per prompt: "official service me ye service.png")
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/service.png",
      "https://web.tivrapay.com/static/icon/service.png"
    ],
    paths: ["static/icon/service.png", "static/images/service.png"]
  },
  // Modify password (Uses password.png as per prompt: "modify password me ye password.png")
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/password.png",
      "https://web.tivrapay.com/static/icon/password.png"
    ],
    paths: ["static/icon/modify_password.png", "static/images/modify_password.png"]
  },
  // Register page (Uses register.png as per prompt: "Ragistr page ye png lagaoo https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/register.png")
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/register.png",
      "https://web.tivrapay.com/static/icon/register.png"
    ],
    paths: ["static/icon/register.png", "static/images/register.png"]
  },
  // Copy / teamCopy
  // Swapped to match user request:
  // - copy.png URL maps to static/icon/teamCopy.png so it is used for the link copy button in the team page.
  // - teamCopy.png URL maps to static/icon/copy.png so it is used for the number and ID copy buttons in account information.
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/teamCopy.png",
      "https://refer.tezflow.top/static/icon/teamCopy.png"
    ],
    paths: ["static/icon/copy.png", "static/images/copy.png"]
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/copy.png",
      "https://refer.tezflow.top/static/icon/copy.png"
    ],
    paths: ["static/icon/teamCopy.png", "static/images/teamCopy.png"]
  }
];

function tryDownload(urls, index = 0) {
  if (index >= urls.length) {
    return Promise.resolve(null);
  }
  const url = urls[index];
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode !== 200) {
        resolve(tryDownload(urls, index + 1));
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({ buffer: Buffer.concat(chunks), url });
      });
    }).on('error', () => {
      resolve(tryDownload(urls, index + 1));
    });
  });
}

async function run() {
  console.log("Downloading updated assets...");
  for (const asset of assets) {
    const result = await tryDownload(asset.urls);
    if (result) {
      asset.paths.forEach((destPath) => {
        const fullPath = path.join(__dirname, destPath);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath, result.buffer);
        console.log(`[+] Saved to ${destPath} (Downloaded from ${result.url})`);
      });
    } else {
      console.error(`[-] Failed to download any url for paths: ${asset.paths.join(', ')}`);
    }
  }
  console.log("Asset updates completed!");
}

run();
