(function (global) {
    'use strict';

    var presets = {
        basic: ['undo', 'redo', '|', 'bold', 'italic', 'link', 'clear'],
        standard: ['undo', 'redo', '|', 'format', '|', 'bold', 'italic', 'underline', 'strike', '|', 'ul', 'ol', 'quote', 'link', '|', 'source', 'fullscreen'],
        full: ['undo', 'redo', '|', 'format', '|', 'bold', 'italic', 'underline', 'strike', '|', 'ul', 'ol', 'quote', 'code', '|', 'left', 'center', 'right', '|', 'link', 'image', 'table', 'clear', '|', 'source', 'fullscreen']
    };

    var labels = {
        undo: 'Undo', redo: 'Redo', bold: 'Bold', italic: 'Italic', underline: 'Underline',
        strike: 'Strike', ul: 'Bulleted list', ol: 'Numbered list', quote: 'Quote', code: 'Code block',
        left: 'Align left', center: 'Align center', right: 'Align right', link: 'Link', image: 'Image',
        table: 'Table', clear: 'Clear formatting', source: 'HTML source', fullscreen: 'Fullscreen'
    };

    var glyphs = {
        undo: '↶', redo: '↷', bold: 'B', italic: 'I', underline: 'U', strike: 'S',
        ul: '• List', ol: '1. List', quote: '❝', code: '</>', left: '≡', center: '≣', right: '≡',
        link: 'Link', image: 'Image', table: 'Table', clear: 'Clear', source: 'HTML', fullscreen: '⛶'
    };

    var allowedTags = new Set(['A', 'B', 'BLOCKQUOTE', 'BR', 'CODE', 'DEL', 'DIV', 'EM', 'FIGCAPTION',
        'FIGURE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR', 'I', 'IMG', 'LI', 'OL', 'P', 'PRE',
        'S', 'SPAN', 'STRONG', 'TABLE', 'TBODY', 'TD', 'TFOOT', 'TH', 'THEAD', 'TR', 'U', 'UL']);
    var globalAttributes = new Set(['class', 'dir', 'lang', 'title']);
    var tagAttributes = {
        A: new Set(['href', 'target', 'rel']), IMG: new Set(['src', 'alt', 'width', 'height']),
        TD: new Set(['colspan', 'rowspan']), TH: new Set(['colspan', 'rowspan'])
    };

    function safeUrl(value, image) {
        var input = String(value || '').trim();
        if (!input) return '';
        if (/^(https?:|mailto:|tel:|\/|#)/i.test(input)) return input;
        if (image && /^data:image\/(png|gif|jpe?g|webp);base64,/i.test(input)) return input;
        return '';
    }

    function sanitize(html) {
        var template = document.createElement('template');
        template.innerHTML = String(html || '');
        Array.from(template.content.querySelectorAll('*')).forEach(function (node) {
            if (!allowedTags.has(node.tagName)) {
                node.replaceWith.apply(node, Array.from(node.childNodes));
                return;
            }
            Array.from(node.attributes).forEach(function (attribute) {
                var name = attribute.name.toLowerCase();
                var permitted = globalAttributes.has(name) || (tagAttributes[node.tagName] && tagAttributes[node.tagName].has(name));
                if (!permitted || name.indexOf('on') === 0 || name === 'style') node.removeAttribute(attribute.name);
            });
            if (node.hasAttribute('href')) {
                var href = safeUrl(node.getAttribute('href'), false);
                if (href) node.setAttribute('href', href); else node.removeAttribute('href');
                if (node.getAttribute('target') === '_blank') node.setAttribute('rel', 'noopener noreferrer');
            }
            if (node.hasAttribute('src')) {
                var src = safeUrl(node.getAttribute('src'), true);
                if (src) node.setAttribute('src', src); else node.removeAttribute('src');
            }
        });
        return template.innerHTML;
    }

    function closestBlock(node, root) {
        var element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        while (element && element !== root) {
            if (/^(P|DIV|H[1-6]|BLOCKQUOTE|PRE|LI)$/.test(element.tagName)) return element;
            element = element.parentElement;
        }
        return null;
    }

    function editorRange(surface) {
        var selection = global.getSelection();
        if (!selection || !selection.rangeCount) return null;
        var range = selection.getRangeAt(0);
        if (!surface.contains(range.commonAncestorContainer)) return null;
        return range;
    }

    function selectAfter(node) {
        var range = document.createRange();
        range.selectNodeContents(node);
        range.collapse(false);
        var selection = global.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function wrapSelection(surface, tag) {
        var range = editorRange(surface);
        if (!range || range.collapsed) return;
        var fragment = range.extractContents();
        var walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);
        var textNodes = []; var current;
        while ((current = walker.nextNode())) if (current.nodeValue.trim()) textNodes.push(current);
        textNodes.forEach(function (textNode) {
            var wrapper = document.createElement(tag);
            textNode.replaceWith(wrapper);
            wrapper.appendChild(textNode);
        });
        var finalNode = fragment.lastChild;
        range.insertNode(fragment);
        if (finalNode) selectAfter(finalNode);
    }

    function formatBlock(surface, tag) {
        var range = editorRange(surface);
        if (!range) return;
        var block = closestBlock(range.startContainer, surface);
        var replacement = document.createElement(tag);
        if (block) {
            while (block.firstChild) replacement.appendChild(block.firstChild);
            block.replaceWith(replacement);
        } else {
            replacement.appendChild(range.extractContents());
            if (!replacement.hasChildNodes()) replacement.appendChild(document.createElement('br'));
            range.insertNode(replacement);
        }
        selectAfter(replacement);
    }

    function insertNode(surface, node) {
        var range = editorRange(surface);
        var finalNode = node.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? node.lastChild : node;
        if (!range) {
            surface.appendChild(node);
        } else {
            range.deleteContents();
            range.insertNode(node);
        }
        if (finalNode) selectAfter(finalNode);
    }

    function Editor(source, options) {
        this.source = source;
        this.root = source.closest('.stl-rte');
        this.toolbar = this.root.querySelector('.stl-rte-toolbar');
        this.surface = this.root.querySelector('.stl-rte-surface');
        this.status = this.root.querySelector('.stl-rte-status');
        this.options = options || {};
        this.history = [];
        this.historyIndex = -1;
        this.sourceMode = false;
        this.surface.setAttribute('data-placeholder', this.options.placeholder || 'Start writing…');
        this.surface.innerHTML = sanitize(this.source.value);
        this.buildToolbar();
        this.bind();
        this.record(true);
        this.updateStatus();
    }

    Editor.prototype.tools = function () {
        if (Array.isArray(this.options.toolbar)) return this.options.toolbar;
        return presets[this.options.preset] || presets.standard;
    };

    Editor.prototype.buildToolbar = function () {
        var self = this;
        this.tools().forEach(function (tool) {
            if (tool === '|') {
                var separator = document.createElement('span');
                separator.className = 'stl-rte-separator';
                separator.setAttribute('aria-hidden', 'true');
                self.toolbar.appendChild(separator);
                return;
            }
            if (tool === 'format') {
                var select = document.createElement('select');
                select.setAttribute('aria-label', 'Text format');
                [['p', 'Paragraph'], ['h2', 'Heading 2'], ['h3', 'Heading 3'], ['h4', 'Heading 4'], ['pre', 'Preformatted']].forEach(function (item) {
                    var option = document.createElement('option'); option.value = item[0]; option.textContent = item[1]; select.appendChild(option);
                });
                select.addEventListener('change', function () { self.act('format', select.value); select.value = 'p'; });
                self.toolbar.appendChild(select);
                return;
            }
            if (!labels[tool]) return;
            var button = document.createElement('button');
            button.type = 'button'; button.dataset.tool = tool; button.title = labels[tool];
            button.setAttribute('aria-label', labels[tool]); button.textContent = glyphs[tool];
            if (['source', 'fullscreen'].indexOf(tool) !== -1) button.setAttribute('aria-pressed', 'false');
            button.addEventListener('mousedown', function (event) { event.preventDefault(); });
            button.addEventListener('click', function () { self.act(tool); });
            self.toolbar.appendChild(button);
        });
    };

    Editor.prototype.bind = function () {
        var self = this;
        var timer;
        this.surface.addEventListener('input', function () {
            self.sync(); self.updateStatus(); clearTimeout(timer); timer = setTimeout(function () { self.record(false); }, 250);
        });
        this.surface.addEventListener('paste', function (event) {
            event.preventDefault();
            var html = event.clipboardData.getData('text/html');
            var text = event.clipboardData.getData('text/plain');
            var template = document.createElement('template');
            template.innerHTML = html ? sanitize(html) : String(text).replace(/[&<>]/g, function (character) { return {'&':'&amp;','<':'&lt;','>':'&gt;'}[character]; }).replace(/\n/g, '<br>');
            insertNode(self.surface, template.content);
            self.changed();
        });
        this.source.addEventListener('input', function () { self.updateStatus(); });
        var form = this.source.form;
        if (form) form.addEventListener('submit', function () { self.sync(); });
    };

    Editor.prototype.sync = function () {
        if (!this.sourceMode) this.source.value = sanitize(this.surface.innerHTML);
        this.source.dispatchEvent(new Event('change', {bubbles: true}));
    };

    Editor.prototype.changed = function () {
        Array.from(this.surface.querySelectorAll('h1,h2,h3,h4,h5,h6,p,blockquote,pre')).forEach(function (block) {
            if (!block.textContent.trim() && !block.querySelector('img,br')) block.remove();
        });
        this.sync(); this.record(false); this.updateStatus(); this.surface.focus();
    };

    Editor.prototype.record = function (force) {
        var html = sanitize(this.surface.innerHTML);
        if (!force && this.history[this.historyIndex] === html) return;
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(html);
        if (this.history.length > 100) this.history.shift();
        this.historyIndex = this.history.length - 1;
    };

    Editor.prototype.restore = function (offset) {
        var next = this.historyIndex + offset;
        if (next < 0 || next >= this.history.length) return;
        this.historyIndex = next; this.surface.innerHTML = this.history[next]; this.sync(); this.updateStatus();
    };

    Editor.prototype.updateStatus = function () {
        var text = (this.sourceMode ? this.source.value.replace(/<[^>]*>/g, ' ') : this.surface.textContent).trim();
        var words = text ? text.split(/\s+/).length : 0;
        this.status.textContent = words + (words === 1 ? ' word' : ' words');
    };

    Editor.prototype.list = function (tag) {
        var range = editorRange(this.surface); if (!range) return;
        var block = closestBlock(range.startContainer, this.surface);
        var list = document.createElement(tag); var item = document.createElement('li');
        if (block) { while (block.firstChild) item.appendChild(block.firstChild); block.replaceWith(list); }
        else { item.appendChild(range.extractContents()); range.insertNode(list); }
        if (!item.hasChildNodes()) item.appendChild(document.createElement('br'));
        list.appendChild(item); selectAfter(item);
    };

    Editor.prototype.link = function () {
        var url = global.prompt('Link URL'); if (!url) return;
        url = safeUrl(url, false); if (!url) { global.alert('Use an http, https, mailto, tel, relative, or fragment URL.'); return; }
        var range = editorRange(this.surface); if (!range) return;
        var anchor = document.createElement('a'); anchor.href = url;
        if (range.collapsed) anchor.textContent = url; else anchor.appendChild(range.extractContents());
        range.insertNode(anchor); selectAfter(anchor);
    };

    Editor.prototype.image = function () {
        var self = this;
        if (this.options.uploadUrl) {
            var input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
            input.addEventListener('change', function () {
                if (!input.files[0]) return;
                var data = new FormData(); data.append(self.options.uploadField || 'file', input.files[0]);
                Object.keys(self.options.uploadData || {}).forEach(function (key) { data.append(key, self.options.uploadData[key]); });
                fetch(self.options.uploadUrl, {method: 'POST', body: data, credentials: 'same-origin', headers: self.options.uploadHeaders || {}})
                    .then(function (response) { if (!response.ok) throw new Error('Upload failed'); return response.json(); })
                    .then(function (result) { if (!result.url) throw new Error('Upload response requires a url'); self.insertImage(result.url); })
                    .catch(function (error) { self.status.textContent = error.message; });
            });
            input.click(); return;
        }
        var url = global.prompt('Image URL'); if (url) this.insertImage(url);
    };

    Editor.prototype.insertImage = function (url) {
        url = safeUrl(url, true); if (!url) return;
        var image = document.createElement('img'); image.src = url; image.alt = global.prompt('Alternative text', '') || '';
        insertNode(this.surface, image); this.changed();
    };

    Editor.prototype.table = function () {
        var rows = Math.min(20, Math.max(1, parseInt(global.prompt('Rows', '2'), 10) || 2));
        var columns = Math.min(10, Math.max(1, parseInt(global.prompt('Columns', '2'), 10) || 2));
        var table = document.createElement('table'); var body = table.createTBody();
        for (var row = 0; row < rows; row += 1) { var tr = body.insertRow(); for (var column = 0; column < columns; column += 1) { var cell = tr.insertCell(); cell.appendChild(document.createElement('br')); } }
        insertNode(this.surface, table);
    };

    Editor.prototype.toggleSource = function () {
        this.sourceMode = !this.sourceMode;
        if (this.sourceMode) this.sync(); else { this.surface.innerHTML = sanitize(this.source.value); this.record(false); }
        this.root.classList.toggle('is-source', this.sourceMode);
        var button = this.toolbar.querySelector('[data-tool="source"]'); if (button) button.setAttribute('aria-pressed', String(this.sourceMode));
        (this.sourceMode ? this.source : this.surface).focus(); this.updateStatus();
    };

    Editor.prototype.act = function (tool, value) {
        if (tool === 'undo') return this.restore(-1);
        if (tool === 'redo') return this.restore(1);
        if (tool === 'source') return this.toggleSource();
        if (tool === 'fullscreen') { this.root.classList.toggle('is-fullscreen'); var full = this.root.classList.contains('is-fullscreen'); this.toolbar.querySelector('[data-tool="fullscreen"]').setAttribute('aria-pressed', String(full)); return; }
        if (this.sourceMode) return;
        if (tool === 'format') formatBlock(this.surface, value);
        if ({bold:'strong', italic:'em', underline:'u', strike:'s'}[tool]) wrapSelection(this.surface, {bold:'strong', italic:'em', underline:'u', strike:'s'}[tool]);
        if (tool === 'ul' || tool === 'ol') this.list(tool);
        if (tool === 'quote') formatBlock(this.surface, 'blockquote');
        if (tool === 'code') formatBlock(this.surface, 'pre');
        if (['left', 'center', 'right'].indexOf(tool) !== -1) {
            var range = editorRange(this.surface); var block = range && closestBlock(range.startContainer, this.surface);
            if (block) { block.classList.remove('stl-rte-align-left', 'stl-rte-align-center', 'stl-rte-align-right'); block.classList.add('stl-rte-align-' + tool); }
        }
        if (tool === 'link') this.link();
        if (tool === 'image') return this.image();
        if (tool === 'table') this.table();
        if (tool === 'clear') { var range = editorRange(this.surface); if (range && !range.collapsed) { var text = document.createTextNode(range.toString()); range.deleteContents(); range.insertNode(text); selectAfter(text); } }
        this.changed();
    };

    global.StlRichTextEditor = {
        create: function (id, options) {
            var source = document.getElementById(id);
            if (!source) throw new Error('Rich text editor source not found: ' + id);
            if (source.stlRichTextEditor) return source.stlRichTextEditor;
            source.stlRichTextEditor = new Editor(source, options || {});
            return source.stlRichTextEditor;
        },
        sanitize: sanitize
    };
}(window));
