// ==UserScript==
// @name            patch-nta
// @namespace       https://furyu.hatenablog.com/
// @version         0.0.1.1
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

var index_urltext = get_index_urltext();

if (index_urltext == null) {
    return;
}


var OPTIONS = {
        SEARCH_FORM_TARGET_IS_BLANK : true
    },
    
    PAGE_CONFIGS = [
        {   // 法令解釈通達の目次へのリンクを追加
            name : 'add_tsutatsu_kihon_index_link',
            
            url : () => true,
            
            element : 'a:contains("法令解釈通達")',
            
            patch : ( $element ) => {
                var $index_link_container = $( '<span>&nbsp;-&nbsp;<a/></span>' ),
                    $index_link = $index_link_container.find( 'a' )
                        .attr( 'href', index_urltext )
                        .text( '目次' );
                
                $element.after( $index_link_container );
            }
        },
        
        {   // 検索フォームの差替
            name : 'change_search_form',
            
            url : () => true,
            
            element : '#header_link:not(:has(form#srch))',
            
            patch : ( $element ) => {
                $.get( get_absolute_url( '/', location.href ) )
                .done( ( html ) => {
                    var $header_link = $get_fragment( html ).find( '#header_link' ),
                        $search_form = $header_link.find( 'form#srch' );
                    
                    $search_form.attr( 'accept-charset', 'UTF-8' );
                    // 覚書:一部のページ（[基本通達・法人税法｜法令解釈通達｜国税庁](http://www.nta.go.jp/law/zeiho-kaishaku/tsutatsu/kihon/hojin/01.htm)等）は document.characterSet が "Shift＿JIS" になっている
                    // → 検索フォームの accept-charset を明示しておかないと、検索ページで文字化けしてしまう
                    
                    $element.replaceWith( $header_link );
                    
                    do_patch( 'search_result_to_new_tab' );
                } );
            }
        },
        
        {   // 検索フォームの target を新規タブに
            name : 'search_result_to_new_tab',
            
            url : () => true,
            
            element : '#header_link',
            
            patch : ( $element ) => {
                if ( ! OPTIONS.SEARCH_FORM_TARGET_IS_BLANK ) {
                    return;
                }
                
                $element.find( 'form#srch' ).attr( 'target', '_blank' );
            }
        }
    ];


function get_index_urltext() {
  var base_url = window.location.href;

  var regex = new RegExp("^(.*?www.nta.go.jp/law/zeiho-kaishaku/tsutatsu/kihon/(?:[^0-9].*?/)+)(?:[0-9_]+/)+[0-9_]+\.htm.*?$");

  var result = base_url.match(regex);

  if (result != null) {
    return result[1] + '01.htm';
  } else {
    return null;
  }
}


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
            config_url = page_config.url;
        
        switch ( typeof config_url ) {
            case 'string' :
                if ( ! new RegExp( config_url ).test( test_url ) ) {
                    return;
                }
                break;
            
            case 'object' :
                if ( ! config_url.test( test_url ) ) {
                    return;
                }
                break;
            
            case 'function' :
                if ( ! config_url( test_url ) ) {
                    return;
                }
                break;
            
            default :
                return;
        }
        
        var config_element = page_config.element,
            $elements = $( [] );
        
        switch ( typeof config_element ) {
            case 'string' :
                $elements = $( config_element );
                break;
            
            case 'function' :
                $elements = config_element();
                break;
            
            default :
                return;
        }
        
        $elements.each( function () {
            page_config.patch( $( this ) );
        } );
        
    } );
    
} // end of do_path()


function main() {
    do_patch();
} // end of main()


main();

} )();

// end of search-removed-tweet
