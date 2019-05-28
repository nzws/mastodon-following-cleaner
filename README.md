# mastodon-following-cleaner

## これはなに

サーバ移動する時とかにクリーンな状態でフォローインポートできるツール

- 消滅予定, 消滅したインスタンスのユーザを消す機能
- 一定期間投稿(ブースト, 返信含む)をしていないユーザを消す機能

## 使い方

#### 各種ファイルを揃える

`mastodon-following-cleaner` 直下に、

- 今のアカウントから取り出したフォローエクスポートを `following_accounts.csv` として
- `config.sample.json` を `config.json` に名前変更して
置いてください。

#### config.json を書く

```json
{
  "domain": "Mastodonインスタンスのドメイン",
  "token": "自分のアクセストークン",
  "unfollow_domains": ["消したいインスタンス", "(配列可)"],
  "unactive_period": {
    "months": 1
  }
}
```

`unactive_period` には非アクティブと判断する期間を指定できます。(デフォルトは1ヶ月)

詳しくはmoment.jsのドキュメントを参考に設定してください。
https://momentjs.com/docs/#/manipulating/add/

#### 依存関係をインストール

```bash
yarn install
```

#### らん

```bash
yarn start
```

> かなり時間かかるので気長に待ちましょう。
> また、フォロー数が異常に多い場合はAPIのレートリミットに引っかかる場合があります。その場合でも1分後にやり直すようになってる...はず

#### 完了

コンソールに
```
Create result.csv!!!✨
```
と表示されれば完了です。 `result.csv` が新しいフォローインポートになります。

なんかよくわからないけど1行目がカンマだけだったら、
```
Account address,Show boosts
```
に変えてあげてください。

![Imgur](https://i.imgur.com/Ph7620Y.png)