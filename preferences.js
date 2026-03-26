(() => {
    function byId(id) {
        return document.getElementById(id);
    }

    function textOf(value, fallback = '') {
        const text = String(value ?? '').trim();
        return text || fallback;
    }

    function createTimestampToken() {
        return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
    }

    function inferMidiFileName(artifact) {
        const raw = textOf(artifact?.file_name || artifact?.filename || artifact?.name, '');
        if (raw) {
            return /\.midi?$/i.test(raw) ? raw : `${raw}.mid`;
        }
        return `emmaq-output-${createTimestampToken()}.mid`;
    }

    function decodeBase64ToBytes(value) {
        const normalized = textOf(value, '');
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
                source: 'EMMA-Q UI',
                exported_at: new Date().toISOString(),
                eeg_file_name: prefs.eegFileName,
            },
            preferences: buildSections(prefs),
            flat: prefs,
        };
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

    function showErrors(bridge, errors) {
        bridge.clearFieldErrors();
        Object.entries(errors).forEach(([fieldId, message]) => {
            bridge.updateFieldError(fieldId, message);
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        const bridge = window.EMMAQPreferencesBridge;
        if (!bridge || !window.EmmaQApiClient) {
            return;
        }

        const baseUrl = window.EMMAQ_DEFAULT_API_BASE_URL || 'http://127.0.0.1:8000/api';
        const apiClient = new window.EmmaQApiClient(baseUrl);

        const elements = {
            downloadButton: byId('download-midi'),
            evaluateButton: byId('start-evaluation'),
            resultPanel: byId('runtime-result-panel'),
            generationStatus: byId('generation-status'),
            evaluationStatus: byId('evaluation-status'),
            resultLinks: byId('result-links'),
            midiPlayerPanel: byId('midi-player-panel'),
            midiPlayer: byId('midi-player'),
        };

        const state = {
            lastJobId: '',
            lastMidiArtifact: null,
            midiPlayerObjectUrl: '',
            isBusy: false,
        };

        function setFeedback(message, isError = false) {
            bridge.setFeedback(message, isError);
        }

        function cleanupMidiPlayerUrl() {
            if (state.midiPlayerObjectUrl) {
                URL.revokeObjectURL(state.midiPlayerObjectUrl);
                state.midiPlayerObjectUrl = '';
            }
        }

        function hideMidiPlayer() {
            cleanupMidiPlayerUrl();
            if (elements.midiPlayer && typeof elements.midiPlayer.stop === 'function') {
                elements.midiPlayer.stop();
            }
            if (elements.midiPlayer) {
                elements.midiPlayer.removeAttribute('src');
            }
            if (elements.midiPlayerPanel) {
                elements.midiPlayerPanel.hidden = true;
            }
        }

        function bindMidiPlayer(artifact) {
            if (!elements.midiPlayerPanel || !elements.midiPlayer || !artifact || typeof artifact !== 'object') {
                hideMidiPlayer();
                return;
            }

            cleanupMidiPlayerUrl();

            let playbackUrl = artifactUrl(apiClient.getBaseUrl(), artifact);
            if (!playbackUrl && artifact.blob instanceof Blob) {
                playbackUrl = URL.createObjectURL(artifact.blob);
                state.midiPlayerObjectUrl = playbackUrl;
            } else if (!playbackUrl && (artifact.bytes instanceof ArrayBuffer || ArrayBuffer.isView(artifact.bytes) || Array.isArray(artifact.bytes))) {
                playbackUrl = URL.createObjectURL(new Blob([artifact.bytes], { type: 'audio/midi' }));
                state.midiPlayerObjectUrl = playbackUrl;
            } else if (!playbackUrl && typeof artifact.base64 === 'string' && artifact.base64.trim()) {
                const midiBytes = decodeBase64ToBytes(artifact.base64);
                if (midiBytes) {
                    playbackUrl = URL.createObjectURL(new Blob([midiBytes], { type: 'audio/midi' }));
                    state.midiPlayerObjectUrl = playbackUrl;
                }
            }

            if (!playbackUrl) {
                hideMidiPlayer();
                return;
            }

            elements.midiPlayer.setAttribute('src', playbackUrl);
            elements.midiPlayerPanel.hidden = false;
        }

        function clearResultLinks() {
            if (!elements.resultLinks) {
                return;
            }
            elements.resultLinks.innerHTML = '';
            elements.resultLinks.hidden = true;
        }

        function renderResultLinks(items) {
            if (!elements.resultLinks) {
                return;
            }

            clearResultLinks();
            if (!items.length) {
                return;
            }

            items.forEach((item) => {
                const li = document.createElement('li');
                if (item.href) {
                    const link = document.createElement('a');
                    link.href = item.href;
                    link.target = '_blank';
                    link.rel = 'noreferrer';
                    link.textContent = item.text || item.href;
                    li.textContent = `${item.label}: `;
                    li.appendChild(link);
                } else {
                    li.textContent = `${item.label}: ${item.text || ''}`;
                }
                elements.resultLinks.appendChild(li);
            });

            elements.resultLinks.hidden = false;
        }

        function renderIdleResult() {
            if (elements.resultPanel) {
                elements.resultPanel.hidden = true;
            }
            if (elements.generationStatus) {
                elements.generationStatus.textContent = '尚未生成 MIDI。';
            }
            if (elements.evaluationStatus) {
                elements.evaluationStatus.textContent = '尚未开始评估。';
            }
            clearResultLinks();
            hideMidiPlayer();
        }

        function syncActionButtons() {
            if (elements.downloadButton) {
                elements.downloadButton.hidden = !state.lastMidiArtifact;
                elements.downloadButton.disabled = state.isBusy || !state.lastMidiArtifact;
            }
            if (elements.evaluateButton) {
                elements.evaluateButton.disabled = state.isBusy || !state.lastJobId;
            }
        }

        function setBusy(isBusy) {
            state.isBusy = isBusy;
            if (bridge.elements.generateButton) {
                bridge.elements.generateButton.disabled = isBusy;
            }
            if (bridge.elements.saveButton) {
                bridge.elements.saveButton.disabled = isBusy;
            }
            if (bridge.elements.clearButton) {
                bridge.elements.clearButton.disabled = isBusy;
            }
            syncActionButtons();
        }

        function rememberGeneration(generationResult) {
            state.lastJobId = textOf(generationResult?.job_id, '');
            state.lastMidiArtifact = generationResult?.final_midi || generationResult?.output || null;
            syncActionButtons();
        }

        function clearGeneration() {
            state.lastJobId = '';
            state.lastMidiArtifact = null;
            syncActionButtons();
            hideMidiPlayer();
        }

        function currentPrefs() {
            const prefs = bridge.gatherPrefs();
            prefs.eegFileName = bridge.elements.eegFile?.files?.[0]?.name || bridge.elements.eegFile?.dataset?.fileName || prefs.eegFileName || '';
            return prefs;
        }

        function renderGenerationResult(generationResult) {
            if (elements.resultPanel) {
                elements.resultPanel.hidden = false;
            }

            const finalMidi = generationResult?.final_midi || generationResult?.output || null;
            const links = [];
            if (finalMidi) {
                const midiHref = artifactUrl(apiClient.getBaseUrl(), finalMidi);
                if (midiHref) {
                    links.push({
                        label: 'MIDI 文件',
                        href: midiHref,
                        text: inferMidiFileName(finalMidi),
                    });
                }
            }

            if (elements.generationStatus) {
                elements.generationStatus.textContent = generationResult?.success
                    ? `生成完成。Job ID: ${textOf(generationResult?.job_id, '-')}`
                    : textOf(generationResult?.message, '生成失败，请重试。');
            }
            if (elements.evaluationStatus) {
                elements.evaluationStatus.textContent = state.lastJobId
                    ? '可开始评估当前生成结果。'
                    : '尚未开始评估。';
            }

            renderResultLinks(links);
            bindMidiPlayer(finalMidi);
        }

        function renderEvaluationResult(result) {
            const generation = result?.generation_result || {};
            const evaluation = result?.evaluation_result || {};
            const errorCode = evaluation?.error?.code || result?.error?.code || '';
            const links = [];

            const finalMidi = generation.final_midi || state.lastMidiArtifact;
            const midiHref = artifactUrl(apiClient.getBaseUrl(), finalMidi);
            if (midiHref) {
                links.push({
                    label: 'MIDI 文件',
                    href: midiHref,
                    text: inferMidiFileName(finalMidi),
                });
            }

            const reportArtifact = evaluation?.artifacts?.report;
            const reportHref = artifactUrl(apiClient.getBaseUrl(), reportArtifact);
            if (reportHref) {
                links.push({
                    label: '评估报告',
                    href: reportHref,
                    text: textOf(reportArtifact?.file_name, 'evaluation_report.json'),
                });
            }

            const logArtifact = evaluation?.artifacts?.log;
            const logHref = artifactUrl(apiClient.getBaseUrl(), logArtifact);
            if (logHref) {
                links.push({
                    label: '评估日志',
                    href: logHref,
                    text: textOf(logArtifact?.file_name, 'evaluation_backend.log'),
                });
            }

            if (elements.resultPanel) {
                elements.resultPanel.hidden = false;
            }
            if (elements.generationStatus) {
                elements.generationStatus.textContent = generation?.success
                    ? `生成完成。Job ID: ${textOf(generation?.job_id, state.lastJobId || '-')}`
                    : textOf(generation?.message, '生成失败，请重试。');
            }
            if (elements.evaluationStatus) {
                elements.evaluationStatus.textContent = evaluation?.success
                    ? `评估完成。最终得分：${evaluation.final_score_total ?? '-'}`
                    : errorCode === 'missing_api_key'
                        ? '评估服务未配置。'
                        : textOf(evaluation?.message || result?.error?.message, '评估失败，请重试。');
            }

            renderResultLinks(links);
            bindMidiPlayer(finalMidi);
        }

        async function savePreferences(fallbackSave) {
            const errors = bridge.validatePrefs();
            if (Object.keys(errors).length) {
                showErrors(bridge, errors);
                setFeedback('请先完善参数后再保存。', true);
                return;
            }

            if (typeof fallbackSave === 'function') {
                fallbackSave();
            }

            try {
                const prefs = currentPrefs();
                await apiClient.savePreferences(buildPayload(prefs));
            } catch (error) {
                console.warn('save preferences failed', error);
                setFeedback('本地已保存，但后端同步失败。', true);
            }
        }

        async function generateMusic() {
            const errors = bridge.validatePrefs();
            if (Object.keys(errors).length) {
                clearGeneration();
                renderIdleResult();
                showErrors(bridge, errors);
                setFeedback('请先修正参数并重新选择 EEG CSV 文件。', true);
                return;
            }

            const eegFile = bridge.elements.eegFile?.files?.[0] || null;
            if (!eegFile) {
                bridge.updateFieldError('eeg-file', '请先选择 EEG CSV 文件。');
                setFeedback('请先选择 EEG CSV 文件。', true);
                return;
            }

            const prefs = currentPrefs();
            setBusy(true);
            clearGeneration();
            renderIdleResult();
            setFeedback('正在生成 MIDI…', false);

            try {
                const response = await apiClient.generateMusic({
                    payload: buildPayload(prefs),
                    eegFile,
                    iniContent: bridge.buildIniContent(prefs),
                });
                const generationResult = response.data || {};
                rememberGeneration(generationResult);
                renderGenerationResult(generationResult);

                if (generationResult.success) {
                    setFeedback('生成完成。', false);
                } else {
                    setFeedback(textOf(generationResult.message, '生成失败，请重试。'), true);
                }
            } catch (error) {
                clearGeneration();
                renderIdleResult();
                if (elements.resultPanel) {
                    elements.resultPanel.hidden = false;
                }
                if (elements.generationStatus) {
                    elements.generationStatus.textContent = textOf(error?.message, '生成失败，请重试。');
                }
                if (elements.evaluationStatus) {
                    elements.evaluationStatus.textContent = '尚未开始评估。';
                }
                setFeedback('生成失败，请重试。', true);
            } finally {
                setBusy(false);
            }
        }

        async function downloadMidi() {
            if (!state.lastMidiArtifact) {
                setFeedback('请先生成 MIDI。', true);
                return;
            }

            const artifact = state.lastMidiArtifact;
            const fileName = inferMidiFileName(artifact);
            const href = artifactUrl(apiClient.getBaseUrl(), artifact);

            try {
                if (href) {
                    triggerBrowserDownload({ url: href, fileName });
                } else if (artifact.blob instanceof Blob) {
                    triggerBrowserDownload({ blob: artifact.blob, fileName, mimeType: 'audio/midi' });
                } else if (artifact.bytes instanceof ArrayBuffer || ArrayBuffer.isView(artifact.bytes) || Array.isArray(artifact.bytes)) {
                    triggerBrowserDownload({ bytes: artifact.bytes, fileName, mimeType: 'audio/midi' });
                } else if (typeof artifact.base64 === 'string' && artifact.base64.trim()) {
                    const midiBytes = decodeBase64ToBytes(artifact.base64);
                    if (!midiBytes) {
                        throw new Error('无法解析 MIDI 内容。');
                    }
                    triggerBrowserDownload({ bytes: midiBytes, fileName, mimeType: 'audio/midi' });
                } else {
                    throw new Error('当前结果中没有可下载的 MIDI 文件。');
                }

                setFeedback(`已开始下载 ${fileName}`, false);
            } catch (error) {
                setFeedback(textOf(error?.message, '下载失败，请重试。'), true);
            }
        }

        async function startEvaluation() {
            if (!state.lastJobId) {
                setFeedback('请先生成 MIDI。', true);
                return;
            }

            setBusy(true);
            if (elements.resultPanel) {
                elements.resultPanel.hidden = false;
            }
            if (elements.evaluationStatus) {
                elements.evaluationStatus.textContent = '正在评估…';
            }
            setFeedback('正在评估…', false);

            try {
                const response = await apiClient.evaluateJob(state.lastJobId);
                const pipelineResult = response.data || {};
                renderEvaluationResult(pipelineResult);
                const errorCode = pipelineResult?.evaluation_result?.error?.code || pipelineResult?.error?.code || '';

                if (pipelineResult.success) {
                    setFeedback('评估完成。', false);
                } else if (pipelineResult?.generation_result?.success && errorCode === 'missing_api_key') {
                    setFeedback('评估服务未配置。', true);
                } else {
                    setFeedback(textOf(pipelineResult?.evaluation_result?.message || pipelineResult?.error?.message, '评估失败，请重试。'), true);
                }
            } catch (error) {
                if (elements.resultPanel) {
                    elements.resultPanel.hidden = false;
                }
                if (elements.evaluationStatus) {
                    elements.evaluationStatus.textContent = textOf(error?.message, '评估失败，请重试。');
                }
                setFeedback('评估失败，请重试。', true);
            } finally {
                setBusy(false);
            }
        }

        window.emmaqSavePreferences = savePreferences;
        window.emmaqGenerateMusic = generateMusic;

        if (elements.downloadButton) {
            elements.downloadButton.addEventListener('click', downloadMidi);
        }
        if (elements.evaluateButton) {
            elements.evaluateButton.addEventListener('click', startEvaluation);
        }
        if (bridge.elements.eegFile) {
            bridge.elements.eegFile.addEventListener('change', () => {
                clearGeneration();
                renderIdleResult();
                syncActionButtons();
            });
        }

        renderIdleResult();
        syncActionButtons();
    });
})();
