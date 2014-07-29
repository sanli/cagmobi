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
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        app.receivedEvent('deviceready');
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
        console.log('Received Event: ' + id);
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
    updateStatusBar : function(state){
        //
        return Module;
    },

    // 图片列表渲染函数
    renderList : function(data){
        if(!Module._renderList)
            Module._renderList = doT.template($('#paintinglistTmpl').text());

        return Module._renderList(data);
    },

    renderAuthorList : function(data){
        if(!Module._renderAuthorList)
            Module._renderAuthorList = doT.template($('#authorlistTmpl').text());

        return Module._renderAuthorList(data);
    },

    refreshPaintingList : function(data){
        var out = Module.renderList({
            cagstore : data,
            cdn: _cdn('')
        });
        $('#paintingListRow').empty().append(out);

        $("img.lazy").lazyload({
            effect : "fadeIn",
            skip_invisible : false
        });
        return Module;
    },

    loadEssense : function(state, fn){
        $.mobile.loading( "show")
        $.getJSON(_cag("/cagstore/essence.json") , function(data){
            if(data.R === 'N')
                return $.alert('读取精选推荐数据错误，情稍后再试', 3000);

            Module
                .refreshPaintingList(data)
                .updateStatusBar(state);

            fn(null);
            $.mobile.loading( "hide");
        }).fail(function(){
            $.alert('连接服务器出错，请稍后在试', 5000);
        });
    },

    loadPaintings : function(state, fn){
        var cond = {
            age : state.age,
            author : state.author,            
        }

        $.mobile.loading( "show")
        $.getJSON(_cag("/cagstore/fileinfo.json"), { cond : cond } , function(data){
            if(data.R === 'N')
                return $.alert('读取精数据错误，情稍后再试', 3000);

            Module
                .refreshPaintingList(data)
                .updateStatusBar(state);

            fn(null);
            $.mobile.loading( "hide");
        }).fail(function(){
            $.alert('连接服务器出错，请稍后在试', 5000);
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

    // 载入年代信息到年代列表页面
    loadAge : function(state, fn){
        Module._getOutline(function(err, outline){
            
        });
    },

    // 取得Outline信息，会对取得的Outline进行缓冲，知道程序刷新
    _getOutline : function(fn){
        if(Module.outline)
            return fn(null, Module.outline);

        $.getJSON(_cag("/cagstore/outline.json"), function(data){
            Module.outline = data;
            if(data.R === 'N')
                return $.alert('读取作品信息错误，请稍后再试', 3000);

            fn(null, Module.outline);
        });
    }
};

// 页面控制对象
var PageView = {
    'painting-view-change' : function(page, state, transform){
        // 跳过重复载入过程
        if(Module.currentPaintingViewUrl && Module.currentPaintingViewUrl === transform.absUrl)
            return;

        // load painting data
        $.mobile.loading( "show")
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
            }
            var map = Module.map = L.map('map',{
                maxBounds: bounds,
                minZoom: fileinfo.minlevel,
                crs: L.CRS.Simple,
                fullscreenControl: true
            }).fitBounds( bounds ); 

            var la = state.layer || '';
            Module.tileLayer = L.tileLayer( _cdn('/cagstore/'+ state.uuid +'/{z}' + la + '/{x}_{y}.jpg'), { 
               bounds: bounds,
               maxZoom: fileinfo.maxlevel,
               detectRetina: true
            }).addTo(map);

            map.attributionControl.setPrefix(
                '<a href="/index.html" data-rel="back"><span class="glyphicon glyphicon-home"></span>中华珍宝馆</a>  | '+
                '<a href="/help.html"><span class="glyphicon glyphicon-question-sign"></span>使用帮助</a>'
            );  
            Module.initMap(map);
            $.mobile.loading( "hide")
        }).fail(function() {
            $.alert('载入藏品出错，请<a href="#painting-list-page" data-rel="back">返回</a>', 10000);
        });
    },

    // 列表显示页面 
    'painting-list-page-change' : function(page, state, transform){
        // 跳过重复载入过程
        if(Module.currentPaintingListUrl && Module.currentPaintingListUrl === transform.absUrl)
            return;
        // 正确显示回调
        function done(err){ Module.currentPaintingListUrl = transform.absUrl; }

        // init state
        type = state.type || 'essense';
        if(type === 'essense' ){         // 精选内容
            Module.loadEssense(state, done);
        }else if( type === 'age' || type === 'author' ){         
            // 按照年代,作者,条件
            Module.loadPaintings(state, done);
        }else if(  type === 'search' ){
            // 作品名称查询
            Module.search(state, done);
        }
    }
};

/**
 * jquery mobile 
 */ 
(function($) {
    $(document).on('pagechange', function(event, obj){
        console.log('pagechange',obj.toPage.attr('id'));
        var to = obj.toPage,
            state = $.jqmState(),
            pageid = to.attr('id'),
            pagechangefn = PageView[pageid+'-change'];

        if(pagechangefn){
            pagechangefn(to, state, obj);
        }
    });

    $( document ).bind( "pagecreate", function( e ) {
        var $tgt = $(e.target),
            id = $tgt.attr('id');
        console.log('pagecreate:', id);
        if( id === 'main-page'){
           $.mobile.changePage( "#painting-list-page?type=essense", { transition: "fade", changeHash: true }); 
        }else if(id === 'panel-author-list'){ // 初始化作者列表
            Module.loadAuthor();
        }else if(id === 'panel-age-list'){  // 初始化年代列表
            Module.loadAge();
        }
    });

    $( window ).on( "navigate", function( event, data ) {
      console.log( "navigate", data.state );
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
        console.log("should replace with implementing.");
    }
});


