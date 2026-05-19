/**
 * Amazon PA-API 5.0 wrapper
 * paapi5-nodejs-sdk を使用して商品情報とアフィリURLを取得する
 *
 * APIキー未設定時はカテゴリ別の固定商品リスト（FALLBACK_PRODUCTS）からランダム選択する
 */

// paapi5-nodejs-sdk は CommonJS モジュールのため createRequire で読み込む
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { DefaultApi, SearchItemsRequest, PartnerType, SearchItemsResource } = require('paapi5-nodejs-sdk');

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

// =========================================================
// APIキー未設定時のフォールバック商品リスト
// 価格は参考値（Amazonは変動するため、投稿時に最新価格が取得できる場合はAPI優先）
// =========================================================
const FALLBACK_PRODUCTS = {
  'インテリア小物': [
    { asin: 'B07FVLRCH6', name: '山崎実業 tower マグネットバスルームラック ラージ',       price: '2,090', catchcopy: 'マグネットで壁に貼り付けるだけ。大容量ボトルもすっきり収納できる' },
    { asin: 'B0CKWTYJJM', name: 'アイリスオーヤマ LEDシーリングライト 木目フレーム 6畳', price: '7,980', catchcopy: '10段階調光・11段階調色対応。木目フレームがおしゃれなシーリングライト' },
    { asin: 'B008FWK1X6', name: 'Soil バスマット ライト 珪藻土 日本製',                 price: '4,950', catchcopy: '薄型・軽量で高い吸水力。速乾性抜群の日本製珪藻土バスマット' },
  ],
  '収納グッズ': [
    { asin: 'B08XWGDSZG', name: 'アイリスオーヤマ フタ付き積み重ねBOX FTB45D',           price: '880',   catchcopy: 'フタ付きでスタッキング可能。衣類・おもちゃ・コスメなど幅広く使える定番収納ボックス' },
    { asin: 'B0C3C2YW59', name: 'やわらか素材の収納かご 5個セット Mサイズ ホワイト',     price: '1,480', catchcopy: '柔らかいPP素材で安全・軽量。積み重ね対応の5個セット万能収納かご' },
    { asin: 'B07N2HGJHC', name: 'トラスコ中山 トランクカーゴ 収納ボックス 50L ブラック', price: '3,300', catchcopy: '頑丈なプロ仕様50L収納ボックス。工具・アウトドア・防災用品まで何でも入る' },
  ],
  'キッチングッズ': [
    { asin: 'B0C5WNRFJX', name: '山崎実業 tower 隠せる調味料ラック 2段 ホワイト',        price: '7,040', catchcopy: '扉付きで調味料をスッキリ隠せる伸縮タイプ。スライドレール付きで取り出しやすい' },
    { asin: 'B005AILJ3O', name: '花王 クイックルワイパー 本体 フロア用掃除道具 2種シートセット', price: '1,078', catchcopy: 'ウェット・ドライ2種セット付き。フローリング掃除の定番アイテム' },
    { asin: 'B0D78FQWF1', name: '花王 クイックルワイパー 立体吸着ウェットシート 64枚入', price: '1,560', catchcopy: '3D立体シートでほこりをがっちりキャッチ。大容量でコスパ抜群' },
  ],
  '掃除グッズ': [
    { asin: 'B005AILJ3O', name: '花王 クイックルワイパー 本体 フロア用掃除道具 2種シートセット', price: '1,078', catchcopy: 'ウェット・ドライ2種セット付き。毎日のフローリング掃除に欠かせない定番品' },
    { asin: 'B0B76KRBM2', name: 'Amazonベーシック ロボット掃除機 吸引・水拭き両用',      price: '19,800', catchcopy: '吸引と水拭きが1台で完結。スリムで家具下にも入りやすいロボット掃除機' },
    { asin: 'B01GWUKD6W', name: '花王 クイックルワイパー ドライシート 80枚まとめ買い',   price: '1,320', catchcopy: 'まとめ買いでお得な80枚パック。毎日の床掃除にリピート買い多数' },
  ],
  '子ども部屋グッズ': [
    { asin: 'B0DHVH9YK7', name: '絵本棚 大容量 キッズ 本棚 おもちゃ収納棚 スリム 北欧',  price: '5,980', catchcopy: '大容量・スリムデザインの子ども用絵本棚。おもちゃも一緒にすっきり収納できる北欧スタイル' },
    { asin: 'B0C3C2YW59', name: 'やわらか素材の収納かご 5個セット Mサイズ ホワイト',     price: '1,480', catchcopy: '子どもが安全に使えるやわらか素材。おもちゃ整理にも最適な5個セット' },
    { asin: 'B001P47DRI', name: '三菱鉛筆 ジェットストリーム 1.0mm 黒',                  price: '110',   catchcopy: '太字1.0mmで書きやすい。学校・宿題用に人気の定番ボールペン' },
  ],
  '暮らし雑貨': [
    { asin: 'B0C3YWMG1J', name: 'BOOMIE 珪藻土バスマット Ver.2.0 吸水2倍 60×40cm',     price: '2,380', catchcopy: '吸水量2倍にアップグレード。洗濯機対応で清潔に保てる柔らか踏み心地バスマット' },
    { asin: 'B075TYPPNK', name: '山崎実業 tower マグネットバスルームラック ワイド ブラック', price: '1,760', catchcopy: 'スマートなブラックカラーのワイドタイプ。バスルームをスタイリッシュに整理' },
    { asin: 'B07MVHK5NH', name: '山崎実業 tower マグネットバスルームフック ラージ ホワイト', price: '1,210', catchcopy: 'マグネットで貼り付けるだけのバスルームフック。タオルやバスグッズをすっきり吊り下げ収納' },
  ],
  '照明・ファブリック': [
    { asin: 'B0CKWTYJJM', name: 'アイリスオーヤマ LEDシーリングライト 木目フレーム 6畳', price: '7,980', catchcopy: '10段階調光・11段階調色、節電モード搭載。木目フレームがおしゃれなリモコン付きシーリングライト' },
    { asin: 'B0943FJSRG', name: 'Umi Amazonブランド 珪藻土バスマット 折りたたみ',        price: '1,999', catchcopy: 'アスベスト不使用で安心。折りたたみ可能なコンパクト珪藻土バスマット' },
    { asin: 'B008FWK1X6', name: 'Soil バスマット ライト 珪藻土 日本製',                 price: '4,950', catchcopy: '薄型・軽量で高い吸水力。速乾性抜群の日本製珪藻土バスマット' },
  ],
  '洗面・バス収納': [
    { asin: 'B07FVLRCH6', name: '山崎実業 tower マグネットバスルームラック ラージ ホワイト', price: '2,090', catchcopy: 'マグネット取り付け式のラージサイズ。大容量ボトルもまとめて収納できる' },
    { asin: 'B07FVDVLD3', name: '山崎実業 tower マグネットバスルームラック ワイド ホワイト', price: '1,760', catchcopy: '横幅ワイドで使いやすいマグネット式バスルームラック。家族分のシャンプー類を整理' },
    { asin: 'B0CLDB9N54', name: '浴室収納 突っ張りラック コーナーラック シャワーラック',  price: '2,980', catchcopy: '工具不要・突っ張り固定でコーナーに設置。シャンプー類をすっきり整頓' },
  ],
  '文房具・学用品': [
    { asin: 'B002CKOMQE', name: '三菱鉛筆 ジェットストリーム 0.5mm 黒 10本入',           price: '1,100', catchcopy: '超低摩擦インクでなめらかな書き心地。定番人気の油性ボールペン10本セット' },
    { asin: 'B006XPUQNM', name: 'パイロット フリクションボールノック 0.5mm ブラック',     price: '220',   catchcopy: '摩擦熱で消えるインク搭載。書き間違いをきれいに消せる人気の消せるボールペン' },
    { asin: 'B002C4KL8I', name: 'コクヨ キャンパスノート ドット入り罫線 B5 5冊パック',   price: '660',   catchcopy: 'ドット入り罫線で文字が整えやすい。学生から社会人まで愛用される定番ノート5冊セット' },
  ],
  '季節グッズ': [
    { asin: 'B0DHVH9YK7', name: '絵本棚 大容量 キッズ 本棚 おもちゃ収納棚 北欧',         price: '5,980', catchcopy: '大容量・スリムデザインの子ども用絵本棚。部屋の雰囲気に合わせた北欧スタイル' },
    { asin: 'B0CKWTYJJM', name: 'アイリスオーヤマ LEDシーリングライト 木目フレーム 6畳', price: '7,980', catchcopy: '10段階調光・11段階調色対応。季節や気分で光の色を変えられるシーリングライト' },
    { asin: 'B0C5WNRFJX', name: '山崎実業 tower 隠せる調味料ラック 2段 ホワイト',        price: '7,040', catchcopy: '扉付きで調味料をスッキリ隠せる伸縮タイプ。季節の調味料も整理しやすい' },
  ],
  '防災・家庭用品': [
    { asin: 'B0DPSC2VZP', name: '防災グッズ セット 防災リュック 1人用 32点',             price: '5,980', catchcopy: '1人用に必要な防災用品32点をセット。非常時にすぐ持ち出せる防災リュック' },
    { asin: 'B06XZM1RGH', name: '尾西食品 アルファ米 12種類全部セット 5年保存',          price: '3,990', catchcopy: '全12種類のアルファ米が揃う5年保存可能な定番非常食セット' },
    { asin: 'B0CGTJB8JL', name: '尾西食品 アルファ米 しっかりご飯セット 10種 巾着袋入り', price: '3,515', catchcopy: 'メインディッシュ系10種を詰め合わせた実用的な非常食セット。おしゃれな巾着袋付き' },
  ],
  'キッチン収納': [
    { asin: 'B0C5WNRFJX', name: '山崎実業 tower 隠せる調味料ラック 2段 ホワイト',        price: '7,040', catchcopy: '扉付きで調味料をスッキリ隠せる伸縮タイプ。スライドレール付きで取り出しやすい' },
    { asin: 'B08XWGDSZG', name: 'アイリスオーヤマ フタ付き積み重ねBOX FTB45D',           price: '880',   catchcopy: 'フタ付きでスタッキング可能。乾物・調味料・ストック品の整理に使える万能収納ボックス' },
    { asin: 'B07FVDVLD3', name: '山崎実業 tower マグネットバスルームラック ワイド ホワイト', price: '1,760', catchcopy: 'マグネット取り付けでシンク周りの壁に設置できるワイドラック' },
  ],
};

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
 * フォールバック商品リストからランダムに1件取得
 * @param {{ label, hashtags }} category
 * @param {string} partnerTag
 * @returns {{ name, price, catchcopy, affiliateUrl }}
 */
