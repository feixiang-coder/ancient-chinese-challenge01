/* eslint-disable no-undef */
/**
 * 详情页逻辑：
 * 1) 展示 1-4 步骤切换（基本信息 → 游戏序 → 视频闯关 → 总结）
 * 2) 视频按 Excel 中的节点秒数暂停弹题，答对继续，答错跳回
 * 3) 支持 single / judge / match / sort 四种题型
 */
(function () {
    'use strict';

    /* ========== 工具函数 ========== */

    function $(selector) { return document.querySelector(selector); }
    function $$(selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); }
    function $byId(id) { return document.getElementById(id); }

    function escapeHtml(text) {
        return String(text == null ? '' : text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getQueryId() {
        var match = window.location.search.match(/[?&]id=([^&]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    }

    function showToast(text, durationMs) {
        var $toast = $byId('toast');
        $toast.textContent = text;
        $toast.classList.remove('hidden');
        clearTimeout(showToast._timer);
        showToast._timer = setTimeout(function () {
            $toast.classList.add('hidden');
        }, durationMs || 1800);
    }

    /* ========== 状态 ========== */

    var state = {
        article: null,
        questions: [],
        currentStep: 1,
        autoSwitchTimer: null,
        passedLevels: new Set(),
        currentQuestion: null,
        videoEl: null,
        nextNodeIndex: 0
    };

    /* ========== 步骤切换 ========== */

    function setStep(step, options) {
        options = options || {};
        if (state.autoSwitchTimer) {
            clearTimeout(state.autoSwitchTimer);
            state.autoSwitchTimer = null;
        }

        state.currentStep = step;

        $$('.stage').forEach(function (el) {
            el.classList.toggle('active', Number(el.dataset.step) === step);
        });

        $$('.step-dot').forEach(function (dot) {
            var s = Number(dot.dataset.step);
            dot.classList.remove('active', 'done');
            if (s < step) dot.classList.add('done');
            else if (s === step) dot.classList.add('active');
        });

        if (step === 1 && !options.skipAutoSwitch) {
            state.autoSwitchTimer = setTimeout(function () { setStep(2); }, 10000);
        } else if (step === 2 && !options.skipAutoSwitch) {
            state.autoSwitchTimer = setTimeout(function () { setStep(3); }, 10000);
        } else if (step === 3) {
            prepareVideo();
        } else if (step === 4) {
            renderSummary();
        }
    }

    /* ========== 渲染基本信息和游戏序 ========== */

    function renderArticleInfo() {
        $byId('gameTitle').textContent = state.article.name;
        document.title = state.article.name + ' · 古文匠人';

        $byId('infoName').textContent = state.article.name;
        $byId('infoAudience').textContent = state.article.audience || '—';
        $byId('infoText').textContent = state.article.text || '—';
        $byId('infoTime').textContent = state.article.time || '—';
        $byId('infoPlay').textContent = state.article.play || '—';

        $byId('introText').textContent = state.article.intro || '（尚未填写游戏序）';
    }

    function renderSummary() {
        $byId('summaryText').textContent = state.article.summary || '（尚未填写总结）';

        var $reward = $byId('summaryReward');
        var allPassed = state.questions.length > 0 && state.passedLevels.size >= state.questions.length;
        if (allPassed && state.article.reward) {
            $reward.textContent = '通关奖励：' + state.article.reward;
            $reward.classList.remove('hidden');
        } else if (allPassed) {
            $reward.textContent = '已完成全部 ' + state.questions.length + ' 关，恭喜通关！';
            $reward.classList.remove('hidden');
        } else {
            $reward.classList.add('hidden');
        }
    }

    /* ========== 视频与关卡节点 ========== */

    function renderCheckpoints() {
        var $cp = $byId('checkpoints');
        $cp.innerHTML = '';
        state.questions.forEach(function (q, idx) {
            var item = document.createElement('div');
            item.className = 'checkpoint';
            if (state.passedLevels.has(idx)) item.classList.add('passed');
            if (state.nextNodeIndex === idx) item.classList.add('current');
            item.innerHTML =
                '<span class="cp-icon">' + (q.levelIndex || (idx + 1)) + '</span>' +
                '<div>' +
                    '<div>' + escapeHtml(q.levelName || ('第 ' + (idx + 1) + ' 关')) + '</div>' +
                    '<div style="font-size:12px;color:#7a5a36;">@ ' + q.nodeSeconds + 's</div>' +
                '</div>';
            $cp.appendChild(item);
        });
    }

    function findNextUnpassedIndex(fromIndex) {
        for (var i = fromIndex; i < state.questions.length; i++) {
            if (!state.passedLevels.has(i)) return i;
        }
        return -1;
    }

    function prepareVideo() {
        var video = $byId('gameVideo');
        state.videoEl = video;

        if (!state.article.videoUrl) {
            $byId('videoCover').classList.remove('hidden');
            $byId('videoCover').querySelector('p').textContent =
                '尚未配置视频地址，请在 articles.xlsx 的"视频地址"列填写后刷新页面。';
            return;
        }

        if (!video.dataset.bound) {
            video.dataset.bound = '1';

            video.src = state.article.videoUrl;
            video.addEventListener('timeupdate', onVideoTimeUpdate);
            video.addEventListener('play', function () {
                $byId('videoCover').classList.add('hidden');
            });
            video.addEventListener('error', function () {
                showToast('视频加载失败，请检查路径：' + state.article.videoUrl, 3000);
            });
        }

        state.nextNodeIndex = findNextUnpassedIndex(0);
        renderCheckpoints();

        $byId('btnPlay').onclick = function () {
            video.play().catch(function () { /* 用户手势已在按钮触发 */ });
        };
        $byId('btnRestartVideo').onclick = function () {
            try { video.currentTime = 0; } catch (_) {}
            state.passedLevels.clear();
            state.nextNodeIndex = findNextUnpassedIndex(0);
            renderCheckpoints();
            video.play().catch(function () {});
        };
    }

    function onVideoTimeUpdate() {
        var video = state.videoEl;
        if (!video || video.paused) return;
        if (state.currentQuestion) return;

        var idx = state.nextNodeIndex;
        if (idx < 0 || idx >= state.questions.length) return;

        var q = state.questions[idx];
        if (video.currentTime >= q.nodeSeconds) {
            video.pause();
            openQuiz(q, idx);
        }
    }

    function onAnswerCorrect(questionIndex) {
        state.passedLevels.add(questionIndex);
        state.nextNodeIndex = findNextUnpassedIndex(questionIndex + 1);
        renderCheckpoints();
        closeQuiz();
        if (state.videoEl) {
            state.videoEl.play().catch(function () {});
        }
        if (state.nextNodeIndex === -1) {
            showToast('恭喜！全部 ' + state.questions.length + ' 关完成', 2200);
        }
    }

    function onAnswerWrong(question) {
        if (state.videoEl) {
            var jumpTo;
            if (question.replaySeconds && question.replaySeconds > 0) {
                jumpTo = question.replaySeconds;
            } else {
                jumpTo = Math.max(0, question.nodeSeconds - 5);
            }
            try { state.videoEl.currentTime = jumpTo; } catch (_) {}
        }
    }

    /* ========== 答题弹窗 ========== */

    function openQuiz(question, questionIndex) {
        state.currentQuestion = { data: question, index: questionIndex, attempt: null };

        $byId('quizTitle').textContent =
            '第 ' + (question.levelIndex || (questionIndex + 1)) + ' 关 · ' + (question.levelName || '');
        $byId('quizSubtitle').textContent = question.learningGoal
            ? '学习目标：' + question.learningGoal
            : '';

        $byId('quizTask').textContent = question.selfTask || '';
        $byId('quizQuestion').textContent = question.question || '';

        $byId('quizFeedback').className = 'quiz-feedback hidden';
        $byId('quizFeedback').textContent = '';

        renderQuizOptions(question);

        $byId('quizModal').classList.remove('hidden');
    }

    function closeQuiz() {
        state.currentQuestion = null;
        $byId('quizModal').classList.add('hidden');
    }

    function renderQuizOptions(question) {
        var $opts = $byId('quizOptions');
        $opts.innerHTML = '';

        if (question.type === 'single') {
            renderSingleOptions($opts, question);
        } else if (question.type === 'judge') {
            renderJudgeOptions($opts, question);
        } else if (question.type === 'match') {
            renderMatchOptions($opts, question);
        } else if (question.type === 'sort') {
            renderSortOptions($opts, question);
        } else {
            $opts.innerHTML = '<div class="quiz-feedback error">未知题型：' + escapeHtml(question.type) + '</div>';
        }
    }

    /* ---- single ---- */
    function renderSingleOptions($opts, question) {
        var letters = ['A', 'B', 'C', 'D'];
        var attempt = { letter: '' };
        state.currentQuestion.attempt = attempt;

        question.options.forEach(function (text, i) {
            if (!text) return;
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'quiz-option';
            btn.dataset.letter = letters[i];
            btn.innerHTML =
                '<span class="opt-letter">' + letters[i] + '</span>' +
                escapeHtml(text);
            btn.onclick = function () {
                $$('.quiz-option', $opts).forEach(function (b) { b.classList.remove('selected'); });
                btn.classList.add('selected');
                attempt.letter = letters[i];
            };
            $opts.appendChild(btn);
        });
    }

    /* ---- judge ---- */
    function renderJudgeOptions($opts, question) {
        var attempt = { value: '' };
        state.currentQuestion.attempt = attempt;
        ['对', '错'].forEach(function (label) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'quiz-option';
            btn.textContent = label;
            btn.onclick = function () {
                $$('.quiz-option', $opts).forEach(function (b) { b.classList.remove('selected'); });
                btn.classList.add('selected');
                attempt.value = label;
            };
            $opts.appendChild(btn);
        });
    }

    /* ---- match ---- */
    function renderMatchOptions($opts, question) {
        var attempt = { pairs: {}, selectedLeft: null };
        state.currentQuestion.attempt = attempt;

        var area = document.createElement('div');
        area.className = 'match-area';

        var leftCol = document.createElement('div');
        leftCol.className = 'match-col';
        var rightCol = document.createElement('div');
        rightCol.className = 'match-col';

        question.matchLeft.forEach(function (text, i) {
            var item = document.createElement('div');
            item.className = 'match-item';
            item.textContent = text;
            item.dataset.side = 'left';
            item.dataset.value = text;
            item.onclick = function () { onMatchClick(item, 'left', text, attempt, $opts); };
            leftCol.appendChild(item);
        });

        var shuffledRight = question.matchRight.slice().sort(function () { return Math.random() - 0.5; });
        shuffledRight.forEach(function (text) {
            var item = document.createElement('div');
            item.className = 'match-item';
            item.textContent = text;
            item.dataset.side = 'right';
            item.dataset.value = text;
            item.onclick = function () { onMatchClick(item, 'right', text, attempt, $opts); };
            rightCol.appendChild(item);
        });

        area.appendChild(leftCol);
        area.appendChild(rightCol);
        $opts.appendChild(area);

        var pairsBox = document.createElement('div');
        pairsBox.className = 'match-pairs';
        pairsBox.id = 'matchPairsBox';
        pairsBox.textContent = '已配对：（点击左右两侧的条目即可配对，再次点击同一条目取消选择）';
        $opts.appendChild(pairsBox);
    }

    function onMatchClick(item, side, value, attempt, $opts) {
        if (item.classList.contains('matched')) return;

        if (side === 'left') {
            $$('.match-item[data-side="left"]', $opts).forEach(function (el) { el.classList.remove('selected'); });
            if (attempt.selectedLeft === value) {
                attempt.selectedLeft = null;
                return;
            }
            item.classList.add('selected');
            attempt.selectedLeft = value;
            return;
        }

        if (!attempt.selectedLeft) {
            showToast('请先点击左侧条目', 1200);
            return;
        }

        var leftValue = attempt.selectedLeft;
        var rightValue = value;
        attempt.pairs[leftValue] = rightValue;
        attempt.selectedLeft = null;

        $$('.match-item', $opts).forEach(function (el) { el.classList.remove('selected'); });

        $$('.match-item[data-side="left"]', $opts).forEach(function (el) {
            if (el.dataset.value === leftValue) el.classList.add('matched');
        });
        $$('.match-item[data-side="right"]', $opts).forEach(function (el) {
            if (el.dataset.value === rightValue) el.classList.add('matched');
        });

        renderMatchPairs(attempt);
    }

    function renderMatchPairs(attempt) {
        var box = $byId('matchPairsBox');
        var lines = Object.keys(attempt.pairs).map(function (left) {
            return left + ' → ' + attempt.pairs[left];
        });
        box.textContent = lines.length ? '已配对：' + lines.join('；') : '已配对：（点击左右两侧的条目即可配对）';
    }

    /* ---- sort ---- */
    function renderSortOptions($opts, question) {
        var attempt = { order: question.sortItems.slice() };
        state.currentQuestion.attempt = attempt;

        attempt.order.sort(function () { return Math.random() - 0.5; });

        var list = document.createElement('div');
        list.className = 'sort-list';
        list.id = 'sortList';
        $opts.appendChild(list);

        function rerender() {
            list.innerHTML = '';
            attempt.order.forEach(function (item, i) {
                var row = document.createElement('div');
                row.className = 'sort-item';
                row.innerHTML =
                    '<span>' + (i + 1) + '. ' + escapeHtml(item) + '</span>';
                var ctrl = document.createElement('div');
                ctrl.className = 'sort-controls';
                var btnUp = document.createElement('button');
                btnUp.type = 'button';
                btnUp.textContent = '↑';
                btnUp.disabled = i === 0;
                btnUp.onclick = function () { swap(i, i - 1); };
                var btnDown = document.createElement('button');
                btnDown.type = 'button';
                btnDown.textContent = '↓';
                btnDown.disabled = i === attempt.order.length - 1;
                btnDown.onclick = function () { swap(i, i + 1); };
                ctrl.appendChild(btnUp);
                ctrl.appendChild(btnDown);
                row.appendChild(ctrl);
                list.appendChild(row);
            });
        }

        function swap(a, b) {
            if (a < 0 || b < 0 || a >= attempt.order.length || b >= attempt.order.length) return;
            var tmp = attempt.order[a];
            attempt.order[a] = attempt.order[b];
            attempt.order[b] = tmp;
            rerender();
        }

        rerender();
    }

    /* ========== 提交答案 ========== */

    function checkAnswer() {
        if (!state.currentQuestion) return;
        var question = state.currentQuestion.data;
        var attempt = state.currentQuestion.attempt;
        var ok = false;
        var hint = '';

        if (question.type === 'single') {
            if (!attempt || !attempt.letter) {
                showToast('请选择一个选项', 1200);
                return;
            }
            ok = attempt.letter.toUpperCase() === (question.answer || '').toUpperCase();
            hint = '正确答案：' + question.answer;
        } else if (question.type === 'judge') {
            if (!attempt || !attempt.value) {
                showToast('请选择"对"或"错"', 1200);
                return;
            }
            ok = attempt.value === (question.answer || '').trim();
            hint = '正确答案：' + question.answer;
        } else if (question.type === 'match') {
            if (!attempt || Object.keys(attempt.pairs).length < question.matchLeft.length) {
                showToast('请完成全部连线', 1200);
                return;
            }
            ok = question.matchLeft.every(function (left, i) {
                var expected = '';
                for (var j = 0; j < (question.answer || '').split(';').length; j++) {
                    var pair = (question.answer || '').split(';')[j].split('=');
                    if (pair[0] && pair[0].trim() === left) {
                        expected = (pair[1] || '').trim();
                        break;
                    }
                }
                if (!expected) expected = question.matchRight[i] || '';
                return attempt.pairs[left] === expected;
            });
            hint = '正确答案：' + question.answer;
        } else if (question.type === 'sort') {
            if (!attempt || !attempt.order || attempt.order.length === 0) {
                showToast('请先排序', 1200);
                return;
            }
            var expectOrder = question.sortAnswerIndexes.map(function (idx) {
                return question.sortItems[idx - 1];
            });
            ok = attempt.order.length === expectOrder.length &&
                attempt.order.every(function (item, i) { return item === expectOrder[i]; });
            hint = '正确顺序：' + expectOrder.join(' → ');
        }

        var $fb = $byId('quizFeedback');
        $fb.classList.remove('hidden');
        if (ok) {
            $fb.className = 'quiz-feedback success';
            $fb.textContent = '回答正确！' + (question.analysis ? '\n解析：' + question.analysis : '');
            setTimeout(function () { onAnswerCorrect(state.currentQuestion.index); }, 1200);
        } else {
            $fb.className = 'quiz-feedback error';
            $fb.textContent =
                '回答错误，视频将跳回上一节点重看。\n' +
                hint +
                (question.analysis ? '\n解析：' + question.analysis : '');
            var qSnapshot = question;
            setTimeout(function () {
                onAnswerWrong(qSnapshot);
                closeQuiz();
            }, 1800);
        }
    }

    /* ========== 启动 ========== */

    function bindNav() {
        $$('[data-go-step]').forEach(function (el) {
            el.addEventListener('click', function (e) {
                e.preventDefault();
                var step = Number(el.dataset.goStep);
                if (step >= 1 && step <= 4) setStep(step, { skipAutoSwitch: true });
            });
        });

        $$('.step-dot').forEach(function (dot) {
            dot.addEventListener('click', function () {
                var step = Number(dot.dataset.step);
                if (step >= 1 && step <= 4) setStep(step, { skipAutoSwitch: true });
            });
        });

        $byId('btnSubmitAnswer').addEventListener('click', checkAnswer);
    }

    function showFatal(message) {
        var main = document.querySelector('.detail-main');
        main.innerHTML =
            '<div class="stage-card" style="margin:40px auto;max-width:640px;">' +
                '<div class="stage-tag">出错了</div>' +
                '<h2>无法加载该古文</h2>' +
                '<p style="line-height:1.8;color:#5a3411;">' + escapeHtml(message) + '</p>' +
                '<p style="margin-top:12px;font-size:13px;color:#7a5a36;">' +
                    '提示：本地直接打开 HTML 时浏览器无法读取 Excel，' +
                    '请使用本地静态服务（如 <code>npx http-server -p 8080</code>）或 Gitee Pages 访问。' +
                '</p>' +
                '<div class="stage-actions"><a class="btn btn-primary" href="index.html">返回目录</a></div>' +
            '</div>';
    }

    function start() {
        var id = getQueryId();
        if (!id) {
            showFatal('未在 URL 中指定古文 id，请从目录页进入。');
            return;
        }

        bindNav();

        ExcelLoader.load()
            .then(function (data) {
                var article = data.articles.find(function (a) { return a.id === id; });
                if (!article) {
                    showFatal('未找到 id 为 "' + id + '" 的古文，请检查 articles.xlsx。');
                    return;
                }
                state.article = article;
                state.questions = data.questionsByArticleId.get(id) || [];

                renderArticleInfo();
                setStep(1);
            })
            .catch(function (err) {
                showFatal(err && err.message ? err.message : String(err));
            });
    }

    start();
})();
