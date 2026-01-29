## Quantum Runner（Flappy 風）簡易設計

### 目的

- 画面左に固定された量子ランナー（1 体）が、右から流れてくるコイン列（ステップ）に対し、リアルタイムに量子ゲートを配置して量子状態を変化させ、コイン取得数を最大化する。

---

## 1. ゲーム要素

### 1.1 レーン数

- `numQubits = 1` のとき：`2 lanes`
- `numQubits = 2` のとき：`4 lanes`
- 最大 `2 qubits` までプレイ可能。

### 1.2 レーンと基底状態の対応

- 1qubit（2 レーン）

  - Lane 1 ⇔ `|0>`
  - Lane 2 ⇔ `|1>`

- 2qubit（4 レーン）

  - Lane 1 ⇔ `|00>`
  - Lane 2 ⇔ `|01>`
  - Lane 3 ⇔ `|10>`
  - Lane 4 ⇔ `|11>`

※表記はゲーム内表示は Lane 1..4、内部はビット列で管理。

### 1.3 コイン列（ステップ）

- コインは一定秒数間隔で **縦の列（= step）**として生成され、右 → 左に流れる。
- step ごとに「コインが存在するレーン集合」が決まる。

  - 例：`{Lane1}`、`{Lane1, Lane2}`、`{Lane1, Lane4}`、`{Lane1, Lane2, Lane3, Lane4}` など。

- 常に画面上には **次の 2 ステップ分**が見える（`visibleSteps = 2`）。

---

## 2. 量子ランナーの状態モデル

### 2.1 入力

- 下部の `QamposerMicro` による回路編集。
- 回路が編集・配置されるたびに `onCircuitChange(circuitData)` が呼ばれる想定。
- `circuitData` をシミュレーションし、現在の量子状態（確率分布）を得る。

### 2.2 出力（ゲームロジックで必要な最小）

- `probabilities: Record<basisState, number>`

  - 1qubit：`{"0": p0, "1": p1}`
  - 2qubit：`{"00": p00, "01": p01, "10": p10, "11": p11}`

- 状態ベクトルや位相は本 MVP では不要（表示用途に使うなら任意）。

### 2.3 ランナーが「走るレーン」の定義（サンプル駆動にしない）

- 本ゲームでは、測定ショットで 1 レーンに確定させず、**確率分布をそのまま「ランナーが同時に走る割合」**として扱う。
- つまり、各レーンに「分身（ghost）」が存在し、レーン i の存在量は `p_i` とする。

---

## 3. スコア（コイン獲得）ロジック

### 3.1 ステップ判定タイミング

- コイン列（step）がランナー位置に到達した瞬間を `stepHit` とする。
- `stepHit` の時点で、最新の `probabilities` を参照して獲得数を計算する。

### 3.2 取得・ダメージの定義（要件通りの「+1 / -1」）

- step には

  - `coins = set(coinLaneIndices)`
  - `empty = set(allLaneIndices) - coins`

- ランナーの走行割合 `p_lane` を「閾値で走っている/いない」に離散化して判定する（簡易化のため）。

#### 走行判定（閾値）

- `activeThreshold = 0.25`（推奨：2qubit で均等重ね合わせ時に 4 レーン全てが active になる）
- `activeLanes = { lane | p_lane >= activeThreshold }`

#### step の獲得コイン数

- `coinsGained = |coins ∩ activeLanes|`
- `damage = |empty ∩ activeLanes|`
- `delta = coinsGained - damage`

要件の例：

- 4 ステップ目でコインが Lane1,2（2 枚）、activeLanes が Lane1..4（4 レーン）なら
  `coinsGained=2`, `damage=2`, `delta=0`（= 2 - 2）

### 3.3 例（要件の動作確認）

- 1qubit：上（Lane1=|0>）にコインのみ

  - 状態が `|0>` → `p0=1` → active={Lane1} → `delta=+1`

- 1qubit：上下両方にコイン

  - `H` → `p0=p1=0.5` → active={Lane1,Lane2} → `delta=+2`

