/*
 * codova app controller
 */
var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },

    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },

    // deviceready Event Handler
    onDeviceReady: function() {
        // google分析器
        //analytics.debugMode();
        analytics.startTrackerWithId('UA-50311706-3');
        navigator.splashscreen.hide();
        StatusBar.hide();
    }
};

// 生成访问cdn的url
function _cdn(url){
    return 'http://supperdetailpainter.u.qiniudn.com' + url;
};

function _cag(url){
    return 'http://zhenbao.duapp.com' + url;
    //return 'http://localhost:18080' + url;
}

// 数据对象
var Module = {
    // 初始化图片，创建控件
    initMap : function(map){
        // 暂时不实现这个功能
        // Module.commentctl = new MyControl();
        // Module.commentctl.click = function(){
        //     //Module.toggleEditState();
        //     // 显示标注Pannel
        // };
        // map.addControl(Module.commentctl);
    },

    // 更新底部的状态栏
    updateStatusBar : function(text){
        $.mobile.activePage.find('h1.status-bar').text(text)
        return Module;
    },

    // 图片列表渲染函数
    renderList : function(data){
        if(!Module._renderList)
            Module._renderList = doT.template($('#paintinglistTmpl').text());

        return Module._renderList(data);
    },

    renderMessageList : function(data){
        if(!Module._renderMessageList)
            Module._renderMessageList = doT.template($('#messagelistTmpl').text());

        return Module._renderMessageList(data);
    },

    renderAuthorList : function(data){
        if(!Module._renderAuthorList)
            Module._renderAuthorList = doT.template($('#authorlistTmpl').text());

        return Module._renderAuthorList(data);
    },

    refreshPaintingList : function(data, listview){
        var out = Module.renderList({
            cagstore : data,
            cdn: _cdn('')
        });
        listview.empty()
            .append(out).listview('refresh');

        $("img.lazy").lazyload({
            // fadeIn在Android上的效果不好，所以暂时不使用效果
            //effect : "fadeIn",
            skip_invisible : false
        });
        return Module;
    },

    // 载入关于中华珍宝馆页面
    loadAbout : function(state, fn){
        $('#panel-about').on('click','a.goto-appstore', function(event){
            event.preventDefault();
            var tgt = $(event.target),
                appstoreHref =  tgt.is('a') ? tgt.data('href') : tgt.parents('a').data('href');
            console.log('appstore-href:' , appstoreHref);
            window.open(appstoreHref, '_system', 'location=no');
        });
    },

    loadEssense : function(state, fn){
        $.mobile.loading("show", { text : '正在载入精选列表...', textVisible: true})
        $.getJSON(_cag("/cagstore/essence.json") , function(data){
            if(data.R === 'N')
                return $.alert('读取精选推荐数据错误，情稍后再试', 3000);

            Module
                .refreshPaintingList(data, $('#essenseListRow'))
                .updateStatusBar('精选藏品');

            fn(null);
            $.mobile.loading( "hide");
        }).fail(function(){
            $.alert('连接服务器出错，请稍后重试', 5000);
        });
    },

    loadPaintings : function(state, fn){
        var cond = {
            age : state.age,
            author : state.author,            
        }

        $.mobile.loading("show", { text : '正在载入列表...', textVisible: true})
        $.getJSON(_cag("/cagstore/fileinfo.json"), { cond : cond } , function(data){
            if(data.R === 'N')
                return $.alert('读取精数据错误，情稍后再试', 3000);

            var status = (state.type === 'age') ? '按年代查看 ' + state.age : '按作者查看 ' + state.author;

            Module
                .refreshPaintingList(data, $('#paintingListRow'))
                .updateStatusBar(status);

            fn(null);
            $.mobile.loading( "hide");
        }).fail(function(){
            $.alert('连接服务器出错，请稍后重试', 5000);
        });
    },

    search : function(state, fn){
        var key = state.key,
            reg = 'Reg(' + key + ')',
            cond = {  $or : [{ author :  reg } , { paintingName : reg }] };


    },

    // 载入作者信息到作者列表页面
    loadAuthor : function(state, fn){
        Module._getOutline(function(err, outline){
            if(err) return ;
            var authors = $.map(outline, function(age, i){
                return $.map(age.authors, function(author, j){ return { name : author.name, num : author.paintings.length , age : age._id } ;  });
            });

            var out = Module.renderAuthorList({
                authors : authors
            });
            $('#author-list').append(out).listview('refresh');

            return Module;
        });
    },

    loadMessage : function(state, fn){
        $.mobile.loading("show", { text : '正在载入新藏品消息...', textVisible: true});
        $.getJSON(_cag("/message.json"), function(data){
            if(data.R === 'N')
                return $.alert('读取新藏品消息错误，请稍后再试', 3000);

            var out = Module.renderMessageList({
                messages : data,
                cdn: _cdn('')
            });
            $('#message-list').empty()
                .append(out).listview('refresh');
            
            $.mobile.loading( "hide");
        }).fail(function(){
            $.alert('连接服务器出错，请稍后重试', 5000);
        });
    },

    // 载入年代信息到年代列表页面
    loadAge : function(state, fn){
        Module._getOutline(function(err, outline){
            
        });
    },

    // 取得Outline信息，会对取得的Outline进行缓冲，知道程序刷新
    _getOutline : function(fn){
        if(Module.outline)
            return fn(null, Module.outline);

        $.mobile.loading("show", { text : '正在读取藏品信息...', textVisible: true});
        $.getJSON(_cag("/cagstore/outline.json"), function(data){
            $.mobile.loading("hide");
            Module.outline = data;
            if(data.R === 'N')
                return $.alert('读取作品信息错误，请稍后重试', 3000);

            fn(null, Module.outline);
        });
    }
};

