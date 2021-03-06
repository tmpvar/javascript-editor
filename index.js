var events = require('events')
var inherits = require('inherits')
var extend = require('extend')
var esprima = require('esprima')
var CodeMirror = require('codemirror')
// load JS support for CodeMirror:
require('./javascript')(CodeMirror)

module.exports = function(opts) {
  return new Editor(opts)
}

function Editor(opts) {
  var self = this
  if (!opts) opts = {}
  if (!opts.container) opts.container = document.body
  var left = opts.container.querySelector('.left')
  var right = opts.container.querySelector('.right')
  if (left) opts.container = left
  var defaults = {
    value: "// hello world\n",
    mode: "javascript",
    lineNumbers: true,
    autofocus: (window === window.top),
    matchBrackets: true,
    indentWithTabs: false,
    smartIndent: true,
    tabSize: 2,
    indentUnit: 2,
    updateInterval: 500,
    dragAndDrop: true
  }
  this.opts = extend({}, defaults, opts)
  this.editor = CodeMirror( this.opts.container, this.opts )
  this.editor.setOption("theme", "mistakes") // borrowed from mistakes.io
  this.editor.setCursor(this.editor.lineCount(), 0)
  this.editor.on('change', function (e) {
    self.emit('change')
    if (self.interval) clearTimeout( self.interval )
    self.interval = setTimeout( self.update.bind(self), self.opts.updateInterval )
  })
  this.element = this.editor.getWrapperElement()
  this.errorLines = []
  if (right) {
    this.results = CodeMirror(right, {
      mode: 'javascript',
      tabSize: 2,
      readOnly: 'nocursor'
    })
    this.results.setOption("theme", 'mistakes')
  }
  this.update()
  if (this.opts.dragAndDrop) this.addDropHandler()
}

inherits(Editor, events.EventEmitter)

Editor.prototype.update = function() {
  var errors = this.validate(this.editor.getValue());
  this.emit('update', (errors.length) ? errors : null, this.ast);
  return !!errors.length;
}

Editor.prototype.validate = function(value) {
  var self = this

  var errors = [];

  try {
    this.ast = esprima.parse( value, { tolerant: true, loc: true } );
    var result = this.ast.errors

    for ( var i = 0; i < result.length; i ++ ) {
      var error = result[ i ]
      error.lineNumber--;
      errors.push(error);
    }

  } catch ( error ) {
    error.lineNumber--;
    errors.push(error);
  }

  return errors;
}

Editor.prototype.addDropHandler = function () {
  var self = this
  this.element.addEventListener( 'drop', function ( event ) {

    event.preventDefault()
    event.stopPropagation()

    var file = event.dataTransfer.files[ 0 ]

    var reader = new FileReader()

    reader.onload = function ( event ) {
      self.editor.setValue( event.target.result )
    }

    reader.readAsText( file )

  }, false )

}

Editor.prototype.getValue = function() {
  return this.editor.getValue()
}

Editor.prototype.setValue = function(value) {
  return this.editor.setValue(value)
}
