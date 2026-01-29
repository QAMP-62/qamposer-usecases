Qamposer に「ノイジーシミュレータ」を自然に組み込むなら、実装・UX・将来拡張（実機/QPU、Runtime 連携）を同時に満たすために、バックエンドを **“Simulation Profile（実行プロファイル）”** という概念で拡張するのが最も整理しやすいです。参照いただいた IBM Quantum の 2 点は、そのまま設計指針になります（Aer の noisy primitives と Fake Provider）。 ([quantum.cloud.ibm.com][1])

以下、Qamposer（現状：通常シミュレーションのみ）に対して、段階的にノイズを入れる実装案です。

---

## 1) まず結論：ノイズは「2 系統」で提供するのが最適

### A. “Device-like（機材っぽいノイズ）” モード：Fake Provider を選ぶ

- IBM の **Fake Provider / Fake Backend** は、カップリングマップ、basis gates、T1/T2、エラー率等の **スナップショット**を持ち、トランスパイル検証や **ノイジーシミュレーション**に使える前提で作られています。 ([quantum.cloud.ibm.com][2])
- 個別 FakeBackend の `run()` 仕様として、**qiskit-aer が入っていれば AerSimulator + “その fake backend の noise model”** で実行されることが明記されています（＝実装が非常に楽）。 ([quantum.cloud.ibm.com][3])

**狙い**：ユーザーが「ibm_brisbane 相当」「ibm_perth 相当」みたいな体験をローカルで再現できる。

### B. “Custom（教育用・説明用ノイズ）” モード：Aer の NoiseModel を組む

- Aer の `noise` モジュールは `NoiseModel / QuantumError / ReadoutError` を中心に、ゲートエラーや測定エラー等を組み立てられます。 ([quantum.cloud.ibm.com][4])

**狙い**：授業や教材で「測定誤りだけ入れる」「2Q ゲートだけデポラ入れる」など、概念理解を狙ったノイズを簡単に再現できる。

---

## 2) Qamposer の組み込み方：Backend を “profile 選択” にする

現状「通常シミュレータ」固定なら、API を次のように拡張します。

### 推奨 API（例）

- `POST /simulate`

  - `circuit`（OpenQASM3 or your circuit JSON）
  - `shots`
  - `profile`（下記）

### profile の設計（例：Pydantic）

- `profile.type`:

  - `"ideal"`（現状の通常シミュレーション）
  - `"noisy_fake_backend"`（Fake Provider）
  - `"noisy_custom"`（NoiseModel）

- `profile` の中身例

  - `noisy_fake_backend`:

    - `backend_name`: `"FakePerth"` など（候補リストを別 API で返す）
    - `seed_simulator`（任意）

  - `noisy_custom`:

    - `readout_error`: 例）p01/p10
    - `depolarizing_1q`, `depolarizing_2q`
    - `thermal_relaxation`: on/off + parameters（必要なら段階 2 で）

UI も「Simulator」ドロップダウンを 1 つ増やすだけで済みます（Ideal / Noisy (Device-like) / Noisy (Custom)）。

---

## 3) バックエンド実装指針（Aer / Fake Provider をどう使うか）

### Ideal（既存）

- BasicSimulator / AerSimulator（ノイズなし）で OK

### Noisy (Device-like)：Fake Provider 連携

- Fake backend を生成
- **(推奨)** その fake backend の設定（basis_gates / coupling_map / qubit props）に合わせて transpile
- Aer があるなら、その fake backend の noise model 付きで実行（FakeBackend の設計思想と一致） ([quantum.cloud.ibm.com][3])

これにより Qamposer 側で “ノイズモデル生成” を頑張らなくてよく、保守が軽いのが最大メリットです。

### Noisy (Custom)：Aer NoiseModel

- Aer noise module で `NoiseModel` を生成し、AerSimulator に渡す
- 「授業向けのプリセット」を数個持つ（例：Readout-only / Depolarizing-only / Mild / Harsh）

NoiseModel は自由度が高いので、最初は **“パラメータの露出を絞る”** のが重要です（UI が難しくなるため）。Aer の NoiseModel の基本構造は IBM の “Building noise models” ガイドに沿って実装できます。 ([quantum.cloud.ibm.com][4])

---

## 4) 実装順（最短で価値が出るロードマップ）

### Phase 1（最短導入・効果大）

1. `profile.type` を導入
2. `"noisy_fake_backend"` を実装（FakeProvider）
3. UI で Fake backend を選択 → shots で実行

これだけで「ノイズのある結果」が出るようになり、教育価値が一気に上がります。Fake backend の noisy 実行は仕様上も自然です。 ([quantum.cloud.ibm.com][3])

### Phase 2（教材向けの説明力を上げる）

4. `"noisy_custom"` を実装し、プリセット（Readout-only 等）から提供
5. UI はスライダー少数（例：readout error、2Q depolarizing など）に限定

### Phase 3（拡張）

6. “特定 QPU のキャリブレーション由来ノイズ” に寄せる（Runtime/QPU、または別のソース）

   - IBM 側には「QPU を指定して Aer に投げるとキャリブレーションからノイズモデルを構築する」旨のガイドラインもあります。 ([quantum.cloud.ibm.com][5])
   - ただし Qamposer の“ローカル・教室”ユースケースだと Phase 1/2 の方が費用・依存・UX の面で先に効きます。

---

## 5) 注意点（Qamposer の品質として押さえるべき点）

- **再現性**：seed を API で受けられるようにする（講義で同じ結果を見せやすい）
- **トランスパイル整合**：Fake backend を選ぶ場合、coupling_map/basis_gates に合わせて transpile する（ユーザーが「実機っぽい制約」を理解できる）
- **結果の説明**：Ideal vs Noisy の比較を UI で並べると学習効果が高い（同一回路・同一 shots で差分）

---

必要なら、Qamposer の現行 backend（FastAPI 側）の simulate エンドポイント構造に合わせて、**Pydantic の `SimulationProfile` モデル**と、`ideal/noisy_fake/noisy_custom` の各実行器（strategy パターン）まで具体化した設計案（ディレクトリ構成含む）に落とします。

[1]: https://quantum.cloud.ibm.com/docs/guides/simulate-with-qiskit-aer?utm_source "Exact and noisy simulation with Qiskit Aer primitives"
[2]: https://quantum.cloud.ibm.com/docs/api/qiskit-ibm-runtime/fake-provider?utm_source "fake_provider (latest version) | IBM Quantum Documentation"
[3]: https://quantum.cloud.ibm.com/docs/api/qiskit-ibm-runtime/fake-provider-fake-perth?utm_source "FakePerth (latest version) | IBM Quantum Documentation"
[4]: https://quantum.cloud.ibm.com/docs/guides/build-noise-models?utm_source "Building noise models | IBM Quantum Documentation"
[5]: https://quantum.cloud.ibm.com/docs/guides/local-simulators?utm_source "Migrate to local simulators | IBM Quantum Documentation"