// 页面控制对象
var PageView = {
    // 准备开始载入图片，首先清除当前图片
    'painting-view-beforechange' : function(page, state, transform){
        // 跳过重复载入过程
        if(Module.currentPaintingViewUrl && Module.currentPaintingViewUrl === transform.absUrl)
            return;

        if(Module.map){
            Module.map.remove();
            Module.map = null;
        };
    },

    // 动画完成，开始载入图片
    'painting-view-change' : function(page, state, transform){
        // 跳过重复载入过程
        if(Module.currentPaintingViewUrl && Module.currentPaintingViewUrl === transform.absUrl){
            return;
        }

        // load painting data
        $.mobile.loading("show", { text : '正在载入高清图片...', textVisible: true})
        $.getJSON(_cdn("/cagstore/"+ state.uuid + "/meta.json"), function(data){
            Module.currentPaintingViewUrl = transform.absUrl;
            var fileinfo = Module.fileinfo = data;
            document.title = "中华珍宝馆-" + fileinfo.age + '-' + fileinfo.author + '-' + fileinfo.paintingName;
            // $('#painting-title').text(fileinfo.paintingName); 

            var width = fileinfo.size.width,
                height = fileinfo.size.height,
                northEast = L.CRS.Simple.pointToLatLng(L.point([width, 0]), 18),
                southWest = L.CRS.Simple.pointToLatLng(L.point([0, height]), 18),
                bounds = L.latLngBounds(southWest, northEast);

            if(Module.map){
                Module.map.remove();
                Module.map = null;
            };
            var map = Module.map = L.map('map',{
                maxBounds: bounds,
                minZoom: fileinfo.minlevel,
                crs: L.CRS.Simple,
                zoomControl: false
            }).fitBounds( bounds ); 

            var la = state.layer || '';
            Module.tileLayer = L.tileLayer( _cdn('/cagstore/'+ state.uuid +'/{z}' + la + '/{x}_{y}.jpg'), { 
               bounds: bounds,
               maxZoom: fileinfo.maxlevel,
               detectRetina: true
            }).addTo(map);

            map.attributionControl.setPrefix(
                '<a id="imgback-link" href="/index.html" data-rel="back"><span class="glyphicon glyphicon-home"></span>返回中华珍宝馆</a>'
            );  
            Module.initMap(map);
            $.mobile.loading( "hide")
        }).fail(function() {
            $.alert('载入藏品出错，请<a href="#painting-list-page" data-rel="back">返回</a>', 10000);
        });
    },


    // 清除列表显示页面 
    'painting-list-page-beforechange' : function(page, state, transform){
        // 跳过重复载入过程
        if(Module.currentPaintingListUrl && Module.currentPaintingListUrl === transform.absUrl)
            return;
        
        $('#paintingListRow').empty();
    },

    // 列表显示页面 
    'painting-list-page-change' : function(page, state, transform){
        // 跳过重复载入过程
        if(Module.currentPaintingListUrl && Module.currentPaintingListUrl === transform.absUrl){
            // 由于一个未知bug，页面切换后丢失lazyload，需要重新绑定
            $("img.lazy").lazyload({
                // fadeIn在Android上的效果不好，所以暂时不使用效果
                //effect : "fadeIn",
                skip_invisible : false
            });
            return;
        }

        // 正确显示回调
        function done(err){ 
            Module.currentPaintingListUrl = transform.absUrl; 
        }

        // init state
        type = state.type || 'essense';
        if( type === 'age' || type === 'author' ){         
            // 按照年代,作者,条件
            Module.loadPaintings(state, done);
        }else if(  type === 'search' ){
            // 作品名称查询
            Module.search(state, done);
        }
    },

    'essense-list-page-change' : function(page, state, transform){
        // 跳过重复载入过程
        if(Module.currentPaintingListUrl && Module.currentPaintingListUrl === transform.absUrl){
            // 由于一个未知bug，页面切换后丢失lazyload，需要重新绑定
            $("img.lazy").lazyload({
                // fadeIn在Android上的效果不好，所以暂时不使用效果
                //effect : "fadeIn",
                skip_invisible : false
            });
            return;
        }

        // 正确显示回调
        function done(err){ 
            Module.currentPaintingListUrl = transform.absUrl; 
        }
        Module.loadEssense(state, done);
    }
};

