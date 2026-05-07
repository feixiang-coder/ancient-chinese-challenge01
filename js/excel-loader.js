/* eslint-disable no-undef */
/**
 * Excel 数据加载与数据组装。
 * 通过 SheetJS 直接从 fetch 的 ArrayBuffer 解析 articles.xlsx。
 *
 * 暴露：window.ExcelLoader
 *   - load(): Promise<{ articles: Article[], questionsByArticleId: Map<string, Question[]> }>
 *   - getDataPath(): string
 *
 * Article 形状：
 *   { id, name, audience, text, time, play, intro, videoUrl, summary, reward, cover }
 *
 * Question 形状：
 *   { articleId, levelIndex, levelName, nodeSeconds, replaySeconds,
 *     learningGoal, selfTask, type, question, options:[a,b,c,d], answer, analysis,
 *     matchLeft:[], matchRight:[], sortItems:[], sortAnswerIndexes:[] }
 */
(function (global) {
    'use strict';

    var DATA_PATH = 'data/articles.xlsx';

    function trimToString(value) {
        if (value === undefined || value === null) return '';
        return String(value).trim();
    }

    function parseSeconds(value) {
        if (value === undefined || value === null || value === '') return 0;
        var num = Number(value);
        return Number.isFinite(num) && num >= 0 ? Math.floor(num) : 0;
    }

    function splitByPipe(text) {
        return trimToString(text)
            .split('|')
            .map(function (s) { return s.trim(); })
            .filter(function (s) { return s.length > 0; });
    }

    function parseMatchPairs(answerText) {
        var pairs = [];
        trimToString(answerText)
            .split(';')
            .forEach(function (item) {
                var seg = item.trim();
                if (!seg) return;
                var idx = seg.indexOf('=');
                if (idx === -1) return;
                pairs.push({
                    left: seg.slice(0, idx).trim(),
                    right: seg.slice(idx + 1).trim()
                });
            });
        return pairs;
    }

    function parseSortAnswer(answerText) {
        return trimToString(answerText)
            .split(/[，,]/)
            .map(function (s) { return parseInt(s.trim(), 10); })
            .filter(function (n) { return !isNaN(n) && n >= 1; });
    }

    function normalizeArticle(row) {
        return {
            id: trimToString(row['id'] || row['ID']),
            name: trimToString(row['游戏名称']),
            audience: trimToString(row['适配对象']),
            text: trimToString(row['核心课文']),
            time: trimToString(row['时空定位']),
            play: trimToString(row['玩法']),
            intro: trimToString(row['游戏序']),
            videoUrl: trimToString(row['视频地址']),
            summary: trimToString(row['总结']),
            reward: trimToString(row['通关奖励']),
            cover: trimToString(row['封面图'])
        };
    }

    function normalizeQuestion(row) {
        var type = trimToString(row['题型']).toLowerCase();
        if (!type) type = 'single';

        var optionA = trimToString(row['选项A']);
        var optionB = trimToString(row['选项B']);
        var optionC = trimToString(row['选项C']);
        var optionD = trimToString(row['选项D']);

        var matchLeft = [];
        var matchRight = [];
        var sortItems = [];
        var sortAnswerIndexes = [];

        if (type === 'match') {
            matchLeft = splitByPipe(optionA);
            matchRight = splitByPipe(optionB);
        } else if (type === 'sort') {
            sortItems = splitByPipe(optionA);
            sortAnswerIndexes = parseSortAnswer(row['正确答案']);
        }

        return {
            articleId: trimToString(row['articleId'] || row['articleID']),
            levelIndex: parseSeconds(row['关卡序号']) || 0,
            levelName: trimToString(row['关卡名称']),
            nodeSeconds: parseSeconds(row['视频节点秒数']),
            replaySeconds: parseSeconds(row['重播跳回秒数']),
            learningGoal: trimToString(row['学习目标']),
            selfTask: trimToString(row['自学任务']),
            type: type,
            question: trimToString(row['题目']),
            options: [optionA, optionB, optionC, optionD],
            answer: trimToString(row['正确答案']),
            analysis: trimToString(row['答案解析']),
            matchLeft: matchLeft,
            matchRight: matchRight,
            sortItems: sortItems,
            sortAnswerIndexes: sortAnswerIndexes
        };
    }

    function readSheetAsObjects(workbook, sheetName) {
        var sheet = workbook.Sheets[sheetName];
        if (!sheet) return [];
        return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
    }

    function load() {
        return fetch(DATA_PATH, { cache: 'no-store' })
            .then(function (resp) {
                if (!resp.ok) {
                    throw new Error('无法读取 ' + DATA_PATH + '（HTTP ' + resp.status + '）');
                }
                return resp.arrayBuffer();
            })
            .then(function (buffer) {
                var workbook = XLSX.read(buffer, { type: 'array' });

                var articleRows = readSheetAsObjects(workbook, 'articles');
                var questionRows = readSheetAsObjects(workbook, 'questions');

                var articles = articleRows
                    .map(normalizeArticle)
                    .filter(function (a) { return a.id && a.name; });

                var questionsByArticleId = new Map();
                questionRows
                    .map(normalizeQuestion)
                    .filter(function (q) { return q.articleId; })
                    .sort(function (a, b) { return a.levelIndex - b.levelIndex; })
                    .forEach(function (q) {
                        if (!questionsByArticleId.has(q.articleId)) {
                            questionsByArticleId.set(q.articleId, []);
                        }
                        questionsByArticleId.get(q.articleId).push(q);
                    });

                return { articles: articles, questionsByArticleId: questionsByArticleId };
            });
    }

    global.ExcelLoader = {
        load: load,
        getDataPath: function () { return DATA_PATH; }
    };
})(window);
