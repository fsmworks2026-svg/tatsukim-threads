/**
 * たつきママ 週次投稿ファイル自動生成スクリプト
 * 毎週日曜夜に実行し、来週分の投稿ファイルを自動生成する
 *
 * 実行方法:
 *   node generate-weekly.js
 *
 * 必要な環境変数:
 *   AMAZON_ACCESS_KEY   - Amazon PA-API アクセスキー
 *   AMAZON_SECRET_KEY   - Amazon PA-API シークレットキー
 *   AMAZON_PARTNER_TAG  - Amazon アソシエイトID
 *   GIT_TOKEN           - GitHub Personal Access Token（Actions実行時のみ）
 */

import 'dotenv/config';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import {
  getTopRankedItem,
  getWeeklyCategories,
  AFFILIATE_SCHEDULE,
} from './lib/amazon.js';
import {
  getMorningPost,
  getTipsPost,
  getLunchPost,
  getEveningPost,
  generateAffiliatePost,
} from './templates/content-pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = join(__dirname, '..');

const WEEKDAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

// ========== 日付ユーティリティ ==========

/**
 * 来週の月曜日〜日曜日の Date 配列を返す
 */
function getNextWeekDates() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=日, 1=月, ...
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysUntilMonday);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/**
 * Date から "M/D（曜）" 形式の文字列を返す
 */
function formatDateHeader(date) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const w = WEEKDAY_NAMES[date.getDay()];
  return `${m}/${d}（${w}）`;
}

/**
 * Date から曜日名（月〜日）を返す
 */
function getWeekdayLabel(date) {
  return WEEKDAY_NAMES[date.getDay()];
}

// ========== 週番号 ==========

function getWeekNumber() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  return Math.floor((now - startOfYear) / (7 * 24 * 60 * 60 * 1000));
}

// ========== アフィリ判定ユーティリティ ==========

/**
 * アフィリ対象曜日かどうかを判定（月=1, 水=3, 金=5）
 */
function isAffiliateDay(date) {
  return AFFILIATE_SCHEDULE.some(s => s.weekday === date.getDay());
}

/**
 * アフィリ枠のインデックスを返す（月=0, 水=1, 金=2）、非対象日は -1
 */
function getAffiliateCategoryIndex(date) {
  return AFFILIATE_SCHEDULE.findIndex(s => s.weekday === date.getDay());
}

// ========== 有益情報②フォールバック ==========

// アフィリAPI失敗時に使う有益情報②
const USEFUL_INFO_2_FALLBACK = [
  `部屋を整えると、気持ちまで整う。

これって本当で、
散らかった部屋にいると思考まで散漫になる。

逆に整った部屋にいると
不思議と集中できるし、前向きになれる。

まず1か所だけ片付けてみて。

#暮らし #片付け #インテリア`,

  `収納って、センスじゃなくてロジック。

①使う頻度が高いものを手の届く場所に
②同じ種類のものをまとめる
③ラベルを貼って「戻す場所」を明確にする

この3つだけで、誰でも使いやすい収納が作れる。

#収納 #片付け #暮らし`,

  `インテリアを整えるのに
高いものは必要ない。

「色を揃える」「高さを揃える」
「同じ素材でまとめる」

このルールを知るだけで
部屋の見た目がぐっと変わる。

#インテリア #部屋づくり #暮らし`,

  `キッチンの時短、一番効果があったのは
「定位置を決める」こと。

探す時間がなくなるだけで
料理のストレスが激減した。

使ったら戻す、それだけ。シンプルが最強。

#キッチン #時短 #家事ラク`,

  `子ども部屋の片付け、
親が代わりにやってしまうと逆効果。

「自分でできる仕組み」を作るほうが
長い目で見てずっとラク。

本人が決めた場所には戻してくれるんだよね。

#子ども部屋 #収納 #小学生ママ`,
];

// ========== 1日分のセクションを生成 ==========

async function buildDaySection(date, dayIndex, weekNum, affiliateData) {
  const header = formatDateHeader(date);
  const weekday = date.getDay(); // 0=日, 1=月, ..., 6=土
  const seed = weekNum * 100 + dayIndex;

  // 朝つぶやき
  const morning = getMorningPost(weekday, seed);

  // 有益情報①
  const usefulInfo1 = getTipsPost(weekday, seed);

  // 昼共感
  const lunch = getLunchPost(weekday, seed + 1);

  // アフィリ or 有益情報②
  let slot3;
  if (isAffiliateDay(date)) {
    const catIndex = getAffiliateCategoryIndex(date);
    const entry = affiliateData[catIndex];
    const categories = getWeeklyCategories();
    const category = categories[catIndex];
    const templateIndex = (weekNum + dayIndex) % 4;
    if (entry && category) {
      slot3 = generateAffiliatePost(entry, category, templateIndex);
    } else {
      slot3 = USEFUL_INFO_2_FALLBACK[seed % USEFUL_INFO_2_FALLBACK.length];
    }
  } else {
    slot3 = USEFUL_INFO_2_FALLBACK[seed % USEFUL_INFO_2_FALLBACK.length];
  }

  // 夜つぶやき
  const night = getEveningPost(weekday, seed + 2);

  // API失敗で有益情報②代替の場合はPRラベルを外す
  const affiliateSucceeded = isAffiliateDay(date) && affiliateData[getAffiliateCategoryIndex(date)] !== null;
  const slot3Label = affiliateSucceeded ? `**【アフィリ】** ※PR` : `**【有益情報②】**`;

  return `## ${header}

**【朝】**
\`\`\`
${morning}
\`\`\`

**【有益情報①｜フック強め】**
\`\`\`
${usefulInfo1}
\`\`\`

**【昼共感】**
\`\`\`
${lunch}
\`\`\`

${slot3Label}
\`\`\`
${slot3}
\`\`\`

**【夜】**
\`\`\`
${night}
\`\`\``;
}

