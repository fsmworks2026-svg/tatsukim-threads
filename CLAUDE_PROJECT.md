# たつきママ Threads自動投稿 引き継ぎドキュメント

## プロジェクト概要

- **アカウント名**：たつきママ
- **プラットフォーム**：Threads
- **テーマ**：暮らし・インテリア・収納
- **アフィリ**：Amazon アソシエイト（PA-API）
- **投稿体制**：1日5投稿 × 自動投稿（GitHub Actions）
- **リポジトリ**：https://github.com/fsmworks2026-svg/tatsukim-threads

---

## ペルソナ設定

- **名前**：たつきママ
- **設定**：30代・小学3年生の男の子（たつき）がいる主婦
- **発信テーマ**：「整った部屋で家族が気持ちよく暮らす」暮らし・収納・インテリア
- **口調**：タメ口・やわらかい・等身大。絵文字は適度に使う
- **NGワード**：「簡単に稼げる」「誰でも〇万円」などの誇大表現
- **キャラクターの軸**：完璧ではないが、ちょっとずつ暮らしを整えようとしている等身大のママ

---

## 投稿の構成（1日5投稿）

| スロット | 時間 | 内容 |
|---|---|---|
| 朝 | 7:00 | 育児・日常のつぶやき。たつきとの朝のエピソードなど |
| 有益情報① | 10:30 | 収納・インテリア・暮らしTips。フック（1行目）強め |
| 昼共感 | 13:00 | 家事・育児の共感投稿 |
| アフィリ/有益② | 17:00 | Amazon商品紹介（PR）または暮らしの追加情報 |
| 夜 | 21:30 | 一日の締め。片付けた達成感・部屋づくり妄想など |

---

## アフィリ投稿の型（※PR必須）

```
【悩み・気になってたこと】（1〜2行）
↓
【Amazonで見つけた商品名】
↓
【商品説明または一言コメント】
↓
価格・AmazonURL
↓
#カテゴリ #Amazon #PR
```

**ポイント**：
- 「宣伝」ではなく「自分の悩みを解決しようとして探した」という流れで書く
- `#PR` `#Amazon` は必ず入れる（景品表示法）

---

## ハッシュタグのルール

| スロット | よく使うタグ |
|---|---|
| 朝・夜 | `#月曜日` `#小学生ママ` `#暮らし` `#片付け` `#ナイトルーティン` |
| 有益情報① | `#収納` `#インテリア` `#暮らし` `#部屋づくり` `#家事ラク` |
| 昼共感 | `#ランチ` `#ママのお昼` `#共感` `#小学生ママ` |
| アフィリ | `#収納` `#Amazon` `#PR` ＋カテゴリ別タグ |

---

## 自動投稿の仕組み

```
【毎週日曜 22:00 JST】GitHub Actions: generate-weekly.yml
  ↓
generate-weekly.js 実行
  ↓
1. 来週の日付範囲を計算（月〜日）
2. Amazon PA-APIでカテゴリ別商品を3件取得（月・水・金）
   ※ APIキー未設定 or 失敗時はフォールバック商品リストを使用
3. テンプレートプールから投稿内容を生成（7日 × 5スロット）
4. 今週の投稿_XX月XX-XX日.md を自動生成
5. git commit & push（GITHUB_TOKEN使用）
  ↓
翌週月〜日、post-*.yml が毎日5回自動投稿（Threads API）
```

---

## ディレクトリ構成

```
tatsukim-threads/
├── CLAUDE_PROJECT.md              ← このファイル
├── .gitignore
├── 今週の投稿_XX月XX-XX日.md      ← 自動生成される投稿ファイル
├── auto-post/
│   ├── package.json               ← paapi5-nodejs-sdk 依存
│   ├── .env                       ← ローカル用（Gitに含めない）
│   ├── post-once.js               ← 1回投稿スクリプト（GitHub Actionsから呼ばれる）
│   ├── generate-weekly.js         ← 週次ファイル自動生成スクリプト
│   ├── lib/
│   │   ├── poster.js              ← Threads API投稿ロジック
│   │   ├── parser.js              ← MDファイルから投稿テキストを抽出
│   │   └── amazon.js              ← Amazon PA-API + フォールバック商品リスト
│   └── templates/
│       └── content-pool.js        ← 投稿テンプレート全量（曜日別×パターン）
└── .github/
    └── workflows/
        ├── generate-weekly.yml    ← 日曜22時に週次ファイル生成
        ├── post-0700.yml          ← 朝7:00投稿（毎日）
        ├── post-1030.yml          ← 10:30投稿
        ├── post-1300.yml          ← 13:00投稿
        ├── post-1700.yml          ← 17:00投稿（アフィリ枠）
        └── post-2130.yml          ← 21:30投稿
```

