(function() {
  function displaySearchResults(results, store) {
    var searchResults = document.getElementById('search-results');

    if (results.length) {
      var appendString = '';

      for (var i = 0; i < results.length; i++) {
        var item = store[results[i].ref];
        appendString += '<div class="list__item"><article class="archive__item"><h2 class="archive__item-title" itemprop="headline"><a href="' + item.url + '" rel="permalink">' + item.title + '</a></h2>';
        appendString += '<p class="page__meta"><i class="fa fa-calendar" aria-hidden="true"></i> &nbsp;' + item.date + '</p>';
        
        appendString += '<p class="archive__item-excerpt" itemprop="description">' + item.content.substring(0, 217) + '...</p></article></div>';
      }

      searchResults.innerHTML = appendString;
    } else {
      searchResults.innerHTML = '<div class="list__item"><article class="archive__item"><h3 class="archive__item-title">No results found</h3></article></div>';
    }
  }

  function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split('&');

    for (var i = 0; i < vars.length; i++) {
      var pair = vars[i].split('=');

      if (pair[0] === variable) {
        return decodeURIComponent(pair[1].replace(/\+/g, '%20'));
      }
    }
  }

  var searchTerm = getQueryVariable('query');

  if (searchTerm) {
    document.getElementById('search-box').setAttribute("value", searchTerm);

    // Initalize lunr with the fields it will be searching on
    var idx = lunr(function () {
      this.field('id');
      this.field('title', { boost: 10 });
      this.field('content');
    });

    for (var key in window.store) { // Add the data to lunr
      idx.add({
        'id': key,
        'title': window.store[key].title,
        'content': window.store[key].content
      });

      var results = idx.search(searchTerm); // Get lunr to perform a search
      displaySearchResults(results, window.store); // We'll write this in the next section
    }
  }
})();