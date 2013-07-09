var fs = require('fs');
var installer = require('../');

var config = {};

// 使用协议
installer.welcome('NodeClub安装向导', fs.readFileSync(__dirname + '/license.txt', 'utf8'));

// 第一步
installer.step(1, '账户配置', function (step) {
  step.group('MongoDB配置', function () {
    step.text('db_host', '主机');
    step.text('db_port', '端口');
    step.text('db_user', '用户名');
    step.password('db_pwd', '密码');
    step.text('db_name', '数据库名');
  });
  step.group('管理员账户', function () {
    step.text('admin_name', '用户名');
    step.password('admin_pwd', '密码');
  });

  // 用户提交后，执行此回调
  step.submit(function (data) {
    // 把数据保存到config变量中
    for (var i in data) {
      config[i] = data[i];
    }
    // 下一步
    step.done();
  });
});

// 第二步
installer.step(2, '网站设置', function (step) {
  step.group('网站基本设置', function () {
    step.text('site_name', '网站名称');
    step.file('site_logo', '网站Logo');
    step.select('site_lang', '网站语言', ['简体中文', 'English']);
  });

  step.submit(function (data) {
    config.site_name = data.site_name;
    config.site_lang = data.site_lang;
    // 把上传的文件移动到public目录
    data.site_logo.move(__dirname + '/public/logo.png');

    step.done();
  });
});

// 完成
installer.step(3, '完成', function (step) {
  // 保存配置文件
  step.submit(function (data) {
    fs.writeFileSync(__dirname + '/config.js', JSON.stringify(config));
    step.done();
  });
});

// 启动Web界面
installer.listen(80);