/**
 * jquery mobile 
 */ 
(function($) {
    // 页面切换前出发的事件，用于清除页面内容
    $( document ).on( "pagecontainerbeforetransition", function( event, data ) {
        var to = data.toPage,
            state = $.jqmState(),
            pageid = to.attr('id'),
            pagechangefn = PageView[pageid+'-beforechange'];

        if(pagechangefn){
            pagechangefn(to, state, data);
        }
    });

    $(document).on('pagechange', function(event, obj){
        var to = obj.toPage,
            state = $.jqmState(),
            pageid = to.attr('id'),
            pagechangefn = PageView[pageid+'-change'];

        // track user
        if(window.analytics && obj && obj.absUrl)
            analytics.trackView(obj.absUrl);

        if(pagechangefn){
            pagechangefn(to, state, obj);
        }
    });

    $( document ).bind( "pagecreate", function( e ) {
        var $tgt = $(e.target),
            id = $tgt.attr('id');
        if( id === 'main-page'){  // 首页直接跳转到精选页面
           $.mobile.changePage( "#essense-list-page?type=essense", { transition: "fade", changeHash: true }); 
        }else if(id === 'panel-author-list'){ // 初始化作者列表
            Module.loadAuthor();
        }else if(id === 'panel-age-list'){  // 初始化年代列表
            Module.loadAge();
        }else if(id === 'panel-message-list'){
            Module.loadMessage();
        }else if(id === 'panel-about'){
            Module.loadAbout();
        }
    });

    $( window ).on( "navigate", function( event, data ) {
        //console.log( "navigate", data.state );
    });

})(jQuery);


// 按钮控件
var MyControl = L.Control.extend({
    options: {
        position: 'topright',
        title: '打开赏析面板'
    },

    onAdd: function (map) {
        var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control my-custom-control');
        this.link = L.DomUtil.create('a', 'glyphicon glyphicon-pencil', container);
        this.link.title = this.options.title;
        L.DomEvent.on(this.link, 'click', this._click, this);
        return container;
    },

    _click : function(e){
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
        this.click(e);
    },

    click : function(e){
        //console.log("should replace with implementing.");
    }
});


