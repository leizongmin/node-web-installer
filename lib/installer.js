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
 * @param {Function} init
 * @param {Function} done
 */
Installer.prototype.step = function (num, title, init, done) {
  this._steps[num] = {num: num, title: title, init: init, done: done};
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
 * 设置配置项
 *
 * @param {String} name
 * @param {Mixed} value
 * @return {Mixed}
 */
Installer.prototype.config = function () {

}

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
 * 完成
 *
 * @param {Function} callback
 */
Installer.prototype.done = function (callback) {
  this._done = callback;
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

  // 模板渲染
  server.use(function (req, res, next) {
    res.locals = {
      title:       me._welcome.title,
      description: me._welcome.description
    };
    res.render = function (filename, data) {
      data = data || {};
      for (var i in data) res.locals[i] = data[i];
      renderFile(filename, res.locals, function (err, body) {
        if (err) return next(err);
        res.locals.body = body;
        renderFile('layout', res.locals, function (err, html) {
          if (err) return next(err);
          res.end(html);
        });
      });
    };
    next();
  });

  // 注册路由
  server.use('/install', me._httpHandler.bind(me));

  // 资源文件
  server.use('/public', connect.static(__dirname + '/static'));

  // 未找到的页面全部重定向到首页
  server.use(function (req, res, next) {
    res.writeHeader(302, {location: '/install'});
    res.end();
  });

  server.listen(port, host);

  debug('listen on %s:%s', host || '0.0.0.0', port);
  console.log('Open http://%s:%s to install', host || '127.0.0.1', port);
};

Installer.prototype._sortStep = function () {
  var nums = Object.keys(this._steps).map(function (num) {
    return parseInt(num, 10);
  }).filter(function (num) {
    return num > 0;
  }).sort();
  this._stepList = nums;
};

Installer.prototype._getStepIndex = function () {
  if (!(this._stepIndex > 0)) {
    this._stepIndex = 0;
  }
  return this._stepIndex;
};

Installer.prototype._getCurrentStep = function () {
  var num = this._stepList[this._getStepIndex()];
  return this._steps[num];
};

Installer.prototype._nextStep = function () {
  var stepIndex = this._getStepIndex();
  this._stepIndex = stepIndex + 1;
  return this._getCurrentStep();
};

Installer.prototype._prevStep = function () {
  var stepIndex = this._getStepIndex();
  this._stepIndex = stepIndex - 1;
  return this._getCurrentStep();
};

Installer.prototype._gotoStep = function (num) {
  for (var i = 0; i <= this._stepList.length; i++) {
    if (this._stepList[i] == num) {
      this._stepIndex = i;
      return this._getCurrentStep();
    }
  }
  return null;
};

Installer.prototype._httpHandler = function (req, res, next) {
  var me = this;

  // 渲染下一步表单
  function renderStep (current) {
    current.step = new Step(me, current.title);
    res.locals['$step'] = current.num;
    res.locals.title = '第' + current.num + '步：' + current.title;
    current.init(current.step);
    res.locals.form = current.step._generateHTML();
    res.render('step');
  }

  // 当前步骤出错
  function stepError (err, err2) {
    if (err2) {
      res.locals['$error'] = {
        field: err,
        error: err2.stack || err2
      };
    } else {
      res.locals['$error'] = {
        field: '',
        error: err2.stack || err2
      };
    }
    renderStep(me._getCurrentStep());
  }

  var post = req.body;
  if ('$welcome' in post) {
    renderStep(me._getCurrentStep());
  } else if ('$next' in post) {
    // 先处理上一步的 submit 回调
    var current = me._getCurrentStep();
    current.done(post, function (err, err2) {
      if (err) {
        return stepError(err, err2);
      } else {
        return renderStep(me._nextStep());
      }
    });
  } else if ('$prev' in post) {
    return renderStep(me._prevStep());
  } else {
    return res.render('welcome');
  }
};

exports = module.exports = Installer;