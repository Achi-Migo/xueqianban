;(function($, win, doc) {
  'use strict';

  var $doc = $(document),
      spring = win.spring,
      source = '\
        <header>\
          <h1><span><%=$.spring.config.title%></span></h1>\
          <a href="#" class="btn-back preventlink">Back</a>\
        </header>\
        <a href="#" class="btn-back preventlink">Back</a>\
        <div class="container">\
          <div class="container-inner">\
            <section class="issues" data-number="<%=number%>">\
              <div class="pullup">\
                <span class="ball"></span><span class="ball"></span>\
              </div>\
            </section>\
          </div>\
        </div>',
      sourceContent = '\
        <h1 class="title"><%=title%></h1>\
        <div class="desc markdown">\
          <p>\
          <a href="<%=user.html_url%>" target="_blank"><img alt="@<%=user.login%>" class="issue-author-avatar" height="25" src="<%=user.avatar_url%>&amp;s=96" width="25"></a> Created <%=$.spring.fn.getDate(created_at)%>\
          <%if(created_at !== updated_at) {%>\
           / Updated <%=$.spring.fn.getDate(updated_at)%>\
          <%}%>\
          </p>\
        </div>\
        <article class="markdown">\
          <%=#marked(body)%>\
          <p><a href="<%=html_url%>" target="_blank" class="btn-view"><%=comments.length%> comments / view on github</a></p>\
          <p><%=#renderComments(comments)%></p>\
        </article>',
      render = template.compile(source),
      renderContent = template.compile(sourceContent)


  var commentsTpl = '<% for (var i = 0, length = comments.length; i < length; i++) { %>\
    <div class="timeline-comment-wrapper">\
      <a href="<%=comments[i].user.html_url%>" target="_blank"><img alt="@<%=comments[i].user.login%>" class="timeline-comment-avatar" height="48" src="<%=comments[i].user.avatar_url%>&amp;s=96" width="48"></a>\
      <div class="comment timeline-comment">\
        <div class="timeline-comment-header">\
          <div class="timeline-comment-header-text">\
            <strong><a href="<%=comments[i].user.html_url%>" class="author" target="_blank"><%=comments[i].user.login%></a></strong> <time datetime="<%=comments[i].created_at%>" is="relative-time" title="<%=comments[i].created_at%>"><%=$.spring.fn.getDateTime(comments[i].created_at)%></time>\
          </div>\
        </div>\
        <div class="comment-content">\
          <div class="comment-body">\
            <%=#marked(comments[i].body)%>\
          </div>\
        </div>\
      </div>\
    </div>\
  <% } %>';

  var commentsTplCompiled = template.compile(commentsTpl);

  var mzoom;

  // XXX 将获取数据的逻辑提升到服务层
  function getIssueComments(number, callback) {
    var url = '/repos/' + spring.config.owner + '/' + spring.config.repo + '/issues/' + number + '/comments';
    spring.fn.request(url, {}, function(data) {
      if(data.meta && data.meta.status === 200) {
        callback(data);
      } else {
        console.warn('getIssueComments', data);
      }
    })
  }
  function renderComments(comments) {
    return commentsTplCompiled({comments: comments});
  }
  // XXX 不知道如何嵌入子模版(include貌似只能使用ID?), 使用 helper 暂时来解决问题
  template.helper('renderComments', renderComments);

  var pageLabels = {
    route: 'issues/(:number)',
    classname: 'issues',
    animate: 'slideInLeft',
    title: 'Spring',
    view: function(pageData) {
      var $page = this,
          number = pageData.requestData[0],
          data = {number: number},
          body = render(data)

      if(!number) {
        $doc.trigger('spa:navigate', {hash: '', replace: true})
      }
      
      $doc.trigger('spa:initpage', [$page, {body: body}])
    },
    init: function(pageData) {
      var $view = this,
          $container = $('.container', $view),
          $issues = $('.issues', $container),
          number = $issues.attr('data-number'),
          issue = spring.data.issues[number]

      $container.trigger('spa:scroll', {direction: 'y'})

      if(issue) {
        $issues.trigger('issues:render', {issue: issue})
      } else {
        var method = '/repos/' + spring.config.owner + '/' + spring.config.repo + '/issues/' + number,
            parameters = {}

        spring.fn.request(method, parameters, function(data) {
          if(data.meta && data.meta.status === 200) {
            issue = data.data
            getIssueComments(number, function(data) {
              issue.comments = data.data;
              spring.data.issues[number] = issue;
              $issues.trigger('issues:render', {issue: issue})
            });
          } else {
            $doc.trigger('spa:navigate', {hash: '', replace: true})
          }
        })
      }
    },
    afteropen: function(pageData) {
    }
  }

  $doc.on('issues:render', function(event, options) {
    var $target = $(event.target),
        issue = options.issue

    $target.html(renderContent(issue))

    if (mzoom) {
      mzoom.detach()
    }
    mzoom = mediumZoom('.issues img')
  })

  $doc.trigger('spa:route', pageLabels)

})(Zepto, window, document)