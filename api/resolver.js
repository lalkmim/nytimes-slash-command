var key = require('../utils/nyt_api_key');
var sync = require('synchronize');
var request = require('request');
var fs = require('fs');
var path = require('path');


// The API that returns the in-email representation.
module.exports = function(req, res) {
  var term = req.query.text;
  if(term) term = term.trim();
  
  if (/^nytimes\.com\/\S+/.test(term)) {
    // Special-case: handle strings in the special URL form that are suggested by the /typeahead
    // API. This is how the command hint menu suggests an exact Giphy image.
    handleIdString(term, req, res);
  } else {
    // Else, if the user was typing fast and press enter before the /typeahead API can respond,
    // Mixmax will just send the text to the /resolver API (for performance). Handle that here.
    handleSearchString(term, req, res);
  }
};

function handleIdString(url, req, res) {
  var response;
  try {
    response = sync.await(request({
      url: 'https://api.nytimes.com/svc/search/v2/articlesearch.json',
      qs: {
        'api-key': key,
        fq: 'web_url:("' + url + '")',
        fl: 'web_url,_id,headline,multimedia,snippet'
      },
      gzip: true,
      json: true,
      timeout: 15 * 1000
    }, sync.defer()));
  } catch (e) {
    res.status(500).send('Error');
    return;
  }

  var article = response.body.response.docs[0];
  handleArticle(article, req, res);
}

function handleSearchString(term, req, res) {
  var response;
  try {
    response = sync.await(request({
      url: 'https://api.nytimes.com/svc/search/v2/articlesearch.json',
      qs: {
        'api-key': key,
        q: term,
        fl: 'web_url,_id,headline,multimedia,snippet'
      },
      gzip: true,
      json: true,
      timeout: 15 * 1000
    }, sync.defer()));
  } catch (e) {
    res.status(500).send('Error');
    return;
  }

  var article = response.body.response.docs[0];
  handleArticle(article, req, res);
}

function handleArticle(article, req, res) {
  var template = '../res/template_no_img.html';
  var hasImage = article.multimedia.length > 0;
  
  if(hasImage) template = '../res/template.html';
  
  var html = fs.readFileSync(path.join(__dirname, template)).toString();
  
  html = html.replace(/##LINK##/ig, article.web_url);
  html = html.replace(/##SAFE_LINK##/ig, '');
  html = html.replace(/##HEADLINE##/ig, article.headline.main);
  html = html.replace(/##SNIPPET##/ig, article.snippet);
  
  if(hasImage)  html = html.replace(/##IMG_SRC##/ig, article.multimedia[0].url);
  
  res.json({
    body: html
  });
}