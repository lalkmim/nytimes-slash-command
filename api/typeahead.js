var key = require('../utils/nyt_api_key');
var sync = require('synchronize');
var request = require('request');
var _ = require('underscore');


// The Type Ahead API.
module.exports = function(req, res) {
  var term = req.query.text.trim();
  if (!term) {
    res.json([{
      title: '<i>(enter a search term)</i>',
      text: ''
    }]);
    return;
  }

  var response;
  try {
    response = sync.await(request({
      url: 'https://api.nytimes.com/svc/search/v2/articlesearch.json',
      qs: {
        q: term,
        limit: 15,
        'api-key': key,
        fl: 'web_url,snippet,multimedia,headline,_id'
      },
      gzip: true,
      json: true,
      timeout: 10 * 1000
    }, sync.defer()));
  } catch (e) {
    res.status(500).send('Error');
    return;
  }

  if (response.statusCode !== 200 || !response.body || !response.body.response || response.body.status != 'OK') {
    res.status(500).send('Error');
    return;
  }

  console.log(response.body.response.docs);

  var results = _.chain(response.body.response.docs)
    .reject(function(article) {
      return !article;
    })
    .map(function(article) {
      return {
        title: article.headline.main,
        text: article.web_url
      };
    })
    .value();

  if (results.length === 0) {
    res.json([{
      title: '<i>(no results)</i>',
      text: ''
    }]);
  } else {
    res.json(results);
  }
};