- 2qubit：全 4 レーンにコイン

  - `H` on both → `p` all = 0.25 → active=4 lanes → `delta=+4`

- 2qubit：Lane1 と Lane4 にコイン

  - `(|00>+|11>)/√2` → `p00=0.5, p11=0.5` → active={Lane1,Lane4} → `delta=+2`

---

## 4. コイン生成（ステップ生成）仕様

### 4.1 生成間隔

- `stepIntervalSec`（UI で調整可能）
- 初期値は「回路構築の余裕があるくらいゆっくり」

  - 例：`1.5s`〜`2.5s`程度（実装側で適当に初期値）

### 4.2 パターン

- step は `numQubits` に応じたレーン数で生成。
- 1 ステップは以下のいずれか（簡易）

  - 1 枚（単一レーン）
  - 複数枚（複数レーン同時）

- 連続ステップで構成が変わる（N 回目は単発、N+1 回目は複数など）。

※生成は完全ランダムでもよいが、MVP では「簡単な難易度制御」を入れるなら：

- 低難易度：1 枚中心
- 中難易度：2 枚や対角（Lane1&4 など）
- 高難易度：全レーン、またはコイン少+罠多（空レーン多）

---

## 5. 進行とレンダリング（上部ゲーム画面）

### 5.1 画面構成

- 上部：レーン + ランナー + コイン

  - ランナーは左側固定（X 座標固定）
  - ランナーは「走るアニメーション」をする
  - コインのみ右 → 左へ移動する

- 下部：コントローラー（`QamposerMicro`）

### 5.2 表示レトロ感

- ランナー・コインは「ドット絵風」スプライト（簡易でよい）
- 2D で十分（Canvas / PixiJS / DOM でも可）

---

## 6. 状態同期（QamposerMicro → ランナー表示）

### 6.1 コールバック

- `QamposerMicro` の編集で量子回路変更イベントが発火
- 受け取った `circuitData` をフロント側(ゲームロジック側)で即時にシミュレーションし、`probabilities` を更新
- 上部表示は `probabilities` をもとに以下を更新：

  - `p_lane` に応じて各レーンのランナー分身表示（例：薄い/濃い、サイズ、輝度など）
  - `activeThreshold` を超えるレーンを「走っている」状態として強調

### 6.2 反映頻度

- コールバックのたびに更新してよい（軽量前提）

---

## 7. データ構造（最小）

### 7.1 GameState

- `numQubits: 1 | 2`
- `laneCount: 2 | 4`
- `probabilities: number[]`（laneIndex 順に格納）
- `score: number`
- `stepIntervalSec: number`
- `coinSpeed: number`（UI で調整）
- `steps: Step[]`（画面に存在するステップ：最低 2 つ表示）

### 7.2 Step

- `id: string`
- `coinLanes: boolean[]`（laneCount 長）
- `x: number`（右 → 左へ減少）
- `hit: boolean`（stepHit 済みか）

---

## 8. ゲームループ（疑似コードレベル）

- `update(dt)`

  1. `for step in steps: step.x -= coinSpeed * dt`
  2. `if step.x <= runnerX && !step.hit:`

     - `activeLanes = lanes where probabilities[l] >= activeThreshold`
     - `coinsGained = count(step.coinLanes[l] && activeLanes[l])`
     - `damage = count(!step.coinLanes[l] && activeLanes[l])`
     - `score += coinsGained - damage`
     - `step.hit = true`

  3. 画面左外に出た step を破棄
  4. `stepIntervalSec` に従い新 step を右端に追加
  5. 常に `visibleSteps=2` 相当が見えるよう、右端のスポーン位置を調整

---

## 9. UI 調整項目（最小）

- `coinSpeed` スライダー
- `stepIntervalSec` スライダー
- `numQubits` 切替（1 / 2）qamposermicro の qubit 数を編集すると同時に変更される
- `activeThreshold` は固定でよい（デバッグ用に露出してもよい）
- 画面上部のランナーやコインはドット絵のようなレトロで親しみやすい感じにしてください。
