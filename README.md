patch-nta
=========

使いづらくなったと評判の(?)、[国税庁のホームページ](https://www.nta.go.jp/)にちょっとしたパッチをあてます。  
※元ネタ：[はけた@m-haketa](https://twitter.com/excelspeedup)氏の[ツイート](https://twitter.com/excelspeedup/status/987261677287559169)  


インストール
------------
[Tampermonkey](http://tampermonkey.net/)を入れたブラウザで、  

> [patch-nta.user.js](https://furyutei.github.io/patch-nta/src/js/patch-nta.user.js)  

をクリックしてインストール。  


使い方
------
国税庁のページ（[例](http://www.nta.go.jp/law/zeiho-kaishaku/tsutatsu/kihon/hojin/01/01_01.htm)）を訪れると、さりげなくパッチがあたる、かもしれません。  

- [法令解釈通達](http://www.nta.go.jp/law/zeiho-kaishaku/tsutatsu/menu.htm)下の個別ページを開いたとき、目次ページが分かればそのリンクを追加  
- 右上の検索フォームが動作しないものの場合、Yahoo検索フォームに置換  
- 同検索結果は別タブに表示  


ライセンス
----------
[The MIT License](https://github.com/furyutei/patch-nta/blob/master/LICENSE)  
