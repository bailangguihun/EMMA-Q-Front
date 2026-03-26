(() => {
    if (!window.EmmaQApiClient) {
        return;
    }

    const STORAGE_KEYS = {
        draft: 'emmaq.preferences.draft.v2',
        apiBaseUrl: 'emmaq.preferences.api-base-url',
    };

    const FIELD_CONFIG = [
        { id: 'start-time', key: 'startTime', type: 'number', defaultValue: 0 },
        { id: 'duration', key: 'duration', type: 'number', defaultValue: 30 },
        { id: 'sampling-rate', key: 'samplingRate', type: 'number', defaultValue: 64 },
        { id: 'max-points', key: 'maxPoints', type: 'number', defaultValue: 8000 },
        { id: 'melody-channel', key: 'melodyChannel', type: 'number', defaultValue: 0 },
        { id: 'rule', key: 'rule', type: 'text', defaultValue: 'Rule1' },
        { id: 'time-signature', key: 'timeSignature', type: 'text', defaultValue: '4/4' },
        { id: 'pitch-center', key: 'pitchCenter', type: 'number', defaultValue: 66 },
        { id: 'span', key: 'span', type: 'number', defaultValue: 8 },
        { id: 'span-mode', key: 'spanMode', type: 'text', defaultValue: 'Mode1' },
        { id: 'pitch-1', key: 'pitch1', type: 'number', defaultValue: 74 },
        { id: 'pitch-2', key: 'pitch2', type: 'number', defaultValue: 66 },
        { id: 'pitch-3', key: 'pitch3', type: 'number', defaultValue: 58 },
        { id: 'dynamics-preset', key: 'dynamicsPreset', type: 'text', defaultValue: 'Standard' },
        { id: 'vel-1', key: 'vel1', type: 'number', defaultValue: 90 },
        { id: 'vel-2', key: 'vel2', type: 'number', defaultValue: 70 },
        { id: 'vel-3', key: 'vel3', type: 'number', defaultValue: 55 },
        { id: 'magnet', key: 'magnet', type: 'number', defaultValue: 4 },
        { id: 'loudness-offset', key: 'loudnessOffset', type: 'number', defaultValue: 0 },
        { id: 'dynamics-limit-strategy', key: 'dynamicsLimitStrategy', type: 'text', defaultValue: 'Balanced' },
        { id: 'rhythm-quantization', key: 'rhythmQuantization', type: 'text', defaultValue: 'Off' },
        { id: 'swing-amount', key: 'swingAmount', type: 'number', defaultValue: 0.12 },
        { id: 'note-duration-multiplier', key: 'noteDurationMultiplier', type: 'number', defaultValue: 1.2 },
        { id: 'sparsity', key: 'sparsity', type: 'text', defaultValue: '0' },
        { id: 'scale-constraint', key: 'scaleConstraint', type: 'text', defaultValue: 'Diatonic' },
        { id: 'pitch-coherence', key: 'pitchCoherence', type: 'text', defaultValue: 'None' },
        { id: 'pitch-range-min', key: 'pitchRangeMin', type: 'number', defaultValue: 48 },
        { id: 'pitch-range-max', key: 'pitchRangeMax', type: 'number', defaultValue: 84 },
        { id: 'max-leap', key: 'maxLeap', type: 'number', defaultValue: 9 },
        { id: 'transpose', key: 'transpose', type: 'number', defaultValue: 0 },
        { id: 'melody-min-velocity', key: 'melodyMinVelocity', type: 'number', defaultValue: 45 },
        { id: 'melody-max-velocity', key: 'melodyMaxVelocity', type: 'number', defaultValue: 90 },
        { id: 'chord-track-enabled', key: 'chordTrackEnabled', type: 'checkbox', defaultValue: false },
        { id: 'key-root', key: 'keyRoot', type: 'text', defaultValue: 'Auto' },
        { id: 'major-minor', key: 'majorMinor', type: 'text', defaultValue: 'Auto' },
        { id: 'emotion', key: 'emotion', type: 'text', defaultValue: 'Calm' },
        { id: 'chord-style', key: 'chordStyle', type: 'text', defaultValue: 'Block' },
        { id: 'chord-change-frequency', key: 'chordChangeFrequency', type: 'number', defaultValue: 8 },
        { id: 'chord-octave-offset', key: 'chordOctaveOffset', type: 'number', defaultValue: 0 },
        { id: 'chord-velocity', key: 'chordVelocity', type: 'number', defaultValue: 55 },
        {
            id: 'api-base-url',
            key: 'apiBaseUrl',
            type: 'text',
            defaultValue: window.EMMAQ_DEFAULT_API_BASE_URL || 'http://127.0.0.1:8000/api',
        },
    ];

    const OPTION_LABELS = {
        dynamicsPreset: { Light: '柔和', Standard: '标准', Strong: '强烈', Custom: '手动' },
        dynamicsLimitStrategy: { Conservative: '保守', Balanced: '平衡', Aggressive: '激进' },
        emotion: { Calm: '平静', Excited: '兴奋', Sad: '伤感', Tense: '紧张' },
        chordStyle: { Block: 'Block', Arp: 'Arp' },
    };

    const MANUAL_SPAN_FIELDS = ['pitch-1', 'pitch-2', 'pitch-3'];
    const MANUAL_DYNAMICS_FIELDS = ['vel-1', 'vel-2', 'vel-3'];

    const state = {
        touched: new Set(),
        showAllErrors: false,
        validationMode: 'basic',
        savedFileName: '',
        lastSavedAt: '',
        lastJobId: '',
        lastMidiArtifact: null,
        backendTone: 'neutral',
        backendMessage: '未检查',
        isBusy: false,
    };

    const elements = {
        fields: {},
    };

    let apiClient;

    function byId(id) {
        return document.getElementById(id);
    }

    function field(id) {
        return elements.fields[id];
    }

    function cacheElements() {
        FIELD_CONFIG.forEach((config) => {
            elements.fields[config.id] = byId(config.id);
        });

        elements.fields['eeg-file'] = byId('eeg-file');
        elements.dropZone = byId('drop-zone');
        elements.dropZoneTitle = byId('drop-zone-title');
        elements.dropZoneSubtitle = byId('drop-zone-subtitle');
        elements.feedback = byId('prefs-feedback');
        elements.summary = byId('prefs-summary');
        elements.draftNote = byId('draft-note');
        elements.requestPreview = byId('request-preview');
        elements.responsePanel = byId('backend-response-panel');
        elements.responseTitle = byId('backend-response-title');
        elements.responseBody = byId('backend-response-body');
        elements.resultSummary = byId('backend-result-summary');
        elements.resultLinks = byId('backend-result-links');
        elements.pipelineOverallPill = byId('pipeline-overall-pill');
        elements.pipelineOverallCopy = byId('pipeline-overall-copy');
        elements.pipelineGenerationPill = byId('pipeline-generation-pill');
        elements.pipelineGenerationCopy = byId('pipeline-generation-copy');
        elements.pipelineEvaluationPill = byId('pipeline-evaluation-pill');
        elements.pipelineEvaluationCopy = byId('pipeline-evaluation-copy');
        elements.checkFilePill = byId('check-file-pill');
        elements.checkFileCopy = byId('check-file-copy');
        elements.checkValidationPill = byId('check-validation-pill');
        elements.checkValidationCopy = byId('check-validation-copy');
        elements.checkBackendPill = byId('check-backend-pill');
        elements.checkBackendCopy = byId('check-backend-copy');
        elements.saveButton = byId('save-prefs');
        elements.clearButton = byId('clear-prefs');
        elements.exportButton = byId('export-ini');
        elements.checkBackendButton = byId('check-backend');
        elements.submitConfigButton = byId('submit-config');
        elements.generateButton = byId('generate-music');
        elements.downloadMidiButton = byId('download-midi');
        elements.evaluateButton = byId('start-evaluation');
    }

    function parseFieldValue(config) {
        const el = field(config.id);
        if (!el) {
            return config.defaultValue;
        }

        if (config.type === 'checkbox') {
            return Boolean(el.checked);
        }

        if (config.type === 'number') {
            const parsed = Number(el.value);
            return Number.isNaN(parsed) ? config.defaultValue : parsed;
        }

        return String(el.value || config.defaultValue);
    }

    function setFieldValue(config, value) {
        const el = field(config.id);
        if (!el) {
            return;
        }

        const nextValue = value ?? config.defaultValue;
        if (config.type === 'checkbox') {
            el.checked = Boolean(nextValue);
        } else {
            el.value = String(nextValue);
        }
    }

    function formatDateTime(value) {
        if (!value) {
            return '';
        }

        try {
            return new Date(value).toLocaleString('zh-CN');
        } catch {
            return value;
        }
    }

    function normalizeMessage(value, fallback) {
        const text = String(value ?? '').trim();
        return text || fallback;
    }

    function createTimestampToken() {
        return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
    }

    function inferMidiFileName(artifact) {
        const raw = String(
            artifact?.file_name || artifact?.filename || artifact?.name || ''
        ).trim();
        if (raw) {
            return /\.midi?$/i.test(raw) ? raw : `${raw}.mid`;
        }
        return `emmaq-output-${createTimestampToken()}.mid`;
    }

    function decodeBase64ToBytes(value) {
        const normalized = String(value || '').trim();
        if (!normalized) {
            return null;
        }
        const payload = normalized.includes(',') ? normalized.split(',').pop() : normalized;
        const binary = window.atob(payload || '');
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
            bytes[index] = binary.charCodeAt(index);
        }
        return bytes;
    }

    function triggerBrowserDownload({ url = '', blob = null, bytes = null, fileName, mimeType = 'audio/midi' }) {
        const link = document.createElement('a');
        let objectUrl = '';
        link.style.display = 'none';

        if (url) {
            link.href = url;
            link.download = fileName;
        } else {
            const sourceBlob = blob instanceof Blob
                ? blob
                : new Blob([bytes], { type: mimeType });
            objectUrl = URL.createObjectURL(sourceBlob);
            link.href = objectUrl;
            link.download = fileName;
        }

        document.body.appendChild(link);
        link.click();
        link.remove();

        if (objectUrl) {
            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        }
    }

    function rememberGeneratedArtifacts(generationResult) {
        state.lastJobId = String(generationResult?.job_id || '').trim();
        state.lastMidiArtifact = generationResult?.final_midi || generationResult?.output || null;
    }

    function clearGeneratedArtifacts() {
        state.lastJobId = '';
        state.lastMidiArtifact = null;
    }

    function artifactUrl(baseUrl, artifact) {
        if (!artifact || typeof artifact !== 'object') {
            return '';
        }

        const target = artifact.download_url || artifact.url || '';
        if (!target) {
            return '';
        }

        try {
            return new URL(target, `${window.normalizeEmmaQBaseUrl(baseUrl)}/`).href;
        } catch {
            return String(target);
        }
    }

    function setLinkItems(items) {
        elements.resultLinks.innerHTML = '';
        if (!items.length) {
            elements.resultLinks.hidden = true;
            return;
        }

        items.forEach((item) => {
            const listItem = document.createElement('li');
            const strong = document.createElement('strong');
            strong.textContent = item.label;
            listItem.appendChild(strong);

            if (item.href) {
                const spacer = document.createTextNode(' ');
                const link = document.createElement('a');
                link.href = item.href;
                link.target = '_blank';
                link.rel = 'noreferrer';
                link.textContent = item.text || item.href;
                listItem.appendChild(spacer);
                listItem.appendChild(link);
            } else if (item.text) {
                listItem.appendChild(document.createTextNode(` ${item.text}`));
            }

            elements.resultLinks.appendChild(listItem);
        });

        elements.resultLinks.hidden = false;
    }

    function resetResultSummary() {
        if (elements.resultSummary) {
            elements.resultSummary.hidden = true;
        }
        setPill(elements.pipelineOverallPill, 'neutral', '未执行');
        setPill(elements.pipelineGenerationPill, 'neutral', '未执行');
        setPill(elements.pipelineEvaluationPill, 'neutral', '未执行');
        elements.pipelineOverallCopy.textContent = '还没有生成 MIDI 或发起评估。';
        elements.pipelineGenerationCopy.textContent = '等待生成 MIDI。';
        elements.pipelineEvaluationCopy.textContent = '等待评估。';
        setLinkItems([]);
    }

    function pipelineTone(success, status, errorCode = '') {
        if (success) {
            return 'success';
        }
        if (status === 'partial_failure' || errorCode === 'missing_api_key') {
            return 'warning';
        }
        return 'error';
    }

    function summarizeHealthStatus(data) {
        const evaluationBackend = data?.evaluation_backend;
        if (!evaluationBackend) {
            return { tone: 'success', message: '健康检查通过。' };
        }
        if (!evaluationBackend.adapter_found) {
            return { tone: 'warning', message: '生成服务可用，但评估适配器缺失。' };
        }
        if (!evaluationBackend.deepseek_api_key_present) {
            return { tone: 'warning', message: '生成服务可用，但评估服务未配置。' };
        }
        return { tone: 'success', message: '生成与评估服务都可用。' };
    }

    function summarizeGenerationResult(generation, prefs) {
        if (!generation || typeof generation !== 'object') {
            resetResultSummary();
            return;
        }

        elements.resultSummary.hidden = false;
        setPill(
            elements.pipelineOverallPill,
            generation.success ? 'success' : 'error',
            generation.success ? '已生成' : '失败'
        );
        elements.pipelineOverallCopy.textContent = normalizeMessage(
            generation.success
                ? 'MIDI 已生成。现在可以下载 MIDI，并在需要时开始评估。'
                : generation.message,
            '生成接口已返回响应。'
        );

        setPill(
            elements.pipelineGenerationPill,
            generation.success ? 'success' : 'error',
            generation.success ? '成功' : '失败'
        );
        elements.pipelineGenerationCopy.textContent = normalizeMessage(
            generation.success
                ? `${generation.message || 'MIDI 已生成。'} Job ID: ${generation.job_id || '-'}`
                : generation.message,
            '尚未生成结果。'
        );

        setPill(elements.pipelineEvaluationPill, 'neutral', state.lastJobId ? '待开始' : '未执行');
        elements.pipelineEvaluationCopy.textContent = state.lastJobId
            ? '可在下载 MIDI 后单独发起评估。'
            : '请先完成 MIDI 生成。';

        const finalMidi = generation.final_midi || generation.output;
        const finalMidiHref = artifactUrl(prefs.apiBaseUrl, finalMidi);
        const linkItems = finalMidiHref
            ? [{
                label: 'MIDI 文件',
                href: finalMidiHref,
                text: inferMidiFileName(finalMidi),
            }]
            : [];
        setLinkItems(linkItems);
    }

    function summarizePipelineResult(result, prefs) {
        if (!result || typeof result !== 'object') {
            resetResultSummary();
            return;
        }

        const generation = result.generation_result || {};
        const evaluation = result.evaluation_result || {};
        const evaluationError = evaluation.error || result.error || {};
        const evaluationErrorCode = evaluationError.code || '';

        elements.resultSummary.hidden = false;
        setPill(
            elements.pipelineOverallPill,
            pipelineTone(Boolean(result.success), result.status, evaluationErrorCode),
            result.success ? '已完成' : result.status === 'partial_failure' ? '部分完成' : '失败'
        );
        elements.pipelineOverallCopy.textContent = normalizeMessage(
            result.success
                ? 'MIDI 已生成，评估已完成。'
                : result.status === 'partial_failure'
                    ? evaluationErrorCode === 'missing_api_key'
                        ? '生成已完成，但评估服务未配置。'
                        : '生成已完成，但评估未成功。'
                    : (result.error && result.error.message),
            '流水线返回了响应。'
        );

        setPill(
            elements.pipelineGenerationPill,
            generation.success ? 'success' : 'error',
            generation.success ? '成功' : '失败'
        );
        elements.pipelineGenerationCopy.textContent = normalizeMessage(
            generation.success
                ? `${generation.message || '生成完成。'} Job ID: ${generation.job_id || '-'}`
                : generation.message,
            '尚未生成结果。'
        );

        setPill(
            elements.pipelineEvaluationPill,
            pipelineTone(Boolean(evaluation.success), evaluation.status, evaluationErrorCode),
            evaluation.success ? '成功' : evaluationErrorCode === 'missing_api_key' ? '未配置' : evaluation.status === 'error' ? '失败' : '未执行'
        );
        elements.pipelineEvaluationCopy.textContent = normalizeMessage(
            evaluation.success
                ? `评估完成，最终分数：${evaluation.final_score_total ?? '-'}`
                : evaluationErrorCode === 'missing_api_key'
                    ? '评估服务未配置，后端缺少 DEEPSEEK_API_KEY。'
                    : evaluation.message,
            '尚未返回评估结果。'
        );

        const linkItems = [];
        const finalMidi = generation.final_midi;
        const finalMidiHref = artifactUrl(prefs.apiBaseUrl, finalMidi);
        if (finalMidiHref) {
            linkItems.push({
                label: 'MIDI 文件',
                href: finalMidiHref,
                text: inferMidiFileName(finalMidi),
            });
        }

        const reportArtifact = evaluation.artifacts?.report;
        const reportHref = artifactUrl(prefs.apiBaseUrl, reportArtifact);
        if (reportHref) {
            linkItems.push({
                label: '评估报告',
                href: reportHref,
                text: reportArtifact.file_name || '下载 evaluation_report.json',
            });
        }

        const logArtifact = evaluation.artifacts?.log;
        const logHref = artifactUrl(prefs.apiBaseUrl, logArtifact);
        if (logHref) {
            linkItems.push({
                label: '评估日志',
                href: logHref,
                text: logArtifact.file_name || '下载 evaluation_backend.log',
            });
        }

        setLinkItems(linkItems);
    }

    function getSelectedFile() {
        return field('eeg-file')?.files?.[0] || null;
    }

    function getCurrentFileName() {
        return getSelectedFile()?.name || state.savedFileName || '';
    }

    function optionLabel(key, value) {
        return OPTION_LABELS[key]?.[value] || value;
    }

    function updateDropZoneLabel() {
        const selectedFile = getSelectedFile();
        if (selectedFile) {
            elements.dropZoneTitle.textContent = `已选择：${selectedFile.name}`;
            elements.dropZoneSubtitle.textContent = '这个文件会在发起生成任务时随请求一起上传。';
            return;
        }

        if (state.savedFileName) {
            elements.dropZoneTitle.textContent = `草稿文件名：${state.savedFileName}`;
            elements.dropZoneSubtitle.textContent = '草稿不会保存文件内容。提交到后端前请重新选择 CSV 文件。';
            return;
        }

        elements.dropZoneTitle.textContent = '拖拽 EEG CSV 到此处';
        elements.dropZoneSubtitle.textContent = '或点击选择本地文件。草稿只会记住文件名，刷新后需要重新选择文件本体。';
    }

    function updateValueChips() {
        document.querySelectorAll('[data-value-for]').forEach((chip) => {
            const target = field(chip.dataset.valueFor);
            if (target) {
                chip.textContent = target.value;
            }
        });
    }

    function toggleFieldGroup(selector, ids, enabled) {
        document.querySelectorAll(selector).forEach((wrapper) => {
            wrapper.classList.toggle('is-disabled', !enabled);
            const input = wrapper.querySelector('input');
            if (input) {
                input.disabled = !enabled;
            }
        });

        if (!enabled) {
            ids.forEach((id) => state.touched.delete(id));
        }
    }

    function syncConditionalFields() {
        toggleFieldGroup('.span-mode-manual-field', MANUAL_SPAN_FIELDS, field('span-mode')?.value === 'Mode2');
        toggleFieldGroup('.dynamics-manual-field', MANUAL_DYNAMICS_FIELDS, field('dynamics-preset')?.value === 'Custom');
    }

    function gatherPrefs() {
        const prefs = {};
        FIELD_CONFIG.forEach((config) => {
            prefs[config.key] = parseFieldValue(config);
        });

        prefs.apiBaseUrl = window.normalizeEmmaQBaseUrl(prefs.apiBaseUrl);
        prefs.eegFileName = getCurrentFileName();
        return prefs;
    }

    function buildSections(prefs) {
        return {
            input: {
                eeg_file: prefs.eegFileName,
                start_time: prefs.startTime,
                duration: prefs.duration,
                sampling_rate: prefs.samplingRate,
                max_points: prefs.maxPoints,
                melody_channel: prefs.melodyChannel,
            },
            rule: {
                rule: prefs.rule,
                time_signature: prefs.timeSignature,
                pitch_center: prefs.pitchCenter,
                span: prefs.span,
                span_mode: prefs.spanMode,
                pitch_1: prefs.pitch1,
                pitch_2: prefs.pitch2,
                pitch_3: prefs.pitch3,
                magnet: prefs.magnet,
            },
            dynamics: {
                preset: prefs.dynamicsPreset,
                vel_1: prefs.vel1,
                vel_2: prefs.vel2,
                vel_3: prefs.vel3,
                loudness_offset: prefs.loudnessOffset,
                limit_strategy: prefs.dynamicsLimitStrategy,
            },
            advanced: {
                rhythm_quantization: prefs.rhythmQuantization,
                pitch_coherence: prefs.pitchCoherence,
                swing_amount: prefs.swingAmount,
                note_duration_multiplier: prefs.noteDurationMultiplier,
                sparsity: prefs.sparsity,
                scale_constraint: prefs.scaleConstraint,
                pitch_range_min: prefs.pitchRangeMin,
                pitch_range_max: prefs.pitchRangeMax,
                max_leap: prefs.maxLeap,
                transpose: prefs.transpose,
                melody_min_velocity: prefs.melodyMinVelocity,
                melody_max_velocity: prefs.melodyMaxVelocity,
            },
            chord: {
                chord_track_enabled: prefs.chordTrackEnabled,
                key_root: prefs.keyRoot,
                major_minor: prefs.majorMinor,
                emotion: prefs.emotion,
                chord_style: prefs.chordStyle,
                chord_change_frequency: prefs.chordChangeFrequency,
                chord_octave_offset: prefs.chordOctaveOffset,
                chord_velocity: prefs.chordVelocity,
            },
        };
    }

    function buildPayload(prefs) {
        return {
            meta: {
                source: 'EMMA-Q UI v3.1',
                exported_at: new Date().toISOString(),
                eeg_file_name: prefs.eegFileName,
            },
            preferences: buildSections(prefs),
            flat: prefs,
        };
    }

    function stringifyIniValue(value) {
        if (typeof value === 'boolean') {
            return value ? 'true' : 'false';
        }

        return String(value ?? '');
    }

    function buildIniContent(prefs) {
        return Object.entries(buildSections(prefs))
            .map(([sectionName, values]) => {
                const lines = [`[${sectionName}]`];
                Object.entries(values).forEach(([key, value]) => {
                    lines.push(`${key}=${stringifyIniValue(value)}`);
                });
                return lines.join('\n');
            })
            .join('\n\n');
    }

    function addNumberError(errors, fieldId, value, min, max, label, integer = false) {
        if (Number.isNaN(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
            errors[fieldId] = `${label}需要在 ${min} 到 ${max} 之间。`;
        }
    }

    function addEnumError(errors, fieldId, value, allowed, label) {
        if (!allowed.includes(value)) {
            errors[fieldId] = `${label}选项无效。`;
        }
    }

    function validatePreferences({ requireFile = false } = {}) {
        const prefs = gatherPrefs();
        const errors = {};

        addNumberError(errors, 'start-time', prefs.startTime, 0, 120, '开始时间', true);
        addNumberError(errors, 'duration', prefs.duration, 30, 120, '分析时长', true);
        addNumberError(errors, 'sampling-rate', prefs.samplingRate, 16, 128, '采样率', true);
        addNumberError(errors, 'max-points', prefs.maxPoints, 1000, 30000, '最大处理点数', true);
        addNumberError(errors, 'melody-channel', prefs.melodyChannel, 0, 6, '主旋律通道', true);
        addEnumError(errors, 'rule', prefs.rule, ['Rule1', 'Rule2'], '规则模板');
        addEnumError(errors, 'time-signature', prefs.timeSignature, ['2/4', '3/4', '4/4', '3/8', '6/8'], '拍号');
        addNumberError(errors, 'pitch-center', prefs.pitchCenter, 60, 72, '音域中心', true);
        addNumberError(errors, 'span', prefs.span, 4, 12, '三层跨度', true);
        addEnumError(errors, 'span-mode', prefs.spanMode, ['Mode1', 'Mode2'], '跨度模式');
        addEnumError(errors, 'dynamics-preset', prefs.dynamicsPreset, ['Light', 'Standard', 'Strong', 'Custom'], '力度预设');
        addNumberError(errors, 'magnet', prefs.magnet, 0, 12, '磁力', true);
        addNumberError(errors, 'loudness-offset', prefs.loudnessOffset, -30, 30, '整体响度偏移', true);
        addEnumError(errors, 'dynamics-limit-strategy', prefs.dynamicsLimitStrategy, ['Conservative', 'Balanced', 'Aggressive'], '力度上限策略');
        addEnumError(errors, 'rhythm-quantization', prefs.rhythmQuantization, ['Off', '1/8', '1/16', '1/32'], '节奏量化');
        addNumberError(errors, 'swing-amount', prefs.swingAmount, 0, 0.6, '摆动程度');
        addNumberError(errors, 'note-duration-multiplier', prefs.noteDurationMultiplier, 0.25, 2.5, '音符时值倍率');
        addEnumError(errors, 'sparsity', prefs.sparsity, ['0', '1', '2', '3', '4'], '稀疏化等级');
        addEnumError(errors, 'scale-constraint', prefs.scaleConstraint, ['Diatonic', 'Chromatic', 'Penta'], '音阶约束');
        addEnumError(errors, 'pitch-coherence', prefs.pitchCoherence, ['None', 'FX1', 'FX2', 'FX3', 'FX4'], '修音连贯程度');
        addNumberError(errors, 'pitch-range-min', prefs.pitchRangeMin, 12, 84, '音域下限', true);
        addNumberError(errors, 'pitch-range-max', prefs.pitchRangeMax, 48, 120, '音域上限', true);
        addNumberError(errors, 'max-leap', prefs.maxLeap, 3, 24, '最大跳进', true);
        addNumberError(errors, 'transpose', prefs.transpose, -10, 10, '整体转调', true);
        addNumberError(errors, 'melody-min-velocity', prefs.melodyMinVelocity, 30, 60, '主旋律最小力度', true);
        addNumberError(errors, 'melody-max-velocity', prefs.melodyMaxVelocity, 75, 105, '主旋律最大力度', true);
        addEnumError(errors, 'key-root', prefs.keyRoot, ['Auto', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'], '调性根音');
        addEnumError(errors, 'major-minor', prefs.majorMinor, ['Auto', 'Major', 'Minor'], '大小调');
        addEnumError(errors, 'emotion', prefs.emotion, ['Calm', 'Excited', 'Sad', 'Tense'], '情绪');
        addEnumError(errors, 'chord-style', prefs.chordStyle, ['Block', 'Arp'], '和弦风格');
        addNumberError(errors, 'chord-change-frequency', prefs.chordChangeFrequency, 1, 32, '和弦变换频率', true);
        addNumberError(errors, 'chord-octave-offset', prefs.chordOctaveOffset, -2, 2, '和弦八度偏移', true);
        addNumberError(errors, 'chord-velocity', prefs.chordVelocity, 20, 90, '和弦力度', true);

        if (prefs.spanMode === 'Mode2') {
            addNumberError(errors, 'pitch-1', prefs.pitch1, 0, 127, 'Pitch 1', true);
            addNumberError(errors, 'pitch-2', prefs.pitch2, 0, 127, 'Pitch 2', true);
            addNumberError(errors, 'pitch-3', prefs.pitch3, 0, 127, 'Pitch 3', true);
        }

        if (prefs.dynamicsPreset === 'Custom') {
            addNumberError(errors, 'vel-1', prefs.vel1, 1, 127, 'Vel 1', true);
            addNumberError(errors, 'vel-2', prefs.vel2, 1, 127, 'Vel 2', true);
            addNumberError(errors, 'vel-3', prefs.vel3, 1, 127, 'Vel 3', true);
        }

        if (prefs.pitchRangeMin >= prefs.pitchRangeMax) {
            errors['pitch-range-min'] = '音域下限必须小于音域上限。';
            errors['pitch-range-max'] = '音域上限必须大于音域下限。';
        }

        if (prefs.melodyMinVelocity >= prefs.melodyMaxVelocity) {
            errors['melody-min-velocity'] = '主旋律最小力度必须小于最大力度。';
            errors['melody-max-velocity'] = '主旋律最大力度必须大于最小力度。';
        }

        if (!/^https?:\/\//.test(prefs.apiBaseUrl)) {
            errors['api-base-url'] = '后端 API 地址必须以 http:// 或 https:// 开头。';
        }

        const file = getSelectedFile();
        if (file && !file.name.toLowerCase().endsWith('.csv')) {
            errors['eeg-file'] = '只支持上传 CSV 格式的 EEG 文件。';
        }

        if (requireFile && !file) {
            errors['eeg-file'] = '发起生成任务前，请重新选择 EEG CSV 文件。';
        }

        return { prefs, errors };
    }

    function renderErrors(errors) {
        document.querySelectorAll('.field-error').forEach((errorElement) => {
            const fieldId = errorElement.id.replace(/-error$/, '');
            const shouldShow = Boolean(errors[fieldId]) && (state.showAllErrors || state.touched.has(fieldId));
            errorElement.textContent = shouldShow ? errors[fieldId] : '';
            errorElement.classList.toggle('is-visible', shouldShow);
        });
    }

    function renderSummary(prefs, errorCount) {
        const items = [
            ['EEG 数据', prefs.eegFileName || '未选择'],
            ['分析窗口', `${prefs.startTime}s / ${prefs.duration}s`],
            ['规则与拍号', `${prefs.rule} / ${prefs.timeSignature}`],
            ['旋律中心', `${prefs.pitchCenter} · span ${prefs.span}`],
            ['动态策略', `${optionLabel('dynamicsPreset', prefs.dynamicsPreset)} / ${optionLabel('dynamicsLimitStrategy', prefs.dynamicsLimitStrategy)}`],
            ['和弦层', prefs.chordTrackEnabled ? `${optionLabel('emotion', prefs.emotion)} / ${optionLabel('chordStyle', prefs.chordStyle)}` : '未启用'],
            ['接口地址', prefs.apiBaseUrl],
            ['当前状态', errorCount ? `${errorCount} 个待修正字段` : '参数完整'],
        ];

        elements.summary.innerHTML = items
            .map(([label, value]) => `<li><strong>${label}</strong><span>${value}</span></li>`)
            .join('');

        if (state.lastSavedAt) {
            elements.draftNote.textContent = `草稿保存于 ${formatDateTime(state.lastSavedAt)}。${prefs.eegFileName ? '当前草稿已记录文件名。' : ''}`;
        } else if (prefs.eegFileName) {
            elements.draftNote.textContent = '当前有已选或已记录的 EEG 文件名，但还没有保存草稿。';
        } else {
            elements.draftNote.textContent = '尚未保存草稿。';
        }
    }

    function setPill(pill, tone, text) {
        pill.textContent = text;
        pill.className = `status-pill status-pill--${tone}`;
    }

    function renderChecks(prefs, errors) {
        const file = getSelectedFile();
        if (file) {
            setPill(elements.checkFilePill, 'success', '已加载');
            elements.checkFileCopy.textContent = `当前文件：${file.name}`;
        } else if (state.savedFileName) {
            setPill(elements.checkFilePill, 'warning', '需重选');
            elements.checkFileCopy.textContent = `草稿只记录了文件名：${state.savedFileName}`;
        } else {
            setPill(elements.checkFilePill, 'error', '未选择');
            elements.checkFileCopy.textContent = '还没有导入本次生成所需的 EEG CSV。';
        }

        const errorCount = Object.keys(errors).length;
        if (errorCount === 0) {
            setPill(elements.checkValidationPill, 'success', '通过');
            elements.checkValidationCopy.textContent = '所有字段都处于可提交状态。';
        } else {
            setPill(elements.checkValidationPill, 'warning', `${errorCount} 项`);
            elements.checkValidationCopy.textContent = '仍有字段需要修正后再导出或提交。';
        }

        const backendTone = state.backendTone === 'success'
            ? 'success'
            : state.backendTone === 'warning'
                ? 'warning'
                : state.backendTone === 'error'
                    ? 'error'
                    : 'neutral';
        setPill(
            elements.checkBackendPill,
            backendTone,
            state.backendTone === 'success'
                ? '可用'
                : state.backendTone === 'warning'
                    ? '受限'
                    : state.backendTone === 'error'
                        ? '失败'
                        : '未检查'
        );
        elements.checkBackendCopy.textContent = state.backendMessage;

        elements.requestPreview.textContent = JSON.stringify({
            base_url: prefs.apiBaseUrl,
            endpoints: {
                health: `${prefs.apiBaseUrl}/health`,
                preferences: `${prefs.apiBaseUrl}/preferences`,
                generate: `${prefs.apiBaseUrl}/generate`,
                evaluate: `${prefs.apiBaseUrl}/evaluate`,
            },
            eeg_file: prefs.eegFileName || null,
            payload_sections: Object.keys(buildSections(prefs)),
        }, null, 2);
    }

    function updateActionButtons() {
        if (elements.downloadMidiButton) {
            elements.downloadMidiButton.disabled = state.isBusy || !state.lastMidiArtifact;
        }
        if (elements.evaluateButton) {
            elements.evaluateButton.disabled = state.isBusy || !state.lastJobId;
        }
    }

    function setFeedback(message, tone = 'neutral') {
        elements.feedback.textContent = message;
        elements.feedback.dataset.tone = tone;
    }

    function renderResponse(title, data) {
        elements.responsePanel.hidden = false;
        elements.responseTitle.textContent = title;
        elements.responseBody.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    }

    function clearResponse() {
        elements.responsePanel.hidden = true;
        elements.responseBody.textContent = '';
        resetResultSummary();
    }

    function setBusy(isBusy) {
        state.isBusy = isBusy;
        [
            elements.saveButton,
            elements.clearButton,
            elements.exportButton,
            elements.checkBackendButton,
            elements.submitConfigButton,
            elements.generateButton,
            elements.downloadMidiButton,
            elements.evaluateButton,
        ].forEach((button) => {
            if (button) {
                button.disabled = isBusy;
            }
        });
        updateActionButtons();
    }

    function refreshUI() {
        syncConditionalFields();
        updateValueChips();
        updateDropZoneLabel();
        const { prefs, errors } = validatePreferences({ requireFile: state.validationMode === 'generate' });
        renderErrors(errors);
        renderSummary(prefs, Object.keys(errors).length);
        renderChecks(prefs, errors);
        updateActionButtons();
        return { prefs, errors };
    }

    function downloadText(filename, content) {
        triggerBrowserDownload({
            blob: new Blob([content], { type: 'text/plain;charset=utf-8' }),
            fileName: filename,
            mimeType: 'text/plain;charset=utf-8',
        });
    }

    function saveDraft() {
        state.validationMode = 'basic';
        state.showAllErrors = true;
        const { prefs, errors } = refreshUI();
        if (Object.keys(errors).length) {
            setFeedback('请先修正高亮字段，再保存草稿。', 'error');
            return;
        }

        const record = {
            version: 2,
            savedAt: new Date().toISOString(),
            preferences: prefs,
        };

        localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(record));
        localStorage.setItem(STORAGE_KEYS.apiBaseUrl, prefs.apiBaseUrl);
        state.savedFileName = prefs.eegFileName;
        state.lastSavedAt = record.savedAt;
        state.showAllErrors = false;
        setFeedback('草稿已保存到浏览器本地。刷新页面后需要重新选择 EEG 文件本体。', 'success');
        refreshUI();
    }

    function clearDraft() {
        if (!window.confirm('确定要清空本地草稿和已记录的接口地址吗？')) {
            return;
        }

        localStorage.removeItem(STORAGE_KEYS.draft);
        localStorage.removeItem(STORAGE_KEYS.apiBaseUrl);
        state.touched.clear();
        state.showAllErrors = false;
        state.savedFileName = '';
        state.lastSavedAt = '';
        clearGeneratedArtifacts();
        clearResponse();
        applyDefaults();
        setFeedback('本地草稿已清空。', 'success');
        refreshUI();
    }

    function exportIni() {
        state.validationMode = 'basic';
        state.showAllErrors = true;
        const { prefs, errors } = refreshUI();
        if (Object.keys(errors).length) {
            setFeedback('请先修正字段错误，再导出 INI。', 'error');
            return;
        }

        const fileName = `emma-q-preferences-${new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)}.ini`;
        downloadText(fileName, buildIniContent(prefs));
        setFeedback(`INI 已导出：${fileName}`, 'success');
    }

    async function downloadMidi() {
        const prefs = gatherPrefs();
        const artifact = state.lastMidiArtifact;
        if (!artifact) {
            setFeedback('请先生成 MIDI，再下载。', 'warning');
            return;
        }

        const fileName = inferMidiFileName(artifact);
        const href = artifactUrl(prefs.apiBaseUrl, artifact);

        try {
            if (href) {
                triggerBrowserDownload({ url: href, fileName });
                setFeedback(`MIDI 下载已开始：${fileName}`, 'success');
                return;
            }

            if (artifact.blob instanceof Blob) {
                triggerBrowserDownload({ blob: artifact.blob, fileName, mimeType: 'audio/midi' });
                setFeedback(`MIDI 下载已开始：${fileName}`, 'success');
                return;
            }

            if (artifact.bytes instanceof ArrayBuffer || ArrayBuffer.isView(artifact.bytes) || Array.isArray(artifact.bytes)) {
                triggerBrowserDownload({ bytes: artifact.bytes, fileName, mimeType: 'audio/midi' });
                setFeedback(`MIDI 下载已开始：${fileName}`, 'success');
                return;
            }

            if (typeof artifact.base64 === 'string' && artifact.base64.trim()) {
                const midiBytes = decodeBase64ToBytes(artifact.base64);
                if (midiBytes) {
                    triggerBrowserDownload({ bytes: midiBytes, fileName, mimeType: 'audio/midi' });
                    setFeedback(`MIDI 下载已开始：${fileName}`, 'success');
                    return;
                }
            }

            throw new Error('后端没有返回可下载的 MIDI 内容。');
        } catch (error) {
            setFeedback(`MIDI 下载失败：${error.message}`, 'error');
        }
    }

    async function checkBackend() {
        state.validationMode = 'basic';
        state.showAllErrors = true;
        const { prefs, errors } = refreshUI();
        if (errors['api-base-url']) {
            setFeedback('请先填写正确的后端 API 地址。', 'error');
            return;
        }

        setBusy(true);
        setFeedback('正在检查后端接口可用性...', 'neutral');

        try {
            apiClient.setBaseUrl(prefs.apiBaseUrl);
            const response = await apiClient.healthcheck();
            const summary = summarizeHealthStatus(response.data);
            state.backendTone = summary.tone;
            state.backendMessage = `${summary.message} (${response.pathUsed})`;
            resetResultSummary();
            renderResponse('后端健康检查', response.data);
            setFeedback(summary.message, summary.tone);
        } catch (error) {
            state.backendTone = 'error';
            state.backendMessage = error.message;
            resetResultSummary();
            renderResponse('后端健康检查失败', { error: error.message });
            setFeedback(`接口检查失败：${error.message}`, 'error');
        } finally {
            setBusy(false);
            refreshUI();
        }
    }

    async function submitConfig() {
        state.validationMode = 'basic';
        state.showAllErrors = true;
        const { prefs, errors } = refreshUI();
        if (Object.keys(errors).length) {
            setFeedback('请先修正字段错误，再提交配置。', 'error');
            return;
        }

        setBusy(true);
        setFeedback('正在提交配置到后端...', 'neutral');

        try {
            apiClient.setBaseUrl(prefs.apiBaseUrl);
            const response = await apiClient.savePreferences(buildPayload(prefs));
            state.backendTone = 'success';
            state.backendMessage = `配置已提交：${response.pathUsed}`;
            resetResultSummary();
            renderResponse('配置提交结果', response.data);
            setFeedback(`配置提交成功：${response.pathUsed}`, 'success');
        } catch (error) {
            state.backendTone = 'error';
            state.backendMessage = error.message;
            resetResultSummary();
            renderResponse('配置提交失败', { error: error.message });
            setFeedback(`配置提交失败：${error.message}`, 'error');
        } finally {
            setBusy(false);
            refreshUI();
        }
    }

    async function generateMusic() {
        state.validationMode = 'generate';
        state.showAllErrors = true;
        const { prefs, errors } = refreshUI();
        if (Object.keys(errors).length) {
            setFeedback('请先修正字段错误，并重新选择 EEG 文件，再发起生成。', 'error');
            return;
        }

        const file = getSelectedFile();
        if (!file) {
            state.touched.add('eeg-file');
            refreshUI();
            setFeedback('生成任务需要上传当前 EEG CSV 文件。', 'error');
            return;
        }

        setBusy(true);
        clearGeneratedArtifacts();
        state.backendTone = 'neutral';
        state.backendMessage = 'MIDI 生成进行中...';
        resetResultSummary();
        refreshUI();
        setFeedback('正在上传 EEG 文件，并请求后端生成 MIDI...', 'neutral');

        try {
            apiClient.setBaseUrl(prefs.apiBaseUrl);
            const response = await apiClient.generateMusic({
                payload: buildPayload(prefs),
                eegFile: file,
                iniContent: buildIniContent(prefs),
            });
            const generationResult = response.data;
            rememberGeneratedArtifacts(generationResult);

            if (generationResult?.success) {
                state.backendTone = 'success';
                state.backendMessage = `MIDI 已生成：${response.pathUsed}`;
                setFeedback('MIDI 已生成。现在可以下载 MIDI，并开始评估。', 'success');
            } else {
                state.backendTone = 'error';
                state.backendMessage = normalizeMessage(generationResult?.message, 'MIDI 生成失败。');
                setFeedback(state.backendMessage, 'error');
            }

            summarizeGenerationResult(generationResult, prefs);
            renderResponse('MIDI 生成结果', generationResult);
        } catch (error) {
            clearGeneratedArtifacts();
            state.backendTone = 'error';
            state.backendMessage = error.message;
            resetResultSummary();
            renderResponse('MIDI 生成失败', error.payload || { error: error.message });
            setFeedback(`MIDI 生成失败：${error.message}`, 'error');
        } finally {
            setBusy(false);
            refreshUI();
        }
    }

    async function startEvaluation() {
        state.validationMode = 'basic';
        state.showAllErrors = true;
        const { prefs, errors } = refreshUI();
        if (errors['api-base-url']) {
            setFeedback('请先填写正确的后端 API 地址。', 'error');
            return;
        }

        if (!state.lastJobId) {
            setFeedback('请先生成 MIDI，再开始评估。', 'warning');
            return;
        }

        setBusy(true);
        state.backendTone = 'neutral';
        state.backendMessage = '评估进行中...';
        setFeedback('正在请求后端评估当前 MIDI...', 'neutral');

        try {
            apiClient.setBaseUrl(prefs.apiBaseUrl);
            const response = await apiClient.evaluateJob(state.lastJobId);
            const pipelineResult = response.data;
            const evaluationErrorCode = pipelineResult?.evaluation_result?.error?.code || pipelineResult?.error?.code || '';

            if (pipelineResult?.success) {
                state.backendTone = 'success';
                state.backendMessage = `评估已完成：${response.pathUsed}`;
                setFeedback('评估已完成。', 'success');
            } else if (pipelineResult?.generation_result?.success && evaluationErrorCode === 'missing_api_key') {
                state.backendTone = 'warning';
                state.backendMessage = '评估服务未配置。';
                setFeedback('评估服务未配置。请在后端设置 DEEPSEEK_API_KEY。', 'warning');
            } else if (pipelineResult?.generation_result?.success) {
                state.backendTone = 'warning';
                state.backendMessage = normalizeMessage(pipelineResult?.evaluation_result?.message, '评估未成功。');
                setFeedback(state.backendMessage, 'warning');
            } else {
                state.backendTone = 'error';
                state.backendMessage = normalizeMessage(pipelineResult?.error?.message, '评估失败。');
                setFeedback(state.backendMessage, 'error');
            }

            summarizePipelineResult(pipelineResult, prefs);
            renderResponse('评估结果', pipelineResult);
        } catch (error) {
            state.backendTone = 'error';
            state.backendMessage = error.message;
            renderResponse('评估失败', error.payload || { error: error.message });
            setFeedback(`评估失败：${error.message}`, 'error');
        } finally {
            setBusy(false);
            refreshUI();
        }
    }

    function handleFieldInteraction(id, related = []) {
        state.touched.add(id);
        related.forEach((item) => state.touched.add(item));
        if (id === 'api-base-url') {
            localStorage.setItem(STORAGE_KEYS.apiBaseUrl, window.normalizeEmmaQBaseUrl(field('api-base-url').value));
        }
        refreshUI();
    }

    function bindFieldEvents() {
        FIELD_CONFIG.forEach((config) => {
            const el = field(config.id);
            if (!el || config.id === 'api-base-url') {
                return;
            }

            const eventName = el.tagName === 'SELECT' || config.type === 'checkbox' ? 'change' : 'input';
            const related = config.id === 'pitch-range-min' || config.id === 'pitch-range-max'
                ? ['pitch-range-min', 'pitch-range-max']
                : config.id === 'melody-min-velocity' || config.id === 'melody-max-velocity'
                    ? ['melody-min-velocity', 'melody-max-velocity']
                    : [];

            el.addEventListener(eventName, () => handleFieldInteraction(config.id, related));
        });

        field('api-base-url').addEventListener('input', () => handleFieldInteraction('api-base-url'));
        field('eeg-file').addEventListener('change', () => {
            state.touched.add('eeg-file');
            state.savedFileName = getSelectedFile()?.name || '';
            refreshUI();
        });

        elements.dropZone.addEventListener('dragover', (event) => {
            event.preventDefault();
            elements.dropZone.classList.add('dragover');
        });

        elements.dropZone.addEventListener('dragleave', () => {
            elements.dropZone.classList.remove('dragover');
        });

        elements.dropZone.addEventListener('drop', (event) => {
            event.preventDefault();
            elements.dropZone.classList.remove('dragover');
            const droppedFile = event.dataTransfer?.files?.[0];
            if (!droppedFile) {
                return;
            }

            const transfer = new DataTransfer();
            transfer.items.add(droppedFile);
            field('eeg-file').files = transfer.files;
            state.touched.add('eeg-file');
            state.savedFileName = droppedFile.name;
            refreshUI();
        });

        elements.saveButton.addEventListener('click', saveDraft);
        elements.clearButton.addEventListener('click', clearDraft);
        elements.exportButton.addEventListener('click', exportIni);
        elements.checkBackendButton.addEventListener('click', checkBackend);
        elements.submitConfigButton.addEventListener('click', submitConfig);
        elements.generateButton.addEventListener('click', generateMusic);
        elements.downloadMidiButton.addEventListener('click', downloadMidi);
        elements.evaluateButton.addEventListener('click', startEvaluation);
    }

    function applyDefaults() {
        FIELD_CONFIG.forEach((config) => setFieldValue(config, config.defaultValue));
        field('eeg-file').value = '';
        syncConditionalFields();
        updateValueChips();
        updateDropZoneLabel();
    }

    function applyPreferences(prefs) {
        FIELD_CONFIG.forEach((config) => {
            if (config.id === 'api-base-url') {
                setFieldValue(config, prefs[config.key] || localStorage.getItem(STORAGE_KEYS.apiBaseUrl) || config.defaultValue);
                return;
            }

            setFieldValue(config, prefs[config.key]);
        });

        state.savedFileName = prefs.eegFileName || '';
        syncConditionalFields();
        updateValueChips();
        updateDropZoneLabel();
    }

    function loadDraft() {
        applyDefaults();
        const storedApiBaseUrl = localStorage.getItem(STORAGE_KEYS.apiBaseUrl);
        if (storedApiBaseUrl) {
            field('api-base-url').value = window.normalizeEmmaQBaseUrl(storedApiBaseUrl);
        }

        const raw = localStorage.getItem(STORAGE_KEYS.draft);
        if (!raw) {
            refreshUI();
            return;
        }

        try {
            const parsed = JSON.parse(raw);
            const prefs = parsed.preferences || parsed;
            state.lastSavedAt = parsed.savedAt || '';
            applyPreferences(prefs);
            setFeedback('已恢复本地草稿。提交到后端前，请重新选择 EEG 文件。', 'neutral');
        } catch {
            setFeedback('草稿读取失败，已恢复默认值。', 'warning');
        }

        refreshUI();
    }

    document.addEventListener('DOMContentLoaded', () => {
        cacheElements();
        apiClient = new window.EmmaQApiClient(window.EMMAQ_DEFAULT_API_BASE_URL);
        bindFieldEvents();
        loadDraft();
    });
})();
