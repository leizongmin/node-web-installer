/**
 * Installer: Step
 *
 * @author 老雷<leizongmin@gmail.com>
 */


function Step (title) {
  this.title = title || '';
  this.groups = [];
  this._enterGroup();
}

/**
 * 设置分组
 *
 * @param {String} name
 * @param {Function} callback
 */
Step.prototype.group = function (name, callback) {
  this._newGroup(name);
  this._enterGroup(name);
  callback();
  this._enterGroup();
}

/**
 * 输入
 *
 * @param {String} type
 * @param {String} name
 * @param {String} explain
 * @param {Mixed} value
 */
Step.prototype.input = function (type, name, explain, value) {
  type = type.toLowerCase();
  name = name.trim();
  explain = explain.trim();
  this._head.push([type, name, explain, value]);
};

['text', 'number', 'select', 'file', 'email', 'password'].forEach(function (type) {
  Step.prototype[type] = function (name, explain, value) {
    this.input(type, name, explain, value);
  };
});

/**
 * 提交完成
 *
 * @param {Function}
 */
Step.prototype.submit = function (callback) {

};

/**
 * 步骤完成
 */
Step.prototype.done = function () {

};


Step.prototype._enterGroup = function (name) {
  if (name) {
    for (var i = 0; i < this.groups.length; i++) {
      var item = this.groups[i];
      if (item[0] === 'group' && item[1] === name) {
        this._head = item[3];
        return;
      }
    }
  }
  this._head = this.groups;
};

Step.prototype._newGroup = function (name) {
  this.groups.push(['group', name, '', []]);
};

Step.prototype._generateHTML = function () {
  function generateHTML (groups) {
    var html = '';
    groups.forEach(function (item) {
      switch (item[0]) {
        case 'group':
          html += '<fieldset><legend>' + item[1] + '</legend>' + generateHTML(item[3]) + '</fieldset>';
          break;
        case 'text':
        case 'number':
        case 'email':
        case 'password':
        case 'file':
          html += '<div class="pure-control-group">' +
                    '<label for="' + item[1] + '">' + item[2] + '</label>' +
                    '<input type="' + item[0] + '" id="' + item[1] + '" name="' + item[1] + '" value="' + (item[3] || '') + '">' +
                  '</div>';
          break;
        case 'select':
          html += '<div class="pure-control-group">' +
                    '<label for="' + item[1] + '">' + item[2] + '</label>' +
                    '<select id="' + item[1] + '" name="' + item[1] + '">' +
                      item[3].map(function (value) {
                        return '<option value="' + value + '">' + value + '</option>';
                      }).join('') +
                    '</select>' +
                  '</div>';
          break;
      }
    });
    return html;
  }

  return '<form class="pure-form pure-form-aligned">' + generateHTML(this.groups) + '</form>';
};

Step.prototype._processRequest = function () {

};