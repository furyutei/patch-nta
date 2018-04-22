// ==UserScript==
// @name            patch-nta
// @namespace       https://furyu.hatenablog.com/
// @version         0.0.1.3
// @description     使いづらくなったと評判の(?)[国税庁のホームページ](https://www.nta.go.jp/)にパッチをあてます。
// @author          furyu
// @match           *://www.nta.go.jp/*
// @require         https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js
// ==/UserScript==

/*
Required
--------
- [jQuery](https://jquery.com/)
    The MIT License
    [License | jQuery Foundation](https://jquery.org/license/)
*/

/*
The MIT License (MIT)

Copyright (c) 2018 furyu <furyutei@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

( function () {

'use strict';

if ( window !== top ) {
    return;
}

var SCRIPT_NAME = 'patch-nta',
    IS_TOUCHED = ( function () {
        var touched_id = SCRIPT_NAME + '_touched',
            jq_touched = $( '#' + touched_id );
        
        if ( 0 < jq_touched.length ) {
            return true;
        }
        
        $( '<b>' ).attr( 'id', touched_id ).css( 'display', 'none' ).appendTo( $( document.documentElement ) );
        
        return false;
    } )();

if ( IS_TOUCHED ) {
    console.error( SCRIPT_NAME + ': Already loaded.' );
    return;
}


var OPTIONS = {
        SEARCH_FORM_TARGET_IS_BLANK : true
    },
    
    PAGE_CONFIGS = [
        {   // 法令解釈通達＞基本通達の目次へのリンクを追加
            // TODO:
            //  一部改正通達には未対応
            //  例えば
            //  [「所得税基本通達の制定について」の一部改正について（法令解釈通達）｜所得税法・一部改正通達｜国税庁](http://www.nta.go.jp/law/zeiho-kaishaku/tsutatsu/kihon/shotoku/kaisei/171127/index.htm)
            //  から
            //  [所得税法　一部改正通達｜法令解釈通達｜国税庁](http://www.nta.go.jp/law/zeiho-kaishaku/tsutatsu/kihon/shotoku/kaisei/kaisei_a.htm) 
            //  などへは戻れない
            name : 'add_tsutatsu_kihon_index_link',
            
            url : '^(https?://www\.nta\.go\.jp/law/zeiho-kaishaku/tsutatsu/kihon/(?:sisan/)?[^/]+/)((?:[^/]+/)*)([\\w\\-]+\.htm).*?$',
            
            element : 'body',
            
            patch : function ( $element ) {
                var patch_info = this,
                    index_url_base = patch_info.url_match_result[ 1 ],
                    current_directory = patch_info.url_match_result[ 2 ],
                    current_filename = patch_info.url_match_result[ 3 ];
                
                var index_files = [ 'index.htm', 'mokuji.htm', '01.htm', '00.htm' ],
                    check_index = function () {
                        var index_file = index_files.shift();
                        
                        if ( ! index_file ) {
                            return;
                        }
                        
                        var index_url = index_url_base + index_file;
                        
                        if ( location.href.indexOf( index_url ) == 0 ) {
                            return;
                        }
                        
                        if ( localStorage.getItem(  SCRIPT_NAME + '-ignore-url-' + index_url ) ) {
                           check_index();
                           return;
                        }
                        
                        $.ajax( {
                            url : index_url,
                            beforeSend : function ( xhr ) {
                                xhr.overrideMimeType( 'text/html;charset=' + (  document.characterSet || document.charset ) );
                            }
                        } )
                        .done( ( html ) => {
                            var $documnet = $get_fragment( html ),
                                title = $documnet.find( 'title' ).text().replace( /(?:^.*?[／\/]|｜.+$)/g, '' ).trim(),
                                $header_link = $documnet.find( '#header_link' ),
                                $index_link_container = $( '<span>&nbsp;-&nbsp;<a/></span>' ),
                                $index_link = $index_link_container.find( 'a' )
                                    .attr( 'href', index_url )
                                    .text( title ? title : '目次' );
                            
                            $element.find( 'a:contains("法令解釈通達")' ).filter( function () {
                                return $( this ).text().trim() == '法令解釈通達';
                            } ).each( function () {
                                var $target_link = $( this );
                                
                                $target_link.after( $index_link_container.clone( true ) );
                            } );
                        } )
                        .fail( ( jqXHR ) => {
                            if ( jqXHR.status == 404 ) {
                                localStorage.setItem(  SCRIPT_NAME + '-ignore-url-' + index_url, true );
                            }
                            check_index();
                        } );
                    };
                
                check_index();
            }
        },
        
        {   // 法令解釈通達＞個別通達 / 措置法通達 の目次へのリンクを追加
            name : 'add_tsutatsu_kobetsu_index_link',
            
            url : '^(https?://www\.nta\.go\.jp/law/zeiho-kaishaku/tsutatsu/kobetsu/)(.+)$',
            
            element : 'body',
            
            patch : function ( $element ) {
                var patch_info = this,
                    index_url_base = patch_info.url_match_result[ 1 ],
                    path = patch_info.url_match_result[ 2 ],
                    path_infos = [
                        // [所得税関係]
                        { // 申告所得税関係
                            path_reg : '^shotoku/shinkoku/',
                            index_path : 'shotoku/shinkoku/sinkoku.htm'
                        },
                        { // 源泉所得税関係
                            path_reg : '^shotoku/gensen/',
                            index_path : 'shotoku/gensen/gensen.htm'
                        },
                        { // 譲渡・山林所得関係
                            path_reg : '^shotoku/joto-sanrin/',
                            index_path : 'shotoku/joto-sanrin/sanrin.htm'
                        },
                        
                        // [相続・贈与税関係]
                        { // 相続税関係
                            path_reg : '^sozoku/',
                            index_path : 'sozoku/souzoku.htm'
                        },
                        
                        { // 財産評価関係
                            path_reg : '^hyoka/',
                            index_path : 'hyoka/zaisan.htm'
                        },
                        
                        // [法人税関係]
                        {
                            path_reg : '^hojin/',
                            index_path : 'hojin/houzin.htm'
                        },
                        
                        // [間接税関係]
                        {
                            path_reg : '^kansetsu/',
                            index_path : 'kansetsu/syouhi.htm'
                        },
                        
                        // [徴収関係]
                        {
                            path_reg : '^chosyu/',
                            index_path : 'chosyu/chosyu.htm'
                        },
                        
                        // [その他]
                        { // 税務調査手続関係
                            path_reg : '^zeimuchosa/',
                            index_path : 'zeimuchosa/zeimuchosa.htm'
                        },
                        { // 法定資料関係
                            path_reg : '^hotei/',
                            index_path : 'hotei/shiryo.htm'
                        },
                        { // 税理士法関係
                            path_reg : '^zeirishi/',
                            index_path : 'zeirishi/zeirishi2.htm'
                        },
                        { // その他
                            path_reg : '^sonota/',
                            index_path : 'sonota/sonota.htm'
                        }
                    ],
                    
                    add_index_links = function ( path_to_index ) {
                        var index_url = index_url_base + path_to_index;
                        
                        if ( location.href.indexOf( index_url ) == 0 ) {
                            return;
                        }
                        
                        var title = document.title.split( '｜' )[ 1 ],
                            $index_link_container = $( '<span>&nbsp;-&nbsp;<a/></span>' ),
                            $index_link = $index_link_container.find( 'a' )
                                .attr( 'href', index_url )
                                .text( title ? title.replace( /目次.*/, '' ).trim() : '目次' );
                        
                        $element.find( 'a:contains("法令解釈通達")' ).filter( function () {
                            return $( this ).text().trim() == '法令解釈通達';
                        } ).each( function () {
                            var $target_link = $( this );
                            
                            $target_link.after( $index_link_container.clone( true ) );
                        } );
                    };
                
                if ( path.match( /^(.*?\/sochiho\/)/ ) ) {
                    // 措置法通達(共通)
                    add_index_links( RegExp.$1 + 'sotihou.htm' );
                    
                    return;
                }
                
                $( path_infos ).each( function () {
                    var path_info = this;
                    
                    if ( ! new RegExp( path_info.path_reg ).test( path ) ) {
                        return;
                    }
                    
                    add_index_links( path_info.index_path );
                    
                    return false;
                } );
            }
        },
        
        {   // 検索フォームの差替
            name : 'change_search_form',
            
            url : () => true,
            
            element : '#header_link:not(:has(form#srch))',
            
            patch : function ( $element ) {
                $.get( get_absolute_url( '/', location.href ) )
                .done( ( html ) => {
                    var $header_link = $get_fragment( html ).find( '#header_link' ),
                        $srchBox = $header_link.find( '#srchBox' ),
                        $search_form = $srchBox.find( 'form#srch' ),
                        $script = $header_link.find( 'script' );
                    
                    $search_form.attr( 'accept-charset', 'UTF-8' );
                    // ■覚書
                    // 一部のページ（[基本通達・法人税法｜法令解釈通達｜国税庁](http://www.nta.go.jp/law/zeiho-kaishaku/tsutatsu/kihon/hojin/01.htm)等）は document.characterSet が "Shift＿JIS" になっている
                    // → 検索フォームの accept-charset を明示しておかないと、検索ページで文字化けしてしまう
                    
                    $element.find( '.sitesearch' ).replaceWith( $srchBox );
                    $srchBox.after( $script );
                    
                    do_patch( 'search_result_to_new_tab' );
                } );
            }
        },
        
        {   // 検索フォームの target を新規タブに
            name : 'search_result_to_new_tab',
            
            url : () => true,
            
            element : '#header_link',
            
            patch : function ( $element ) {
                if ( ! OPTIONS.SEARCH_FORM_TARGET_IS_BLANK ) {
                    return;
                }
                
                $element.find( 'form#srch' ).attr( 'target', '_blank' );
            }
        }
    ];


