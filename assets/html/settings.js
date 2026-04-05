window.onload = async function () {
    const ttsCheckbox = document.getElementById('enableTts');
    const stickyCheckbox = document.getElementById('enableStickyMode');
    const videoInput = document.getElementById('input');
    const ttsSettings = document.getElementById('tts-settings');
    const ttsHostInput = document.getElementById('ttsHost');
    const ttsPortInput = document.getElementById('ttsPort');
    const ttsPortLabel = document.getElementById('ttsPortLabel');
    const ownerVoiceSelect = document.getElementById('ttsOwnerSpeakerId');
    const otherVoiceSelect = document.getElementById('ttsOtherSpeakerId');
    const ttsEngineSelect = document.getElementById('ttsEngine');
    const ownerStyleSelect = document.getElementById('ttsOwnerStyleId');
    const otherStyleSelect = document.getElementById('ttsOtherStyleId');
    const ownerStyleGroup = document.getElementById('ttsOwnerStyleGroup');
    const otherStyleGroup = document.getElementById('ttsOtherStyleGroup');

    const engineConfigs = {
        voicevox: { defaultPort: 50021, hasStyle: false },
        sharevox: { defaultPort: 50025, hasStyle: false },
        coeiroink: { defaultPort: 50032, hasStyle: true }
    };

    const getEngineConfig = () => engineConfigs[ttsEngineSelect.value] || engineConfigs.voicevox;
    const isCoeiroink = () => ttsEngineSelect.value === 'coeiroink';

    const updatePortDefaults = () => {
        const config = getEngineConfig();
        ttsPortInput.setAttribute('placeholder', config.defaultPort.toString());
        ttsPortLabel.textContent = `TTS Port (Default:${config.defaultPort})`;
    };

    const updateStyleVisibility = () => {
        const hasStyle = getEngineConfig().hasStyle;
        ownerStyleGroup.style.display = hasStyle ? 'block' : 'none';
        otherStyleGroup.style.display = hasStyle ? 'block' : 'none';
    };

    // 初期設定の読み込み
    const config = await window.ipc.getConfig();
    ttsCheckbox.checked = !!config.enableTts;
    stickyCheckbox.checked = !!config.enableStickyMode;
    videoInput.value = config.videoId || '';
    ttsHostInput.value = config.ttsHost || '127.0.0.1';
    ttsPortInput.value = config.ttsPort || 50025;
    ttsEngineSelect.value = config.ttsEngine || 'voicevox';
    
    updateStyleVisibility();
    updatePortDefaults();

    const ttsError = document.getElementById('tts-error');

    const videoError = document.getElementById('video-error');
    const startButton = document.getElementById('start-button');

    const extractVideoId = (input) => {
        const trimmed = input.trim();
        if (!trimmed) return null;

        const livePattern = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/;
        const watchPattern = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/;
        const shortPattern = /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/;
        const idPattern = /^[a-zA-Z0-9_-]{11}$/;

        const liveMatch = trimmed.match(livePattern);
        if (liveMatch) return liveMatch[1];
        const watchMatch = trimmed.match(watchPattern);
        if (watchMatch) return watchMatch[1];
        const shortMatch = trimmed.match(shortPattern);
        if (shortMatch) return shortMatch[1];
        if (idPattern.test(trimmed)) return trimmed;

        return null;
    };

    const validateVideoInput = () => {
        if (config.isDebugUi) {
            startButton.disabled = false;
            startButton.textContent = 'START GUI debug';

            const val = videoInput.value.trim();
            const id = extractVideoId(val);
            if (id && (val.includes('/') || val.includes('?'))) {
                videoInput.value = id;
            }
            return;
        }

        const val = videoInput.value.trim();
        if (!val) {
            videoError.style.display = 'none';
            startButton.disabled = true;
            return;
        }

        const id = extractVideoId(val);
        if (id) {
            if (val.includes('/') || val.includes('?')) {
                videoInput.value = id;
            }
            videoError.style.display = 'none';
            startButton.disabled = false;
        } else {
            videoError.textContent = "有効なライブURLまたはVideo IDを入力してください。";
            videoError.style.display = 'block';
            startButton.disabled = true;
        }
    };

    const updateTtsVisibility = () => {
        ttsSettings.style.display = ttsCheckbox.checked ? 'block' : 'none';
    };

    let lastFetchedSpeakers = [];

    const updateStyles = (speakerSelect, styleSelect, defaultStyleId) => {
        const uuid = speakerSelect.value;
        const speaker = lastFetchedSpeakers.find(s => (s.speakerUuid === uuid || s.uuid === uuid));
        const currentVal = styleSelect.value;
        styleSelect.innerHTML = '';
        if (speaker && speaker.styles) {
            speaker.styles.forEach(style => {
                const option = document.createElement('option');
                const sid = style.styleId !== undefined ? style.styleId : style.id;
                const sname = style.styleName !== undefined ? style.styleName : style.name;
                option.value = sid;
                option.textContent = sname;
                if (sid == (currentVal || defaultStyleId)) option.selected = true;
                styleSelect.appendChild(option);
            });
        }
    };

    const loadSpeakers = async (host, port, engine) => {
        updateStyleVisibility();
        try {
            ttsError.style.display = 'none';
            const speakers = await window.ipc.getSpeakers(host, port, engine);
            lastFetchedSpeakers = speakers;
            const engineIsCoeiroink = isCoeiroink();

            const populateSpeakers = (select, selectedId) => {
                const currentVal = select.value;
                select.innerHTML = '';
                if (engineIsCoeiroink) {
                    speakers.forEach(speaker => {
                        const option = document.createElement('option');
                        const uuid = speaker.speakerUuid || speaker.uuid;
                        const name = speaker.speakerName || speaker.name;
                        option.value = uuid;
                        option.textContent = name;
                        if (uuid === (currentVal || selectedId)) option.selected = true;
                        select.appendChild(option);
                    });
                } else {
                    speakers.forEach(speaker => {
                        speaker.styles.forEach(style => {
                            const option = document.createElement('option');
                            option.value = style.id;
                            option.textContent = `${speaker.name} (${style.name})`;
                            if (style.id == (currentVal || selectedId)) option.selected = true;
                            select.appendChild(option);
                        });
                    });
                }
            };

            populateSpeakers(ownerVoiceSelect, config.ttsOwnerSpeakerId);
            populateSpeakers(otherVoiceSelect, config.ttsOtherSpeakerId);

            if (engineIsCoeiroink) {
                updateStyles(ownerVoiceSelect, ownerStyleSelect, config.ttsOwnerStyleId);
                updateStyles(otherVoiceSelect, otherStyleSelect, config.ttsOtherStyleId);
            }
        } catch (e) {
            console.error("Failed to load speakers", e);
            ttsError.textContent = `接続に失敗しました。エンジンが起動しているか、ホスト・ポート設定が正しいか確認してください。`;
            ttsError.style.display = 'block';
            ownerVoiceSelect.innerHTML = '<option value="">-- 読込失敗 --</option>';
            otherVoiceSelect.innerHTML = '<option value="">-- 読込失敗 --</option>';
            ownerStyleSelect.innerHTML = '<option value="">-- 読込失敗 --</option>';
            otherStyleSelect.innerHTML = '<option value="">-- 読込失敗 --</option>';
        }
    };

    updateTtsVisibility();
    validateVideoInput();
    if (ttsCheckbox.checked) {
        const port = parseInt(ttsPortInput.value, 10);
        await loadSpeakers(ttsHostInput.value, isNaN(port) ? undefined : port, ttsEngineSelect.value);
    }

    // 設定変更時の保存
    const saveConfig = () => {
        const engine = ttsEngineSelect.value;
        const engineIsCoeiroink = isCoeiroink();

        let ownerSpeakerId = ownerVoiceSelect.value;
        let otherSpeakerId = otherVoiceSelect.value;

        if (!engineIsCoeiroink) {
            ownerSpeakerId = parseInt(ownerSpeakerId, 10);
            otherSpeakerId = parseInt(otherSpeakerId, 10);
        }

        window.ipc.setConfig({
            enableTts: ttsCheckbox.checked,
            enableStickyMode: stickyCheckbox.checked,
            ttsHost: ttsHostInput.value,
            ttsPort: parseInt(ttsPortInput.value, 10),
            ttsEngine: engine,
            ttsOwnerSpeakerId: (!engineIsCoeiroink && isNaN(ownerSpeakerId)) ? config.ttsOwnerSpeakerId : ownerSpeakerId,
            ttsOtherSpeakerId: (!engineIsCoeiroink && isNaN(otherSpeakerId)) ? config.ttsOtherSpeakerId : otherSpeakerId,
            ttsOwnerStyleId: parseInt(ownerStyleSelect.value, 10) || 0,
            ttsOtherStyleId: parseInt(otherStyleSelect.value, 10) || 0
        });
    };

    ttsCheckbox.onchange = () => {
        updateTtsVisibility();
        saveConfig();
        if (ttsCheckbox.checked && ownerVoiceSelect.options.length === 0) {
            loadSpeakers(ttsHostInput.value, parseInt(ttsPortInput.value, 10), ttsEngineSelect.value);
        }
    };
    stickyCheckbox.onchange = saveConfig;

    const updateSpeakersAndSave = () => {
        saveConfig();
        const port = parseInt(ttsPortInput.value, 10);
        loadSpeakers(ttsHostInput.value, isNaN(port) ? undefined : port, ttsEngineSelect.value);
    };

    ttsHostInput.onchange = updateSpeakersAndSave;
    ttsPortInput.onchange = updateSpeakersAndSave;
    ttsEngineSelect.onchange = () => {
        updatePortDefaults();
        updateSpeakersAndSave();
    };

    ownerVoiceSelect.onchange = () => {
        if (isCoeiroink()) updateStyles(ownerVoiceSelect, ownerStyleSelect);
        saveConfig();
    };
    otherVoiceSelect.onchange = () => {
        if (isCoeiroink()) updateStyles(otherVoiceSelect, otherStyleSelect);
        saveConfig();
    };
    ownerStyleSelect.onchange = saveConfig;
    otherStyleSelect.onchange = saveConfig;

    videoInput.onchange = validateVideoInput;
    videoInput.oninput = validateVideoInput;

    document.getElementById('form').onsubmit = (e) => {
        e.preventDefault();
        saveConfig();

        // 開始中はボタンを無効化
        startButton.disabled = true;
        startButton.textContent = "Connecting...";

        window.ipc.getLiveChatId(videoInput.value).then(_e => {
            window.ipc.initWindowClose()
        }).catch(err => {
            console.error("Auth process error", err);
            videoError.textContent = `ライブの取得に失敗しました: ${err.message || '不明なエラー'}`;
            videoError.style.display = 'block';

            // ボタンを復帰させる
            startButton.disabled = false;
            startButton.textContent = config.isDebugUi ? 'START GUI debug' : 'Start App';
        });
    }
}
