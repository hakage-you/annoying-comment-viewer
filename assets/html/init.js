window.onload = async function () {
    const clientIdInput = document.getElementById('oauth2ClientId');
    const clientSecretInput = document.getElementById('oauth2ClientSecret');
    const form = document.getElementById('form');
    const errorMsg = document.getElementById('error-msg');
    const saveButton = document.getElementById('save-button');
    const cancelButton = document.getElementById('cancel-button');

    // 初期設定の読み取り (migration等ですでに取得済みの可能性を考慮)
    try {
        const config = await window.ipc.getConfig();
        if (config.oauth2ClientId) clientIdInput.value = config.oauth2ClientId;
        if (config.oauth2ClientSecret) clientSecretInput.value = config.oauth2ClientSecret;
    } catch (e) {
        console.error("Failed to fetch initial config", e);
    }

    document.getElementById('console-link').onclick = (e) => {
        e.preventDefault();
        window.ipc.openExternal("https://console.cloud.google.com/apis/credentials");
    };

    cancelButton.onclick = async () => {
        cancelButton.disabled = true;
        cancelButton.textContent = "Cancelling...";
        await window.ipc.cancelAuth();
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        const clientId = clientIdInput.value.trim();
        const clientSecret = clientSecretInput.value.trim();

        if (!clientId || !clientSecret) {
            errorMsg.textContent = "両方のフィールドを入力してください。";
            errorMsg.style.display = 'block';
            return;
        }

        saveButton.disabled = true;
        saveButton.textContent = "Verifying...";
        cancelButton.style.display = "block";
        cancelButton.disabled = false;
        cancelButton.textContent = "Cancel";
        errorMsg.style.display = 'none';

        try {
            const result = await window.ipc.testAuthConfig({ 
                clientId: clientId, 
                clientSecret: clientSecret 
            });

            if (result.success) {
                window.ipc.initWindowClose();
            } else {
                errorMsg.textContent = `認証に失敗しました: ${result.error}`;
                errorMsg.style.display = 'block';
            }
        } catch (err) {
            console.error("Save error", err);
            errorMsg.textContent = `エラーが発生しました: ${err.message}`;
            errorMsg.style.display = 'block';
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = "Save and Continue";
            cancelButton.style.display = "none";
        }
    };
}