---

## 必要な GitHub Secrets（5つ）

Settings → Secrets and variables → Actions で登録

| Secret名 | 内容 | 現在の状態 |
|---|---|---|
| `AMAZON_ACCESS_KEY` | Amazon PA-API アクセスキー | ⬜ 未登録（売上3件後に取得） |
| `AMAZON_SECRET_KEY` | Amazon PA-API シークレットキー | ⬜ 未登録（売上3件後に取得） |
| `AMAZON_PARTNER_TAG` | アソシエイトID（`fsmworks-22`） | ⬜ 未登録 |
| `THREADS_USER_ID` | たつきママの Threads ユーザーID | ⬜ 未登録 |
| `THREADS_ACCESS_TOKEN` | たつきママの Threads アクセストークン | ⬜ 未登録 |

> `GITHUB_TOKEN` は GitHub が自動で注入するため登録不要

---

## Amazon アフィリ関連

### アソシエイトID
`fsmworks-22`（`.env` の `AMAZON_PARTNER_TAG` に設定済み）

### アフィリリンクの形式
```
https://www.amazon.co.jp/dp/ASIN?tag=fsmworks-22
```

### PA-API が使えない間の対応（フォールバック）
`auto-post/lib/amazon.js` の `FALLBACK_PRODUCTS` に12カテゴリ × 3商品を登録済み。
`AMAZON_ACCESS_KEY` が未設定またはAPI失敗時に自動で使用される。

### PA-APIキーの取得条件
- Amazonアソシエイト管理画面 → ツール → Product Advertising API
- **180日以内に3件以上の売上**が必要
- 取得後：`.env` と GitHub Secrets の `AMAZON_ACCESS_KEY` / `AMAZON_SECRET_KEY` に登録

---

## アフィリ投稿のカテゴリローテーション（4週サイクル）

| 週 | 月曜 | 水曜 | 金曜 |
|---|---|---|---|
| 1週目 | インテリア小物 | 収納グッズ | キッチングッズ |
| 2週目 | 掃除グッズ | 子ども部屋グッズ | 暮らし雑貨 |
| 3週目 | 照明・ファブリック | 洗面・バス収納 | 文房具・学用品 |
| 4週目 | 季節グッズ | 防災・家庭用品 | キッチン収納 |

---

## 出力フォーマット（厳守）

自動投稿システムが ```` ``` ```` で囲まれたブロックを解析します。
**この形式を守らないと自動投稿が動きません。**

ファイル名：`今週の投稿_〇月〇-〇日.md`

````markdown
## 〇/〇（〇）

**【朝】**
```
投稿テキスト
#ハッシュタグ
```

**【有益情報①｜フック強め】**
```
投稿テキスト
#ハッシュタグ
```

**【昼共感】**
```
投稿テキスト
#ハッシュタグ
```

**【アフィリ】** ※PR   ← API成功時。失敗時は【有益情報②】
```
投稿テキスト
AmazonURL
#ハッシュタグ #Amazon #PR
```

**【夜】**
```
投稿テキスト
#ハッシュタグ
```
````

---

## 現在の状態（2025年5月時点）

### 完了済み
- [x] ローカル実装・GitHub push 完了
- [x] フォールバック商品リスト（カテゴリ別12種 × 3商品）実装済み
- [x] `generate-weekly.js` ローカル動作確認済み
- [x] `.env` に `AMAZON_PARTNER_TAG=fsmworks-22` 設定済み

### 残り作業
- [ ] Threads アカウント（たつきママ）を作成する
- [ ] Threads の User ID と Access Token を取得する
- [ ] GitHub Secrets に5つの値を登録する
- [ ] Actions の `workflow_dispatch` で手動実行して動作確認
- [ ] Amazonアソシエイトで売上3件 → PA-APIキーを取得・登録

---

## ローカルテスト方法

```bash
# auto-post/.env に AMAZON_PARTNER_TAG を設定してから実行
cd auto-post
npm install
node generate-weekly.js
# → 今週の投稿_XX月XX-XX日.md が生成されればOK
```

---

## 関連プロジェクト

| プロジェクト | リポジトリ | テーマ | アフィリ |
|---|---|---|---|
| ひなこ（香坂ひなこ） | `Threads運用` | AI副業・育児ママ | 楽天 |
| たつきママ（このプロジェクト） | `tatsukim-threads` | 暮らし・収納・インテリア | Amazon |
