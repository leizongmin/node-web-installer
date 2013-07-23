var fs = require('fs');
var path = require('path');
var ejs = require('ejs');
var installer = require('installer');
var mongoose = require('mongoose');


// 欢迎
installer.info({
  title:       'NodeClub安装向导',
  description: fs.readFileSync(__dirname + '/license.txt', 'utf8'),
  done:        fs.readFileSync(__dirname + '/done.txt', 'utf8')
});

installer.step(1, '数据库连接配置', function (step) {
  step.text('db', 'MongoDB连接字符串', 'mongodb://127.0.0.1/node_club_dev');
}, function (data, next) {
  // 检查能否正确连接到服务器
  mongoose.connection.close();
  mongoose.connect(data.db, function (err) {
    if (err) {
      next('db', err.toString());
    } else {
      installer.config('db', data.db);
      next();
    }
  });
});

installer.step(2, '设置管理员帐号', function (step) {
  step.text('admin_name', '用户名', 'admin');
  step.password('admin_pwd', '密码');
}, function (data, next) {
  // 添加到MongoDB中
  next();
});

installer.step(3, '网站设置', function (step) {
  step.group('基本设置', function () {
    step.text('name', '名称', 'Node Club');
    step.text('description', '简介', 'Node Club 是用Node.js开发的社区软件');
    step.text('host', '域名', 'localhost.cnodejs.org');
    step.file('site_logo', 'Logo');
  });
  step.group('SMTP发送邮件配置', function () {
    step.text('smtp_host', '主机', 'smtp.126.com');
    step.number('smtp_port', '端口', 25);
    step.text('smtp_user', '账户', 'club@126.com');
    step.password('smtp_pwd', '密码');
  });
}, function (data, next) {
  installer.config(data);

  // 把Logo移到系统目录
  var site_logo = path.resolve(__dirname, '../public/logo.png');
  fileMoveTo(data.site_logo, site_logo);
  data.site_logo = site_logo;

  next();
});

// 完成
installer.done(function (next) {
  // 保存配置文件
  var config = installer.config();
  ejs.renderFile(path.resolve(__dirname, 'config.default.js'), config, function (err, content) {
    if (err) return next(err);

    fs.writeFileSync(path.resolve(__dirname, 'config.js'), content);
    next();
  });
});

// 启动Web界面
installer.listen(80);

// =============================================================================
/**
 * 移动文件
 *
 * @param {String} s
 * @param {String} t
 */
function fileMoveTo (s, t) {
  fs.writeFileSync(t, fs.readFileSync(s));
  fs.unlinkSync(s);
}