// ========== 投稿スケジュール一覧テーブルを生成 ==========

function buildScheduleTable(dates, affiliateData) {
  const rows = dates.map((date) => {
    const header = formatDateHeader(date);
    const catIndex = getAffiliateCategoryIndex(date);
    const isAffiliate = catIndex >= 0 && affiliateData[catIndex] !== null;
    const slot3 = isAffiliate ? '🛒アフィリ' : '✅有益情報②';
    return `| ${header} | ✅ | ✅ | ✅ | ${slot3} | ✅ |`;
  });

  return `## 投稿スケジュール一覧

| 日付 | 朝 | 有益情報① | 昼共感 | アフィリ/有益② | 夜 |
|---|---|---|---|---|---|
${rows.join('\n')}

*🛒アフィリ投稿は月・水・金の17:00に自動投稿*`;
}

// ========== メイン処理 ==========

async function main() {
  console.log('🚀 週次投稿ファイル生成を開始します...\n');

  const dates = getNextWeekDates();
  const weekNum = getWeekNumber();
  const categories = getWeeklyCategories();

  // ファイル名を計算
  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];
  const month = firstDate.getMonth() + 1;
  const startDay = firstDate.getDate();
  const endDay = lastDate.getDate();
  const fileName = `今週の投稿_${month}月${startDay}-${endDay}日.md`;
  const filePath = join(POSTS_DIR, fileName);

  console.log(`📅 対象期間: ${formatDateHeader(firstDate)} 〜 ${formatDateHeader(lastDate)}`);
  console.log(`📁 出力ファイル: ${fileName}\n`);

  // Amazon PA-APIから3スロット分のアフィリデータを取得（月・水・金）
  const affiliateData = [null, null, null];
  console.log('🛒 Amazon PA-APIからアフィリデータを取得中...');

  for (let i = 0; i < 3; i++) {
    const category = categories[i];
    try {
      const product = await getTopRankedItem(category);
      affiliateData[i] = product;
      console.log(`  ✅ [${category.label}] ${product.name} - ${product.price}円`);
    } catch (err) {
      console.warn(`  ⚠️  [${category.label}] 取得失敗: ${err.message}`);
      console.warn('     → 有益情報②で代替します');
    }
    // レート制限対策: 1秒待機
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log('');

  // 7日分のセクションを生成
  console.log('📝 投稿内容を生成中...');
  const sections = [];
  for (let i = 0; i < dates.length; i++) {
    const section = await buildDaySection(dates[i], i, weekNum, affiliateData);
    sections.push(section);
    console.log(`  ✅ ${formatDateHeader(dates[i])}`);
  }

  // スケジュールテーブル
  const scheduleTable = buildScheduleTable(dates, affiliateData);

  // ファイル全体を組み立て
  const content = `# 投稿｜${month}/${startDay}（${getWeekdayLabel(firstDate)}）〜${endDay}（${getWeekdayLabel(lastDate)}）

※ 1日5投稿体制：朝つぶやき / 有益情報① / 昼共感 / アフィリ or 有益情報② / 夜つぶやき
※ 投稿時間の目安：7:00 / 10:30 / 13:00 / 17:00 / 21:30

---

${sections.join('\n\n---\n\n')}

---

${scheduleTable}
`;

  // ファイルに書き出し
  writeFileSync(filePath, content, 'utf-8');
  console.log(`\n✅ ファイルを生成しました: ${fileName}`);

  // git commit & push（GIT_TOKEN がある場合＝GitHub Actions環境）
  if (process.env.GIT_TOKEN) {
    console.log('\n📤 git commit & push を実行中...');
    try {
      execSync('git config user.name "github-actions[bot]"');
      execSync('git config user.email "github-actions[bot]@users.noreply.github.com"');
      execSync(`git add "${fileName}"`, { cwd: POSTS_DIR });
      execSync(`git commit -m "feat: ${fileName} を自動生成"`, { cwd: POSTS_DIR });

      const repoUrl = process.env.GITHUB_REPOSITORY;
      execSync(
        `git push https://x-access-token:${process.env.GIT_TOKEN}@github.com/${repoUrl}.git`,
        { cwd: POSTS_DIR }
      );
      console.log('✅ push 完了');
    } catch (err) {
      console.error('❌ git push エラー:', err.message);
      process.exit(1);
    }
  } else {
    console.log('\nℹ️  GIT_TOKEN が未設定のため、git push をスキップしました（ローカルテスト）');
  }
}

main().catch(err => {
  console.error('❌ 生成エラー:', err.message);
  process.exit(1);
});
