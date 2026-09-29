/*
 * support.js
 * Minimal standalone runtime for Duly's .dc.html design files.
 *
 * The .dc.html files were authored for a design canvas runtime. This shim
 * reimplements just enough of it that each file opens and works in any browser:
 *   - <helmet> contents are moved into <head>
 *   - the <script type="text/x-dc"> logic class is instantiated
 *   - {{hole}} lookups are substituted from renderVals()
 *   - <sc-if value="{{flag}}"> branches are resolved
 *   - onClick="{{handler}}" is bound, and setState re-renders
 *
 * It is a viewer, not a framework. The real app rebuilds these screens in React.
 */
(function () {
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var instance = null;
  var templateHTML = '';
  var mount = null;

  function lookup(vals, path) {
    path = String(path).trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    var cur = vals;
    var parts = path.split('.');
    for (var i = 0; i < parts.length; i++) {
      if (cur === null || cur === undefined) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function substitute(str, vals) {
    return str.replace(HOLE, function (m, p) {
      var v = lookup(vals, p);
      return (v === undefined || v === null) ? '' : String(v);
    });
  }

  function firstHole(raw) {
    var m = String(raw).match(/\{\{\s*([^}]+?)\s*\}\}/);
    return m ? m[1] : null;
  }

  /* Pass A: resolve every sc-if, outermost first, repeating so nested ones resolve too. */
  function resolveConditionals(root, vals) {
    var guard = 0;
    var node = root.querySelector('sc-if');
    while (node && guard++ < 5000) {
      var path = firstHole(node.getAttribute('value') || '');
      var truthy = path ? !!lookup(vals, path) : false;
      if (truthy) {
        var frag = document.createDocumentFragment();
        while (node.firstChild) frag.appendChild(node.firstChild);
        node.parentNode.replaceChild(frag, node);
      } else {
        node.parentNode.removeChild(node);
      }
      node = root.querySelector('sc-if');
    }
  }

  /* Pass B: substitute attributes and text; move onClick into a bindable marker. */
  function applyValues(root, vals, handlers) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    var n = walker.currentNode;
    while (n) { nodes.push(n); n = walker.nextNode(); }

    nodes.forEach(function (node) {
      if (node.nodeType === 3) {
        if (node.nodeValue.indexOf('{{') !== -1) {
          node.nodeValue = substitute(node.nodeValue, vals);
        }
        return;
      }
      if (node.nodeType !== 1) return;

      Array.prototype.slice.call(node.attributes).forEach(function (attr) {
        var name = attr.name;
        var value = attr.value;

        if (name.indexOf('hint-') === 0) { node.removeAttribute(name); return; }

        if (name === 'onclick') {
          var path = firstHole(value);
          if (path) {
            var fn = lookup(vals, path);
            if (typeof fn === 'function') {
              var id = 'h' + handlers.length;
              handlers.push(fn);
              node.setAttribute('data-dc-click', id);
            }
            node.removeAttribute('onclick');
          }
          return;
        }

        if (value.indexOf('{{') !== -1) {
          node.setAttribute(name, substitute(value, vals));
        }
      });
    });
  }

  function render() {
    if (!instance || !mount) return;
    var vals = {};
    try { vals = instance.renderVals() || {}; }
    catch (e) { console.error('renderVals failed', e); }

    var holder = document.createElement('div');
    holder.innerHTML = templateHTML;

    var handlers = [];
    resolveConditionals(holder, vals);
    applyValues(holder, vals, handlers);

    mount.innerHTML = '';
    while (holder.firstChild) mount.appendChild(holder.firstChild);

    Array.prototype.slice.call(mount.querySelectorAll('[data-dc-click]')).forEach(function (el) {
      var idx = parseInt(el.getAttribute('data-dc-click').slice(1), 10);
      var fn = handlers[idx];
      if (typeof fn !== 'function') return;
      el.style.cursor = el.style.cursor || 'pointer';
      el.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        fn();
      });
      el.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); fn(); }
      });
    });
  }

  function DCLogic(props) {
    this.props = props || {};
    this.state = undefined;
  }
  DCLogic.prototype.setState = function (patch) {
    var next = {};
    var key;
    if (this.state) { for (key in this.state) { if (Object.prototype.hasOwnProperty.call(this.state, key)) next[key] = this.state[key]; } }
    if (patch) { for (key in patch) { if (Object.prototype.hasOwnProperty.call(patch, key)) next[key] = patch[key]; } }
    this.state = next;
    render();
  };
  DCLogic.prototype.forceUpdate = function () { render(); };

  function boot() {
    var xdc = document.querySelector('x-dc');
    if (!xdc) { console.warn('support.js: no <x-dc> root found'); return; }

    /* Move <helmet> styles and font links into the document head. */
    var helmet = xdc.querySelector('helmet');
    if (helmet) {
      Array.prototype.slice.call(helmet.children).forEach(function (child) {
        document.head.appendChild(child.cloneNode(true));
      });
      helmet.parentNode.removeChild(helmet);
    }

    templateHTML = xdc.innerHTML;

    var script = document.querySelector('script[data-dc-script]');
    var props = {};
    if (script) {
      var raw = script.getAttribute('data-props');
      if (raw) {
        try {
          var declared = JSON.parse(raw);
          Object.keys(declared).forEach(function (k) {
            if (k.charAt(0) === '$') return;
            if (declared[k] && Object.prototype.hasOwnProperty.call(declared[k], 'default')) {
              props[k] = declared[k]['default'];
            }
          });
        } catch (e) { console.warn('support.js: data-props parse failed', e); }
      }
      try {
        var Component = new Function('DCLogic', script.textContent + '\nreturn Component;')(DCLogic);
        instance = new Component(props);
        if (typeof instance.componentDidMount === 'function') { instance.componentDidMount(); }
      } catch (e) {
        console.error('support.js: component eval failed', e);
      }
    }

    mount = document.createElement('div');
    mount.id = 'dc-root';
    xdc.parentNode.replaceChild(mount, xdc);
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
