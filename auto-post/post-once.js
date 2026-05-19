/**
 * GitHub Actions用 一回だけ投稿するスクリプト
 * 環境変数 POST_SLOT で投稿スロットを指定 (0=朝, 1=有益情報①, 2=昼共感, 3=アフィリ, 4=夜)
 */

import { getTodayPosts, POST_SCHEDULE } from './lib/parser.js';
import { postToThreads } from './lib/poster.js';

const slot = parseInt(process.env.POST_SLOT ?? '0');
const slotName = POST_SCHEDULE[slot]?.label ?? `スロット${slot}`;

console.log(`=== Threads自動投稿 ===`);
console.log(`スロット: ${slotName}`);
console.log(`実行時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);

let posts;
try {
  posts = getTodayPosts();
} catch (err) {
  console.error(`投稿ファイル取得エラー: ${err.message}`);
  process.exit(1);
}

const text = posts[slot];
if (!text) {
  console.log(`スロット${slot}（${slotName}）の投稿が見つかりませんでした。スキップします。`);
  process.exit(0);
}

console.log(`\n投稿内容（先頭50文字）:\n${text.slice(0, 50)}...`);

try {
  const id = await postToThreads(text);
  console.log(`\n✅ 投稿完了 (ID: ${id})`);
} catch (err) {
  console.error(`\n❌ 投稿エラー: ${err.message}`);
  process.exit(1);
}
