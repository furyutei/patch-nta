// ==UserScript==
// @name            patch-nta
// @namespace       https://furyu.hatenablog.com/
// @version         0.0.1.6
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

if ( window !== window.top ) {
    return;
}

var SCRIPT_NAME = 'patch-nta',
    IS_TOUCHED = ( function () {
        var touched_id = SCRIPT_NAME + '_touched',
            $touched = $( '#' + touched_id );
        
        if ( 0 < $touched.length ) {
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
        SEARCH_FORM_TARGET_IS_BLANK : true,
        REDIRECT_TO_NORMALIZED_URL : true,
    },
    
    PAGE_CONFIGS = [
        {   // 法令解釈通達＞基本通達の目次へのリンクを追加
            name : 'add_tsutatsu_kihon_index_link',
            
            url : '^(https?://www\.nta\.go\.jp/law/(?:zeiho-kaishaku/)?tsutatsu/kihon/(?:sisan/)?[^/]+/)((?:[^/]+/)*)([\\w\\-]+\.htm).*?$',
            
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
                        
                        if ( localStorage.getItem( SCRIPT_NAME + '-ignore-url-' + index_url ) ) {
                           check_index();
                           return;
                        }
                        
                        $.ajax( {
                            url : index_url,
                            beforeSend : function ( xhr ) {
                                xhr.overrideMimeType( 'text/html;charset=' + ( document.characterSet || document.charset ) );
                            }
                        } )
                        .done( ( html ) => {
                            var $document = $get_fragment( html ),
                                title = $document.find( 'title' ).text().replace( /(?:^.*?[／\/]|｜.+$)/g, '' ).trim(),
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
                                localStorage.setItem( SCRIPT_NAME + '-ignore-url-' + index_url, true );
                            }
                            check_index();
                        } );
                    };
                
                check_index();
            }
        },
        
        {   // 法令解釈通達＞個別通達 / 措置法通達の目次へのリンクを追加
            name : 'add_tsutatsu_kobetsu_index_link',
            
            url : '^(https?://www\.nta\.go\.jp/law/(?:zeiho-kaishaku/)?tsutatsu/kobetsu/)(.+)$',
            
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
                    
                    $get_deep_index = function ( path, pattern_info ) {
                        var $deferred = $.Deferred(),
                            $promise = $deferred.promise(),
                            index_url;
                        
                        if ( pattern_info.index_path ) {
                            index_url = new URL( pattern_info.index_path, location.href ).href;
                        }
                        else {
                            if ( ( ! pattern_info.reg_pattern ) || ( ! path.match( new RegExp( pattern_info.reg_pattern ) ) ) ) {
                                $deferred.reject( index_url );
                                return $promise;
                            }
                            
                            index_url = index_url_base + RegExp.$1 + pattern_info.index_filename;
                        }
                        
                        if ( location.href.indexOf( index_url ) == 0 ) {
                            $deferred.resolve( index_url );
                            return $promise;
                        }
                        
                        if ( localStorage.getItem( SCRIPT_NAME + '-ignore-url-' + index_url ) ) {
                            $deferred.reject( index_url );
                            return $promise;
                        }
                        
                        $.ajax( {
                            url : index_url,
                            beforeSend : function ( xhr ) {
                                xhr.overrideMimeType( 'text/html;charset=' + ( document.characterSet || document.charset ) );
                            }
                        } )
                        .done( ( html ) => {
                            add_index_links_from_html( index_url, html );
                            $deferred.resolve( index_url );
                        } )
                        .fail( ( jqXHR ) => {
                            if ( jqXHR.status == 404 ) {
                                localStorage.setItem( SCRIPT_NAME + '-ignore-url-' + index_url, true );
                            }
                            $deferred.reject( index_url );
                        } );
                        
                        return $promise;
                    }, 
                    
                    $find_deep_index = function ( path ) {
                        var $deferred = $.Deferred(),
                            $promise = $deferred.promise(),
                            pattern_info_list = [
                                { index_path : $( '#contents #bodyArea a:contains("目次に戻る")' ).attr( 'href' ) },
                                // "目次に戻る"リンクがある場合、これを優先
                                
                                { reg_pattern : '^(.*?/\\d+/(?:[a-zA-Z_]\\w+/)?)[\\d_]+/(?:[^/]+/)*[^/]+\.htm', index_filename : '01.htm' },
                                // P1. [〔措置法第69条の4《小規模宅地等についての相続税の課税価格の計算の特例》関係〕｜国税庁](http://www.nta.go.jp/law/tsutatsu/kobetsu/sozoku/sochiho/080708/69_4/01.htm#a-4-1)
                                // P2. [第8条の4（（上場株式等に係る配当所得等の課税の特例））関係｜国税庁](http://www.nta.go.jp/law/tsutatsu/kobetsu/shotoku/sochiho/801226/sinkoku/57/08/04.htm)
                                // のようなページを
                                // I1.[目次／租税特別措置法（相続税法の特例関係）の取扱いについて（法令解釈通達）｜国税庁](http://www.nta.go.jp/law/tsutatsu/kobetsu/sozoku/sochiho/080708/01.htm)
                                // I2.[租税特別措置法に係る所得税の取扱いについて｜国税庁](http://www.nta.go.jp/law/tsutatsu/kobetsu/shotoku/sochiho/801226/sinkoku/01.htm)
                                // へとリンク
                                
                                { reg_pattern : '^(.*?/\\d+/)[^/]+\.htm', index_filename : 'index.htm' },
                                // P1. [第1章　法第74条の2～法第74条の6関係（質問検査権）｜国税庁](http://www.nta.go.jp/law/tsutatsu/kobetsu/zeimuchosa/120912/01.htm#a01_1)
                                // のようなページを
                                // I1. [国税通則法第7章の2（国税の調査）関係通達の制定について（法令解釈通達）｜国税庁](http://www.nta.go.jp/law/tsutatsu/kobetsu/zeimuchosa/120912/index.htm)
                                // へとリンク
                                
                                { reg_pattern : '^(.*?/\\d+/)[^/]+\.htm', index_filename : '01.htm' }
                                // P1. [租税特別措置法（相続税法の特例関係）の取扱いについて（法令解釈通達）｜国税庁](http://www.nta.go.jp/law/tsutatsu/kobetsu/sozoku/sochiho/080708/02.htm)
                                // のようなページを
                                // I1. [目次／租税特別措置法（相続税法の特例関係）の取扱いについて（法令解釈通達）｜国税庁](http://www.nta.go.jp/law/tsutatsu/kobetsu/sozoku/sochiho/080708/01.htm)
                                // へとリンク
                            ],
                            
                            check = function () {
                                var pattern_info = pattern_info_list.shift();
                                
                                if ( ! pattern_info ) {
                                    $deferred.reject();
                                    return;
                                }
                                
                                $get_deep_index( path, pattern_info )
                                .done( ( index_url ) => {
                                    if ( location.href.indexOf( index_url ) == 0 ) {
                                        // 現在位置が目次の場合、それより上位の目次を探すために reject() しておく
                                        $deferred.reject( index_url, pattern_info );
                                    }
                                    else {
                                        $deferred.resolve( index_url, pattern_info );
                                    }
                                } )
                                .fail( ( index_url ) => {
                                    check();
                                } );
                            };
                        
                        check();
                        
                        return $promise;
                    }, 
                    
                    add_index_links_from_html = function ( index_url, html ) {
                        var $document = $get_fragment( html ),
                            title = $document.find( 'title' ).text().replace( /(?:^.*?[／\/]|｜.+$|目次)/g, '' ).trim(),
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
                    },
                    
                    add_index_links = function ( path_to_index ) {
                        var index_url = index_url_base + path_to_index;
                        
                        if ( location.href.indexOf( index_url ) == 0 ) {
                            return;
                        }
                        
                        $.ajax( {
                            url : index_url,
                            beforeSend : function ( xhr ) {
                                xhr.overrideMimeType( 'text/html;charset=' + ( document.characterSet || document.charset ) );
                            }
                        } )
                        .done( ( html ) => {
                            add_index_links_from_html( index_url, html );
                        } );
                    };
                
                $find_deep_index( path )
                .done( ( index_url, pattern_info ) => {
                } )
                .fail( () => {
                    if ( path.match( /^(.*?\/sochiho\/)/ ) ) {
                        // 措置法通達(共通)
                        add_index_links( RegExp.$1 + 'sotihou.htm' );
                        
                        return;
                    }
                    
                    $( path_infos ).each( function () {
                        var path_info = this,
                            match_path = path.match( new RegExp( path_info.path_reg ) );
                        
                        if ( ! match_path ) {
                            return;
                        }
                        
                        var index_path = path_info.index_path,
                            holders = index_path.match( /\$\d+/g );
                        
                        if ( holders ) {
                            holders.forEach( function ( holder ) {
                                index_path = index_path.replace( new RegExp( '\\' + holder, 'g' ), match_path[ parseInt( holder.slice( 1 ), 10 ) ] );
                            } );
                        }
                        
                        add_index_links( index_path );
                        
                        return false;
                    } );
                } );
            }
        },
        
        {   // 法令解釈通達＞一部改正通達の目次情報を保存
            name : 'save_tsutatsu_kaisei_index_info',
            
            url : '^https?://www\.nta\.go\.jp/law/.*?/kaisei?[^/]*.htm',
            
            element : 'body',
            
            patch : function ( $element ) {
                var patch_info = this,
                    url_info = new URL( location.href ),
                    path = url_info.pathname,
                    path_index_map = get_path_index_map();
                
                var index_path = path,
                    title = document.title.replace( /(?:^.*?[／\/]|｜.+$|目次)/g, '' ).trim();
                
                path_index_map.index_path_to_title[ index_path ] = title ? title : '目次';
                
                $element.find( '#contents #bodyArea #page-top' ).nextAll( 'ul:first' ).find('> li > a').each( function () {
                    var $link = $( this ),
                        path = new URL( $link.attr( 'href' ), location.href ).pathname,
                        index_info_list = ( function () {
                            if ( ! path_index_map.path_to_index_info_list[ path ] ) {
                                path_index_map.path_to_index_info_list[ path ] = [];
                            }
                            return path_index_map.path_to_index_info_list[ path ];
                        } )(),
                        filterd_list = $( index_info_list ).filter( function () {
                            return this.path == index_path;
                        } );
                    
                    if ( filterd_list.length <= 0 ) {
                        index_info_list.push( {
                            path : index_path
                        } );
                    }
                } );
                
                set_path_index_map( path_index_map );
            }
        },
        
        {   // 法令解釈通達＞一部改正通達の目次へのリンクを追加
            name : 'add_tsutatsu_kaisei_index_link',
            
            url : () => true,
            
            element : 'body',
            
            patch : function ( $element ) {
                var patch_info = this,
                    url_info = new URL( location.href ),
                    path = url_info.pathname,
                    path_index_map = get_path_index_map();
                
                var index_info_list = path_index_map.path_to_index_info_list[ path ];
                
                if ( ( ! index_info_list ) || ( index_info_list.length <= 0 ) ) {
                    return;
                }
                
                var $index_link_container = $( '<span>&nbsp;-&nbsp;</span>' );
                
                $( index_info_list ).each( function () {
                    var index_info = this,
                        $link = $( '<a/>' ).attr( 'href', index_info.path ).text( path_index_map.index_path_to_title[ index_info.path ] ),
                        $seperator = $( '<span>|</span>' );
                    
                    $index_link_container.append( $link ).append( $seperator );
                } );
                
                $index_link_container.find( 'span:last' ).remove();
                
                $element.find( 'a:contains("法令解釈通達")' ).filter( function () {
                    return $( this ).text().trim() == '法令解釈通達';
                } ).each( function () {
                    var $target_link = $( this );
                    
                    $target_link.after( $index_link_container.clone( true ) );
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
                        $script = $header_link.find( 'script' ),
                        $replace_target = $element.find( '.sitesearch' );
                    
                    $search_form.attr( 'accept-charset', 'UTF-8' );
                    // ■覚書
                    // 一部のページ（[基本通達・法人税法｜法令解釈通達｜国税庁](http://www.nta.go.jp/law/zeiho-kaishaku/tsutatsu/kihon/hojin/01.htm)等）は document.characterSet が "Shift_JIS" になっている
                    // → 検索フォームの accept-charset を明示しておかないと、検索ページで文字化けしてしまう
                    
                    if ( 0 < $replace_target.length ) {
                        $replace_target.replaceWith( $srchBox );
                    }
                    else {
                        $element.find( '.header_navi' ).before( $srchBox );
                    }
                    
                    $srchBox.after( $script );
                    
                    do_patch( 'search_result_to_new_tab' );
                } );
            }
        },
        
        {   // 検索フォームの target を新規タブに
            name : 'search_result_to_new_tab',
            
            url : () => true,
            
            element : 'body',
            
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


function check_redirect() {
    if ( ! OPTIONS.REDIRECT_TO_NORMALIZED_URL ) {
        return false;
    }
    
    if ( ! location.href.match( new RegExp( '^(https?://www\.nta\.go\.jp/law/)zeiho-kaishaku/(.*)$' ) ) ) {
        return false;
    }
    
    location.replace( RegExp.$1 + RegExp.$2 );
    
    return true;
} // end of check_redirect()


function get_path_index_map( path_index_map_name ) {
    if ( ! path_index_map_name ) {
        path_index_map_name = SCRIPT_NAME + '-path_index_map';
    }
    
    var path_index_map;
    
    try {
        path_index_map = JSON.parse( localStorage.getItem( path_index_map_name ) );
    }
    catch ( error ) {
    }
    
    if ( ! path_index_map ) {
        path_index_map = {
            path_to_index_info_list : {},
            index_path_to_title : {}
        };
    }
    else {
        if ( ! path_index_map.path_to_index_info_list ) {
            path_index_map.path_to_index_info_list = {};
        }
        if ( ! path_index_map.index_path_to_title ) {
            path_index_map.index_path_to_title = {};
        }
    }
    
    return path_index_map;
} // end of get_path_index_map()


function set_path_index_map( path_index_map, path_index_map_name ) {
    if ( ! path_index_map ) {
        return;
    }
    
    if ( ! path_index_map_name ) {
        path_index_map_name = SCRIPT_NAME + '-path_index_map';
    }
    
    localStorage.setItem( path_index_map_name, JSON.stringify( path_index_map ) );
} // end of set_path_index_map()


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
    if ( check_redirect() ) {
        return;
    }
    
    do_patch();
} // end of main()


main();

} )();

// end of search-removed-tweet
