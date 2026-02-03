// js/scanner.js

// カメラの映像ストリームなどを保存しておく変数
let scanStream = null;
let scanTimer = null; // 定期実行のタイマーID
let scanning = false; // 現在スキャン中かどうかのフラグ

// HTML要素をまとめて取得
const els = {
  modal: document.getElementById("scanModal"),
  video: document.getElementById("scanVideo"),
  msg: document.getElementById("scanMsg"),
  canvas: document.getElementById("scanCanvas"),
  closeBtn: document.getElementById("scanClose")
};

// メッセージ表示用の便利関数
function setMsg(t){ if(els.msg) els.msg.textContent = t; }

// カメラを起動する非同期関数
async function startCamera(){
  // navigator.mediaDevices.getUserMedia でカメラアクセスを要求
  // video: { facingMode: "environment" } は「背面カメラ」を優先する設定
  scanStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
    audio: false // 音声は不要
  });
  // ビデオタグにカメラ映像をセット
  els.video.srcObject = scanStream;
  // 再生開始（awaitで再生されるまで待つ）
  await els.video.play();
}

// カメラを停止する関数
function stopCamera(){
  // 解析ループ（タイマー）が動いていれば止める
  if (scanTimer) { clearInterval(scanTimer); scanTimer = null; }
  // カメラストリームがあれば停止処理を行う
  if (scanStream) {
    scanStream.getTracks().forEach(t => t.stop()); // 全トラック停止
    scanStream = null;
  }
  // ビデオタグとの紐付けを解除
  els.video.srcObject = null;
}

// 外部から呼び出せる初期化関数
// callback: QRコードが見つかった時に実行する関数
export function initScanner(callback){
  
  // モーダルを閉じてカメラを止める関数
  const closeScanModal = () => {
    scanning = false;
    els.modal.style.display = "none";
    stopCamera();
    setMsg("");
  };

  // モーダルを開いてカメラを開始する関数
  const openScanModal = async () => {
    stopCamera(); // 念のため一度止める
    scanning = false;
    els.modal.style.display = "block"; // モーダル表示
    setMsg("カメラを起動します。許可してください。");

    // カメラ機能が使えるブラウザかチェック
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMsg("この環境ではカメラAPIが利用できません。");
      return;
    }

    try{
      setMsg("カメラを起動中…");
      await startCamera(); // カメラ起動待機
      scanning = true;     // スキャン中フラグON
      startScanLoop();     // 解析ループ開始
    }catch(e){
      console.error(e);
      setMsg("カメラの起動に失敗しました。");
      stopCamera();
    }
  };

  // 定期的に画像を解析するループ関数
  const startScanLoop = async () => {
    // ブラウザ標準のQR解析機能があるか？
    const hasBarcodeDetector = ("BarcodeDetector" in window);
    // 外部ライブラリ jsQR が読み込まれているか？
    const hasJsQR = (typeof window.jsQR !== "undefined");

    let detector = null;
    // 標準機能が使えるならインスタンス作成
    if (hasBarcodeDetector) {
      try { detector = new BarcodeDetector({ formats: ["qr_code"] }); } catch(e){}
    }
    
    // jsQR用にキャンバスのコンテキストを取得（willReadFrequentlyは高速化オプション）
    const ctx = els.canvas.getContext("2d", { willReadFrequently: true });
    
    // ユーザーへのメッセージ更新
    setMsg(detector ? "QRコードを枠内に写してください…" : "QRコードを枠内に写してください…（JS解析）");

    // 200ミリ秒ごとに実行するタイマーセット
    scanTimer = setInterval(async () => {
      // スキャン中でない、またはビデオの準備ができていなければ何もしない
      if (!scanning || !els.video || els.video.readyState < 2) return;

      try{
        // 1. BarcodeDetector (Android/Chrome等で使える高速な標準機能)
        if (detector) {
          const barcodes = await detector.detect(els.video);
          if (barcodes.length > 0) {
            const val = barcodes[0].rawValue;
            // 値が取れたらコールバック実行して終了
            if(val) { callback(val); closeScanModal(); return; }
          }
        }

        // 2. jsQR Fallback (iOS/Safari等、標準機能がない場合)
        if (hasJsQR) {
          const vw = els.video.videoWidth;
          const vh = els.video.videoHeight;
          // 処理を軽くするため、幅640px程度に縮小して解析する
          const targetW = 640;
          const scale = Math.min(1, targetW / vw); // 縮小率計算
          const w = Math.floor(vw * scale);
          const h = Math.floor(vh * scale);

          // キャンバスのサイズを合わせて画像をビデオからコピー
          els.canvas.width = w;
          els.canvas.height = h;
          ctx.drawImage(els.video, 0, 0, w, h);
          
          // 画像データを取得
          const imageData = ctx.getImageData(0, 0, w, h);
          // jsQRで解析実行
          const code = window.jsQR(imageData.data, w, h, { inversionAttempts: "attemptBoth" }); // 白黒反転QRも試す
          if (code && code.data) { callback(code.data); closeScanModal(); return; }
        }
      }catch(e){
        // 解析エラーは無視して次のループへ
      }
    }, 200);
  };

  // イベント登録
  document.getElementById("scan").addEventListener("click", openScanModal); // QRボタン
  els.closeBtn.addEventListener("click", closeScanModal); // 閉じるボタン
  els.modal.addEventListener("click", (e) => { 
    // 背景（黒い部分）をクリックしたら閉じる
    if(e.target === els.modal) closeScanModal(); 
  });
}
