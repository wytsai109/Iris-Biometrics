# Iris Biometrics OS (虹膜辨識與特徵比對系統 - 純 JavaScript 版)

> 🔬 基於 John Daugman 經典虹膜辨識演算法與 6 通道 Gabor 濾波器，以 100% 原生 JavaScript (HTML5 Canvas / TypedArray) 實現。無需任何後端、無需外部依賴或額外編譯，直接在現代瀏覽器中即時運作。

---

## 🌟 核心特色

1. **完整 Daugman 生物辨識演算法管線**:
   - **灰階轉換 (Grayscale)**: 以亮度加權演算法 ($0.299R + 0.587G + 0.114B$) 處理影像像素陣列。
   - **瞳孔與外圈定位 (Boundary Detection)**: 數值積分尋找徑向梯度跳躍點，偵測瞳孔內圈半徑與鞏膜外圈邊緣 (Limbus)。
   - **Daugman 橡皮板模型 (Rubber Sheet Model)**: 極座標 $(r, \theta)$ 展開為 $256 \times 48$ 矩形標準化環形帶，有效消除瞳孔收縮與擴張變形。
   - **6 通道 2D Gabor 濾波器**: 透過 6 組不同尺度與角度之複數小波核抽取紋理特徵。
   - **IrisCode 相位編碼**: 2-bit 象限相位量化，產出特異性編碼。
   - **皮爾森相關係數 (Pearson Correlation)**: 實作 $n=253$ 浮點數特徵向量相關度比對公式。
   - **漢明距離 (Hamming Distance)**: 比對 IrisCode 位元異同率。

2. **高科技生物識別終端介面 (Biometric Cyberpunk UI)**:
   - 基準樣本 (Subject A) 與 待驗樣本 (Subject B) 雙畫布即時 1:1 比對。
   - 內建程序化真實虹膜合成器（包含瞳孔縮放、虹膜冠、梳狀纖維與隱窩紋理），開箱即測。
   - 支援本機圖片上傳與 WebRTC 攝影機即時截圖辨識。
   - 包含掃描光束、定位十字準星與即時決策儀表板。

---

## 🚀 快速啟動

雙擊專案目錄下的 `start.bat`，系統會自動優先以 **Brave 瀏覽器** 開啟：

```cmd
start.bat
```

或使用本機 HTTP 伺服器啟動：

```bash
python -m http.server 8081
# 接著在瀏覽器打開 http://localhost:8081
```

---

## 📁 專案架構

```
Iris-recognition/
├── index.html         # 生物辨識終端主頁面與管線可視化視窗
├── style.css          # 高科技暗黑質感樣式 (Cyberpunk / FaceID 視覺)
├── iris_engine.js     # 虹膜辨識核心演算法庫 (純 JS 實現 Daugman & Gabor & Pearson)
├── app.js             # UI 控制器、程序化虹膜生成器與即時比對決策
├── start.bat          # 一鍵啟動腳本 (優先調用 Brave 瀏覽器)
└── README.md          # 專案詳細說明文件
```

---

## 🧮 演算法原理說明

### 1. 皮爾森相關係數 (Pearson Correlation Coefficient)
$$r = \frac{n \sum XY - \sum X \sum Y}{\sqrt{[n \sum X^2 - (\sum X)^2][n \sum Y^2 - (\sum Y)^2]}}$$
其中 $n = 253$。當 $r \ge 0.70$ 時，判定為高相關性匹配。

### 2. Daugman 漢明距離 (Hamming Distance)
$$HD = \frac{1}{N} \sum_{j=1}^{N} \text{CodeA}_j \oplus \text{CodeB}_j$$
理論上不同人的虹膜經過 Gabor 相位編碼後，其漢明距離服從平均值 $0.5$ 的二項分佈；當 $HD \le 0.33$ 時，誤判率低於數十億分之一。
