/**
 * 今日の投稿をmarkdownファイルから抽出するモジュール
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// auto-postの親ディレクトリ（Threads運用フォルダ）を参照
const POSTS_DIR = join(__dirname, '..', '..');

// 投稿時間の定義 [時, 分, ラベル]
export const POST_SCHEDULE = [
  { hour: 7,  minute: 0,  label: '朝' },
  { hour: 10, minute: 30, label: '有益情報①' },
  { hour: 13, minute: 0,  label: '昼共感' },
  { hour: 17, minute: 0,  label: 'アフィリ/有益②' },
  { hour: 21, minute: 30, label: '夜' },
];

// 今日の日付に対応する投稿ファイルを探す
function findTodayFile() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const files = readdirSync(POSTS_DIR).filter(f => f.match(/今週の投稿.*\.md/));

  // 複数ファイルが日付範囲に重複する場合、startDay が最大（最新）のものを優先する
  let bestFile = null;
  let bestStartDay = -1;
  for (const file of files) {
    const match = file.match(/(\d+)月(\d+)-(\d+)日/);
    if (!match) continue;
    const [, fileMonth, startDay, endDay] = match.map(Number);
    if (fileMonth === month && day >= startDay && day <= endDay) {
      if (startDay > bestStartDay) {
        bestFile = join(POSTS_DIR, file);
        bestStartDay = startDay;
      }
    }
  }
  return bestFile;
}

// 今日の投稿テキストを配列で返す（最大5件）
export function getTodayPosts() {
  const filePath = findTodayFile();
  if (!filePath) throw new Error('今日の投稿ファイルが見つかりません');

  const content = readFileSync(filePath, 'utf-8');
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
  const weekDay = weekDays[now.getDay()];

  // 今日のセクションを見つける（例: ## 5/14（木））
  const todayHeader = `## ${month}/${day}（${weekDay}）`;
  const startIdx = content.indexOf(todayHeader);
  if (startIdx === -1) throw new Error(`「${todayHeader}」セクションが見つかりません`);

  // 次の ## セクションまでを今日のコンテンツとして切り出す
  const afterStart = content.slice(startIdx);
  const nextSectionMatch = afterStart.slice(1).search(/\n## /);
  const todayContent = nextSectionMatch === -1
    ? afterStart
    : afterStart.slice(0, nextSectionMatch + 1);

  // コードブロック（```〜```）内のテキストを順番に抽出
  const posts = [];
  const codeBlockRegex = /```\n([\s\S]*?)```/g;
  let match;
  while ((match = codeBlockRegex.exec(todayContent)) !== null) {
    const text = match[1].trim();
    if (text) posts.push(text);
  }

  return posts;
}
