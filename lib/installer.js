/**
 * Installer
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var debug = require('debug')('installer:Installer');
var connect = require('connect');
var urlrouter = require('urlrouter');
var ejs = require('ejs');
var Step = require('./step');


function Installer () {
  this._steps = {};
  debug('new Installer');
}

/**
 * 创建步骤
 *
 * @param {Number} num
 * @param {String} title
 * @param {Function} callback
 */
Installer.prototype.step = function (num, title, callback) {
  var step = new Step(this, title);
  callback(step);
  this._steps[num] = step;
};

/**
 * 下一步
 */
Installer.prototype.next = function () {

};

/**
 * 跳转到某一步
 *
 * @param {Number} num
 */
Installer.prototype.goto = function (num) {

};

/**
 * 欢迎页面
 *
 * @param {String} title
 * @param {String} description
 */
Installer.prototype.welcome = function (title, description) {
  this._welcome = {
    title:       title,
    description: description
  };
};

/**
 * 启动Web界面
 *
 * @param {Number} port
 * @param {String} host
 * @return {Object}
 */
Installer.prototype.listen = function (port, host) {
  var me = this;
  this._sortStep();

  var server = this._server = connect();
  server.use(connect.favicon());
  server.use(connect.query());
  server.use(connect.multipart());

  function renderFile (filename, data, callback) {
    debug('render %s', filename);
    ejs.renderFile(__dirname + '/template/' + filename + '.html', data, callback);
  }

  server.use(function (req, res, next) {
    res.render = function (filename, data) {
      renderFile(filename, data, function (err, body) {
        if (err) return next(err);
        data.body = body;
        renderFile('layout', data, function (err, html) {
          if (err) return next(err);
          res.end(html);
        });
      });
    };
    next();
  });

  server.use(urlrouter(function (app) {
    app.all('/', function (req, res, next) {
      res.render('welcome', {
        title:       me._welcome.title,
        description: me._welcome.description
      });
    });
  }));

  server.use('/public', connect.static(__dirname + '/static'));

  server.listen(port, host);

  debug('listen on %s:%s', host || '0.0.0.0', port);
};

Installer.prototype._sortStep = function () {
  var nums = Object.keys(this._steps).map(function (num) {
    return parseInt(num, 10);
  }).filter(function (num) {
    return num > 0;
  }).sort();
  this._stepList = nums;
};

Installer.prototype._getCurrentStep = function () {
  var num = this._stepList[this._stepIndex];
  return this._steps[num];
};

Installer.prototype._nextStep = function () {
  if (isNaN(this._stepIndex)) {
    this._stepIndex = 0;
  } else {
    this._stepIndex++;
  }
  return this._getCurrentStep();
};

Installer.prototype._gotoStep = function (num) {

};



exports = module.exports = Installer;