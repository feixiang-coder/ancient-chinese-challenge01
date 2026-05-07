/* eslint-disable no-undef */
/**
 * 目录页逻辑：从 Excel 加载古文目录并渲染卡片，点击进入 detail.html
 */
(function () {
    'use strict';

    var $grid = document.getElementById('catalogGrid');
    var $empty = document.getElementById('catalogEmpty');
    var $status = document.getElementById('loadStatus');

    function escapeHtml(text) {
        return String(text == null ? '' : text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function buildCard(article, levelCount) {
        var card = document.createElement('a');
        card.className = 'catalog-card';
        card.href = 'detail.html?id=' + encodeURIComponent(article.id);

        var coverHtml = '';
        if (article.cover) {
            coverHtml =
                '<div class="card-cover" style="background-image:url(\'' + escapeHtml(article.cover) + '\')">' +
                    '<span>' + escapeHtml(article.name.charAt(0) || '古') + '</span>' +
                '</div>';
        } else {
            coverHtml =
                '<div class="card-cover">' +
                    '<span>' + escapeHtml(article.name.slice(0, 2) || '古文') + '</span>' +
                '</div>';
        }

        card.innerHTML =
            coverHtml +
            '<div class="card-body">' +
                '<h3 class="card-title">' + escapeHtml(article.name) + '</h3>' +
                '<div class="card-meta">' +
                    '<div><strong>核心课文：</strong>' + escapeHtml(article.text || '—') + '</div>' +
                    '<div><strong>适配对象：</strong>' + escapeHtml(article.audience || '—') + '</div>' +
                    '<div><strong>时空定位：</strong>' + escapeHtml(article.time || '—') + '</div>' +
                '</div>' +
                '<div class="card-foot">' +
                    '<span>' + (levelCount > 0 ? ('共 ' + levelCount + ' 关') : '暂无关卡') + '</span>' +
                    '<span class="card-go">进入闯关 ›</span>' +
                '</div>' +
            '</div>';

        return card;
    }

    function render(articles, questionsByArticleId) {
        $grid.innerHTML = '';
        if (!articles.length) {
            $empty.classList.remove('hidden');
            $status.textContent = '未读取到任何古文条目';
            return;
        }
        articles.forEach(function (article) {
            var qList = questionsByArticleId.get(article.id) || [];
            $grid.appendChild(buildCard(article, qList.length));
        });
        $status.textContent = '共加载 ' + articles.length + ' 篇古文';
    }

    function showError(err) {
        $empty.classList.remove('hidden');
        $status.textContent = '加载失败';
        $empty.querySelector('h3').textContent = '加载古文目录失败';
        var p = document.createElement('p');
        p.style.marginTop = '8px';
        p.style.color = '#a05a30';
        p.textContent = '错误信息：' + (err && err.message ? err.message : err);
        $empty.appendChild(p);

        var hint = document.createElement('p');
        hint.style.marginTop = '6px';
        hint.style.fontSize = '13px';
        hint.style.color = '#7a5a36';
        hint.innerHTML =
            '提示：本地直接双击 <code>index.html</code> 时浏览器禁止读取本地 Excel，' +
            '请使用本地静态服务运行（如 <code>npx http-server -p 8080</code> 或 VSCode Live Server），' +
            '或部署到 Gitee Pages 后访问。';
        $empty.appendChild(hint);
    }

    ExcelLoader.load()
        .then(function (data) {
            render(data.articles, data.questionsByArticleId);
        })
        .catch(showError);
})();