function getFallbackItem(category, partnerTag) {
  const items = FALLBACK_PRODUCTS[category.label];
  if (!items || items.length === 0) {
    throw new Error(`フォールバック商品が見つかりません: ${category.label}`);
  }
  const item = items[Math.floor(Math.random() * items.length)];
  return {
    name: item.name,
    price: item.price,
    catchcopy: item.catchcopy,
    affiliateUrl: `https://www.amazon.co.jp/dp/${item.asin}?tag=${partnerTag}`,
  };
}

/**
 * Amazon PA-API SearchItems で上位商品を1件取得
 * APIキー未設定時はフォールバック商品リストを使用する
 * @param {{ keywords, searchIndex, label, hashtags }} category
 * @returns {{ name, price, catchcopy, affiliateUrl }}
 */
export async function getTopRankedItem(category) {
  const accessKey  = process.env.AMAZON_ACCESS_KEY;
  const secretKey  = process.env.AMAZON_SECRET_KEY;
  const partnerTag = process.env.AMAZON_PARTNER_TAG;

  // APIキーが未設定の場合はフォールバックを使用
  if (!accessKey || !secretKey || !partnerTag) {
    console.log(`  ℹ️  APIキー未設定 → [${category.label}] フォールバック商品を使用`);
    if (!partnerTag) throw new Error('AMAZON_PARTNER_TAG は必須です（アソシエイトID）');
    return getFallbackItem(category, partnerTag);
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

  let data;
  try {
    data = await client.searchItems(request);
  } catch (err) {
    console.warn(`  ⚠️  PA-API 呼び出しエラー → [${category.label}] フォールバック商品を使用`);
    return getFallbackItem(category, partnerTag);
  }

  const items = data?.SearchResult?.Items;

  if (!items || items.length === 0) {
    console.warn(`  ⚠️  PA-API 結果ゼロ → [${category.label}] フォールバック商品を使用`);
    return getFallbackItem(category, partnerTag);
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
