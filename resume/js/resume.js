jQuery.easing.jswing=jQuery.easing.swing;jQuery.extend(jQuery.easing,{def:"easeOutQuad",swing:function(e,a,b,c,d){return jQuery.easing[jQuery.easing.def](e,a,b,c,d)},easeInOutCubic:function(e,a,b,c,d){return 1>(a/=d/2)?c/2*a*a*a+b:c/2*((a-=2)*a*a+2)+b},easeOutQuad:function(x,t,b,c,d){return -c*(t/=d)*(t-2)+b;}});

(function (w, $, undefined) {
  w.Resume = (function () {
    var methods = {};

    methods.init = function () {
      var xhr = new w.XMLHttpRequest
        , uri = 'https://api.github.com/users/p-m-p/repos?type=owner';

      if (typeof xhr.withCredentials === 'undefined') {
        uri = 'shim/repos.json';
      }

      $.ajax({
          url: uri
        , success: mostWatchedRepos
        , dataType: 'json'
      });

      $('.skill-level').each(function () {
        var $sl = $(this)
          , level = ($sl.data('level') || 0) + '%';

        if (Modernizr.csstransitions) {
          $sl.css('width', level);
        }
        else {
          $sl.animate({width: level}, 2000, 'easeInOutCubic');
        }
      });
    };

    methods.showGithubRepos = function (repos) {
      var repoList = document.getElementById('github-projects');
      repoList.innerHTML = '';

      $.each(repos, function (i, repo) {
        var li = document.createElement('li')
          , title = document.createElement('h3')
          , link = document.createElement('a')
          , desc = document.createElement('p')
          , stats = document.createElement('p')
          , url = document.createElement('p');

        link.href = repo.html_url;
        link.innerHTML = repo.name;
        title.appendChild(link);
        li.appendChild(title);
        url.innerHTML = repo.html_url;
        url.className = 'project-url';
        li.appendChild(url);
        desc.innerHTML = repo.description;
        li.appendChild(desc);
        stats.innerHTML = repo.watchers + ' watchers - ' + repo.forks +
          ' fork' + (repo.forks > 1 ? 's': '');
        stats.className = 'project-stats';
        li.appendChild(stats);
        li.className = 'github-project';
        repoList.appendChild(li);
      });
    };

    // Grab the repos with the highest amount of stars
    var mostWatchedRepos = function (repos) {
      var mostWatched = []
        , watchers
        , index;

      while (mostWatched.length !== 5) {
        watchers = index = 0;
        $.each(repos, function (i, repo) {
          if (repo.watchers > watchers) {
            watchers = repo.watchers;
            index = i;
          }
        });
        mostWatched.push(repos.splice(index, 1)[0]);
      }

      methods.showGithubRepos(mostWatched);
    };

    return methods;
  }());

  $(w.Resume.init);

}(window, jQuery));