function get_absolute_url( path, base_url ) {
    if ( ! base_url ) {
        base_url = window.location.href;
    }
    
    try {
        return new URL( path, base_url ).href;
    }
    catch ( error ) {
        return path;
    }
} // end of get_absolute_url()


var $get_fragment = ( function () {
    if ( ( ! document.implementation ) || ( typeof document.implementation.createHTMLDocument != 'function' ) ) {
        return function ( html ) {
            return $( '<div/>' ).html( html );
        };
    }
    
    // 解析段階での余分なネットワークアクセス（画像等の読み込み）抑制
    var html_document = document.implementation.createHTMLDocument(''),
        range = html_document.createRange();
    
    return function ( html ) {
        return $( range.createContextualFragment( html ) );
    };
} )(); // end of $get_fragment()


function do_patch( patch_name ) {
    PAGE_CONFIGS.forEach( ( page_config ) => {
        if ( patch_name && ( page_config.name !== patch_name ) ) {
            return;
        }
        
        var test_url = location.href,
            config_url = page_config.url,
            patch_info = { page_config : page_config },
            url_match_result;
        
        switch ( typeof config_url ) {
            case 'string' :
                url_match_result = test_url.match( new RegExp( config_url ) );
                break;
            
            case 'object' :
                url_match_result = test_url.match( config_url );
                break;
            
            case 'function' :
                url_match_result = config_url( test_url );
                break;
        }
        if ( ! url_match_result ) {
            return;
        }
        
        patch_info.url_match_result = url_match_result;
        
        var config_element = page_config.element,
            $elements = $( [] );
        
        switch ( typeof config_element ) {
            case 'string' :
                $elements = $( config_element );
                break;
            
            case 'object' :
                $elements = $( config_element );
                break;
            
            case 'function' :
                $elements = config_element();
                break;
            
            default :
                return;
        }
        
        patch_info.$elements = $elements;
        
        $elements.each( function ( index, element ) {
            var $element = $( element );
            
            patch_info.element_info = {
                index : index,
                element : element,
                $element : $element
            };
            
            page_config.patch.call( patch_info, $element );
        } );
        
    } );
    
} // end of do_path()


function main() {
    do_patch();
} // end of main()


main();

} )();

// end of search-removed-tweet
