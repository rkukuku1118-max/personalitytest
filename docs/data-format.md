# データ形式

このアプリは、実行時に Word/PDF を解析しません。アプリが読むデータは `src/data/test-definitions.json` だけです。

## 元資料と変換後データ

元資料は `ref` フォルダに置いています。

- `ref/60/Japanese_self60.doc`
- `ref/60/ScoringKeys_60.pdf`
- `ref/60/descriptives_60.pdf`
- `ref/100/Japanese_self100.doc`
- `ref/100/ScoringKeys_100.pdf`
- `ref/100/descriptives_100.pdf`

これらをもとに、質問文・採点キー・基準値を JSON に変換したものが `src/data/test-definitions.json` です。

## 全体構造

JSON のトップレベルには `60` と `100` の2つのテスト定義があります。

```json
{
  "60": {
    "id": "60",
    "label": "60問版",
    "source": {},
    "responseOptions": [],
    "questions": [],
    "domains": [],
    "norms": {}
  },
  "100": {
    "id": "100",
    "label": "100問版"
  }
}
```

## 主なフィールド

- `id`: テスト種別。`60` または `100`
- `label`: 画面に表示するテスト名
- `source`: 元資料の参照情報
- `responseOptions`: 5件法の選択肢
- `questions`: 質問番号と質問文
- `domains`: 因子、下位尺度、採点対象項目
- `norms`: 因子・下位尺度の平均値と標準偏差

## 質問データ

質問は番号と本文だけを持ちます。

```json
{
  "id": 1,
  "text": "美術館に行くと，とても退屈してしまう。"
}
```

採点上のどの尺度に属するかは、質問側ではなく `domains` 側に持たせています。

## 採点キー

因子は `domains`、下位尺度は `facets` に入っています。各下位尺度の `items` が、採点対象の質問番号です。

```json
{
  "id": "extraversion",
  "label": "外向性",
  "facets": [
    {
      "id": "extraversion_social_boldness",
      "label": "社会的大胆さ",
      "items": [
        { "number": 10, "reverse": true }
      ]
    }
  ]
}
```

`reverse: true` の項目は逆転項目です。回答値をそのまま使わず、`6 - 回答値` に変換して採点します。

## スコア計算

回答値は 1 から 5 です。

- 通常項目: `回答値`
- 逆転項目: `6 - 回答値`
- 下位尺度スコア: 対象項目の平均
- 因子スコア: その因子に含まれる全項目の平均

未回答が残っている尺度は、平均点を確定表示せず、`回答済み数/対象項目数` を表示します。

## 基準値

`norms.domains` は因子、`norms.facets` は下位尺度の基準値です。

```json
{
  "mean": 3.2,
  "sd": 0.6
}
```

回答がそろった尺度では、次の式で z 得点を出します。

```text
z = (スコア - mean) / sd
```

画面上では z 得点をそのまま出すのではなく、「高め」「やや高め」「平均付近」「やや低め」「低め」のような短い解釈ラベルにしています。

## 整合性チェック

JSON を変更したら、次を実行してください。

```bash
pnpm run validate:data
```

このチェックでは、質問数、採点対象の質問番号、基準値の参照、重複や欠落を確認します。
