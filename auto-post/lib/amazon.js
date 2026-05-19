/**
 * Amazon PA-API 5.0 wrapper
 * paapi5-nodejs-sdk を使用して商品情報とアフィリURLを取得する
 */

import { DefaultApi, SearchItemsRequest, PartnerType, SearchItemsResource } from 'paapi5-nodejs-sdk';

// 週ごとにカテゴリをローテーションするための定義
// 月曜・水曜・金曜の3スロット × 4週 = 12カテゴリパターン
export const AFFILIATE_SCHEDULE = [
  { weekday: 1, label: '月曜アフィリ' },
  { weekday: 3, label: '水曜アフィリ' },
  { weekday: 5, label: '金曜アフィリ' },
];

const CATEGORY_ROTATION = [
  // 1週目
  [
    { keywords: 'インテリア 雑貨 おしゃれ',   searchIndex: 'HomeAndKitchen', label: 'インテリア小物',    hashtags: '#インテリア #暮らし #おしゃれ' },
    { keywords: '収納ボックス おしゃれ 蓋付き', searchIndex: 'HomeAndKitchen', label: '収納グッズ',       hashtags: '#収納 #片付け #すっきり' },
    { keywords: 'キッチン 便利グッズ 時短',    searchIndex: 'HomeAndKitchen', label: 'キッチングッズ',   hashtags: '#キッチン #時短 #家事ラク' },
  ],
  // 2週目
  [
    { keywords: '掃除 便利グッズ 楽',         searchIndex: 'HomeAndKitchen', label: '掃除グッズ',       hashtags: '#掃除 #家事ラク #時短' },
    { keywords: '子ども部屋 収納 小学生',      searchIndex: 'HomeAndKitchen', label: '子ども部屋グッズ', hashtags: '#子ども部屋 #収納 #小学生' },
    { keywords: '暮らし 雑貨 シンプル',        searchIndex: 'HomeAndKitchen', label: '暮らし雑貨',       hashtags: '#暮らし #シンプル #日用品' },
  ],
  // 3週目
  [
    { keywords: 'おしゃれ 照明 間接照明',      searchIndex: 'HomeAndKitchen', label: '照明・ファブリック', hashtags: '#照明 #インテリア #部屋づくり' },
    { keywords: '洗面所 収納 おしゃれ',        searchIndex: 'HomeAndKitchen', label: '洗面・バス収納',   hashtags: '#洗面所 #収納 #すっきり' },
    { keywords: '小学生 文房具 おしゃれ',      searchIndex: 'OfficeProducts', label: '文房具・学用品',   hashtags: '#小学生 #文房具 #勉強' },
  ],
  // 4週目
  [
    { keywords: '季節 インテリア 飾り',        searchIndex: 'HomeAndKitchen', label: '季節グッズ',       hashtags: '#季節 #暮らし #インテリア' },
    { keywords: '防災グッズ 家庭 備え',        searchIndex: 'HomeAndKitchen', label: '防災・家庭用品',   hashtags: '#防災 #備え #暮らし' },
    { keywords: 'キッチン 収納 スパイスラック', searchIndex: 'HomeAndKitchen', label: 'キッチン収納',     hashtags: '#キッチン #収納 #整理' },
  ],
];

/**
 * 今週の週番号から使うカテゴリセットを返す（4週ローテーション）
 */
export function getWeeklyCategories() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.floor((now - startOfYear) / (7 * 24 * 60 * 60 * 1000));
  return CATEGORY_ROTATION[weekNumber % 4];
}

/**
 * Amazon PA-API SearchItems で上位商品を1件取得
 * @param {{ keywords, searchIndex, label, hashtags }} category
 * @returns {{ name, price, catchcopy, affiliateUrl }}
 */
export async function getTopRankedItem(category) {
  const accessKey  = process.env.AMAZON_ACCESS_KEY;
  const secretKey  = process.env.AMAZON_SECRET_KEY;
  const partnerTag = process.env.AMAZON_PARTNER_TAG;

  if (!accessKey || !secretKey || !partnerTag) {
    throw new Error('AMAZON_ACCESS_KEY / AMAZON_SECRET_KEY / AMAZON_PARTNER_TAG が設定されていません');
  }

  const client = new DefaultApi(accessKey, secretKey, 'jp');

  const request = new SearchItemsRequest();
  request.PartnerTag  = partnerTag;
  request.PartnerType = PartnerType.ASSOCIATES;
  request.Keywords    = category.keywords;
  request.SearchIndex = category.searchIndex;
  request.ItemCount   = 5;
  request.SortBy      = 'Relevance';
  request.Resources   = [
    SearchItemsResource.ITEM_INFO_TITLE,
    SearchItemsResource.ITEM_INFO_FEATURES,
    SearchItemsResource.OFFERS_LISTINGS_PRICE,
    SearchItemsResource.DETAIL_PAGE_URL,
  ];

  const data = await client.searchItems(request);
  const items = data?.SearchResult?.Items;

  if (!items || items.length === 0) {
    throw new Error(`キーワード「${category.keywords}」の商品が見つかりませんでした`);
  }

  // 上位3件からランダムに1件選ぶ（毎週同じ商品にならないよう）
  const randomIndex = Math.floor(Math.random() * Math.min(3, items.length));
  const item = items[randomIndex];

  const name  = truncate(item.ItemInfo?.Title?.DisplayValue ?? '商品名不明', 40);
  const price = item.Offers?.Listings?.[0]?.Price?.DisplayAmount?.replace('￥', '').replace(',', '') ?? '価格不明';
  const features = item.ItemInfo?.Features?.DisplayValues ?? [];
  const catchcopy = truncate(features[0] ?? '', 60);
  const asin = item.ASIN ?? '';
  const affiliateUrl = `https://www.amazon.co.jp/dp/${asin}?tag=${partnerTag}`;

  return { name, price, catchcopy, affiliateUrl };
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max) + '…' : str;
}
