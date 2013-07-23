/**
 * Installer
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var debug = require('debug')('installer:Installer');
var connect = require('connect');
var ejs = require('ejs');
var Step = require('./step');


function Installer () {
  this._steps = {};
  this._config = {};
  this._info = {};
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
Installer.prototype.config = function (name, value) {
  if (arguments.length < 1) {
    return this._config;
  } else if (arguments.length === 1) {
    if (typeof name === 'string') {
      return this._config[name];
    } else if (name && typeof name === 'object') {
      var data = name;
      for (var i in data) {
        this._config[i] = data[i];
      }
      return this._config;
    }
  } else {
    return this._config[name] = value;
  }
}

/**
 * 欢迎页面
 *
 * @param {Object} info
 */
Installer.prototype.info = function (info) {
  for (var i in info) {
    this._info[i] = info[i];
  }
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
    res.locals = {};
    for (var i in me._info) {
      res.locals[i] = me._info[i];
    }
    res.render = function (filename, data, callback) {
      data = data || {};
      for (var i in data) res.locals[i] = data[i];
      renderFile(filename, res.locals, function (err, body) {
        if (err) return next(err);
        res.locals.body = body;
        renderFile('layout', res.locals, function (err, html) {
          if (err) return next(err);
          res.end(html);
          callback && callback();
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

  // 处理提交的数据
  var post = req.body;
  var isWelcome = ('$welcome' in post);
  var isPrev = ('$prev' in post);
  var isNext = ('$next' in post);
  for (var i in req.files) {
    post[i] = req.files[i].path;
  }
  for (var i in post) {
    if (i.substr(0, 1) === '$') {
      delete post[i];
    }
  }

  if (isWelcome) {
    renderStep(me._getCurrentStep());
  } else if (isNext) {
    // 先处理上一步的 submit 回调
    var current = me._getCurrentStep();
    current.done(post, function (err, err2) {
      if (err) {
        return stepError(err, err2);
      } else {
        var n = me._nextStep();
        if (n) return renderStep(n);

        // 如果n为空，则表示所有步骤完成
        me._done(function (err) {
          if (err) return stepError(err);

          // 显示安装完成信息并结束进程
          res.render('done', {$done: true}, function () {
            setTimeout(function () {
              console.log('done.');
              process.exit();
            }, 3000);
          });
        });
      }
    });
  } else if (isPrev) {
    return renderStep(me._prevStep());
  } else {
    return res.render('welcome');
  }
};

exports = module.exports = Installer;