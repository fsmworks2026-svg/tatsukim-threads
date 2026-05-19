/**
 * Threads APIに投稿するモジュール
 * 2ステップ方式：コンテナ作成 → 30秒待機 → 公開
 */

const API_BASE = 'https://graph.threads.net/v1.0';

export async function postToThreads(text) {
  const userId = process.env.THREADS_USER_ID;
  const accessToken = process.env.THREADS_ACCESS_TOKEN;

  if (!userId || !accessToken) {
    throw new Error('THREADS_USER_ID または THREADS_ACCESS_TOKEN が .env に設定されていません');
  }

  // ステップ1: メディアコンテナを作成
  const createRes = await fetch(`${API_BASE}/${userId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      media_type: 'TEXT',
      text,
      access_token: accessToken,
    }),
  });

  const createData = await createRes.json();
  if (createData.error) {
    throw new Error(`コンテナ作成エラー: ${createData.error.message}`);
  }

  // ステップ2: 非同期処理の完了を待つ（Meta推奨: 最低30秒）
  await new Promise(resolve => setTimeout(resolve, 30000));

  // ステップ3: コンテナを公開
  const publishRes = await fetch(`${API_BASE}/${userId}/threads_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      creation_id: createData.id,
      access_token: accessToken,
    }),
  });

  const publishData = await publishRes.json();
  if (publishData.error) {
    throw new Error(`公開エラー: ${publishData.error.message}`);
  }

  return publishData.id;
}
