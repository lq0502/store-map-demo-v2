// js/scanner.js
let scanStream = null;
let scanTimer = null;
let scanning = false;

// UI Elements
const els = {
  modal: document.getElementById("scanModal"),
  video: document.getElementById("scanVideo"),
  msg: document.getElementById("scanMsg"),
  canvas: document.getElementById("scanCanvas"),
  closeBtn: document.getElementById("scanClose")
};

function setMsg(t){ if(els.msg) els.msg.textContent = t; }

async function startCamera(){
  scanStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
    audio: false
  });
  els.video.srcObject = scanStream;
  await els.video.play();
}

function stopCamera(){
  if (scanTimer) { clearInterval(scanTimer); scanTimer = null; }
  if (scanStream) {
    scanStream.getTracks().forEach(t => t.stop());
    scanStream = null;
  }
  els.video.srcObject = null;
}

// callback: 成功扫码后调用的函数
export function initScanner(callback){
  
  const closeScanModal = () => {
    scanning = false;
    els.modal.style.display = "none";
    stopCamera();
    setMsg("");
  };

  const openScanModal = async () => {
    stopCamera();
    scanning = false;
    els.modal.style.display = "block";
    setMsg("カメラを起動します。許可してください。");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMsg("この環境ではカメラAPIが利用できません。");
      return;
    }

    try{
      setMsg("カメラを起動中…");
      await startCamera();
      scanning = true;
      startScanLoop();
    }catch(e){
      console.error(e);
      setMsg("カメラの起動に失敗しました。");
      stopCamera();
    }
  };

  const startScanLoop = async () => {
    const hasBarcodeDetector = ("BarcodeDetector" in window);
    const hasJsQR = (typeof window.jsQR !== "undefined");

    let detector = null;
    if (hasBarcodeDetector) {
      try { detector = new BarcodeDetector({ formats: ["qr_code"] }); } catch(e){}
    }
    
    const ctx = els.canvas.getContext("2d", { willReadFrequently: true });
    setMsg(detector ? "QRコードを枠内に写してください…" : "QRコードを枠内に写してください…（JS解析）");

    scanTimer = setInterval(async () => {
      if (!scanning || !els.video || els.video.readyState < 2) return;

      try{
        // 1. Native API
        if (detector) {
          const barcodes = await detector.detect(els.video);
          if (barcodes.length > 0) {
            const val = barcodes[0].rawValue;
            if(val) { callback(val); closeScanModal(); return; }
          }
        }

        // 2. jsQR Fallback
        if (hasJsQR) {
          const vw = els.video.videoWidth;
          const vh = els.video.videoHeight;
          const targetW = 640;
          const scale = Math.min(1, targetW / vw);
          const w = Math.floor(vw * scale);
          const h = Math.floor(vh * scale);

          els.canvas.width = w;
          els.canvas.height = h;
          ctx.drawImage(els.video, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);
          const code = window.jsQR(imageData.data, w, h, { inversionAttempts: "attemptBoth" });
          if (code && code.data) { callback(code.data); closeScanModal(); return; }
        }
      }catch(e){}
    }, 200);
  };

  // Bind Events
  document.getElementById("scan").addEventListener("click", openScanModal);
  els.closeBtn.addEventListener("click", closeScanModal);
  els.modal.addEventListener("click", (e) => { if(e.target === els.modal) closeScanModal(); });
}