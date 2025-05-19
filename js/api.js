// --- START OF FILE jl-studio.art/gen-img-ref/js/api.js ---

const API_BASE_URL_IMAGE = 'https://image.pollinations.ai';
const API_BASE_URL_TEXT = 'https://text.pollinations.ai';

/**
 * Загружает список доступных моделей для генерации изображений.
 * @returns {Promise<string[]>} Массив строк с ID моделей.
 */
async function fetchAvailableImageModels() {
    try {
        const response = await fetch(`${API_BASE_URL_IMAGE}/models`);
        if (!response.ok) {
            console.error(`Ошибка загрузки моделей изображений: ${response.status} ${response.statusText}`);
            return []; // Возвращаем пустой массив в случае ошибки, чтобы приложение не падало
        }
        const models = await response.json();
        return Array.isArray(models) ? models : [];
    } catch (error) {
        console.error('Сетевая ошибка при загрузке моделей изображений:', error);
        return [];
    }
}

/**
 * Генерирует изображение на основе промта и параметров.
 * @param {string} prompt - Текстовый промт.
 * @param {object} params - Параметры генерации (width, height, seed, model, nologo, enhance, private).
 * @returns {Promise<string|null>} URL сгенерированного изображения или null в случае ошибки.
 */
async function generateImage(prompt, params = {}) {
    const encodedPrompt = encodeURIComponent(prompt);
    const queryParams = new URLSearchParams({
        width: params.width || 1024,
        height: params.height || 1024,
        nologo: params.nologo !== undefined ? params.nologo : true, // по умолчанию убираем лого
        enhance: params.enhance !== undefined ? params.enhance : false, // по умолчанию не улучшаем через API, т.к. делаем свое улучшение
        private: params.private !== undefined ? params.private : false,
        referrer: 'https://jl-studio.art' // корневой домен
    });

    if (params.seed) {
        queryParams.append('seed', params.seed);
    }
    if (params.model) {
        queryParams.append('model', params.model);
    }
    
    const imageUrl = `${API_BASE_URL_IMAGE}/prompt/${encodedPrompt}?${queryParams.toString()}`;
    console.log("Запрос на генерацию изображения:", imageUrl);

    try {
        // Используем fetch для получения blob, чтобы проверить успешность ответа
        const response = await fetch(imageUrl);
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Ошибка генерации изображения: ${response.status} ${response.statusText}`, errorText);
            throw new Error(`Ошибка ${response.status}: ${errorText || response.statusText}`);
        }
        if (!response.headers.get('content-type')?.startsWith('image/')) {
            const errorText = await response.text();
            console.error('API не вернуло изображение, получено:', errorText);
            throw new Error('API не вернуло изображение.');
        }
        // Если все хорошо, возвращаем URL, по которому был сделан запрос.
        // Браузер сам закэширует изображение, если оно уже было загружено.
        return imageUrl;
    } catch (error) {
        console.error('Сетевая ошибка при генерации изображения:', error);
        throw error; // Перебрасываем ошибку для обработки выше
    }
}


/**
 * Анализирует изображение с помощью Vision API.
 * @param {string} imageDataUrl - URL изображения в формате Data URL (base64).
 * @param {string} analysisPrompt - Промт для анализа (например, "Опиши этого персонажа").
 * @param {string} model - Модель для анализа (например, "openai-large").
 * @returns {Promise<string>} Текстовое описание изображения.
 */
async function analyzeImageWithVision(imageDataUrl, analysisPrompt, model = "openai-large") {
    const payload = {
        model: model,
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: analysisPrompt },
                    {
                        type: "image_url",
                        image_url: { url: imageDataUrl }
                    }
                ]
            }
        ],
        max_tokens: 100 // Ограничиваем количество токенов для описания референса
    };

    try {
        const response = await fetch(`${API_BASE_URL_TEXT}/openai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: response.statusText }));
            console.error(`Ошибка анализа изображения (${model}): ${response.status}`, errorData);
            throw new Error(`Ошибка анализа (${model}): ${errorData.detail || response.statusText}`);
        }

        const data = await response.json();
        if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
            return data.choices[0].message.content.trim();
        } else {
            console.error('Некорректный ответ от API анализа изображений:', data);
            throw new Error('Не удалось получить описание изображения от API.');
        }
    } catch (error) {
        console.error(`Сетевая ошибка при анализе изображения (${model}):`, error);
        throw error;
    }
}

/**
 * Обрабатывает текст: переводит на английский (если нужно) и/или улучшает.
 * @param {string} textToProcess - Исходный текст для обработки.
 * @param {boolean} enhanceEnabled - Включено ли улучшение через ИИ.
 * @param {string} model - Модель для обработки текста (например, "openai").
 * @param {string|null} styleContext - Контекст стиля (например, "anime style") для улучшения.
 * @returns {Promise<string>} Обработанный текст.
 */
async function processTextForPrompt(textToProcess, enhanceEnabled, model = "openai", styleContext = null) {
    if (!textToProcess.trim()) {
        return ""; // Возвращаем пустую строку, если на входе пусто
    }

    let systemPromptContent = `You are an expert prompt engineer for image generation.
    Your task is to process the user's input and generate a high-quality, detailed, and coherent final prompt in English.
    Follow these steps:
    1. Analyze the provided text. Determine if it's already in English or another language.
    2. If the text is not in English, translate it accurately to English. Preserve all key details, names, and specific terms.
    3. If the text contains multiple ideas or descriptions (e.g., from image references and user additions), logically combine them into a single, flowing descriptive paragraph. Ensure that distinct subjects or elements are clearly separated but contribute to a unified scene or concept.
    4. Make sure the final prompt is suitable for an image generation AI. Use descriptive adjectives and adverbs. Specify visual details like colors, lighting, composition, artistic style (if mentioned), and emotional tone.
    5. The final output MUST be only the generated English prompt, with no additional explanations, greetings, or conversational text.
    `;

    if (enhanceEnabled) {
        systemPromptContent += `
    6. After translation (if any) and combination, further enhance the prompt by adding more relevant visual details, artistic keywords, and compositional suggestions. 
       If a specific artistic style is mentioned (e.g., '${styleContext || 'any style'}'), emphasize details that align with that style.
       For example, if the style is 'anime', add terms like 'cel-shaded, vibrant colors, expressive eyes'. If 'photorealistic', add 'hyperdetailed, sharp focus, 8k'.
       Avoid clichés unless they are very specific to a requested style.
       The enhancement should make the prompt more vivid and inspire a more interesting image.
    `;
    // Специальные инструкции для стилей, где не нужен фотореализм
    const noRealismStyles = ['anime', 'manga', 'pixel', 'gravity_falls', 'bobs_burgers', 'lego', 'rick_morty', 'south_park', 'simpsons', 'dc_comics', 'sketch'];
        if (styleContext && noRealismStyles.some(s => styleContext.toLowerCase().includes(s))) {
            systemPromptContent += `
    IMPORTANT: For styles like '${styleContext}', AVOID terms related to photorealism, hyperrealism, or realistic photography (e.g., '8k', 'DSLR', 'sharp focus' unless it's specific like 'sharp comic lines'). Focus on stylized visual elements.
    `;
        }

    } else {
         systemPromptContent += `
    6. If enhancement is disabled, focus solely on accurate translation (if needed) and clear, logical combination of the provided text elements into a coherent English prompt. Do not add new creative details beyond what's given.
    `;
    }


    const payload = {
        model: model, // или другая подходящая модель для текста
        messages: [
            {
                role: "system",
                content: systemPromptContent
            },
            {
                role: "user",
                content: textToProcess
            }
        ]
    };
    // console.log("Payload для обработки текста:", JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(`${API_BASE_URL_TEXT}/openai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: response.statusText }));
            console.error(`Ошибка обработки текста (${model}): ${response.status}`, errorData);
            throw new Error(`Ошибка обработки текста (${model}): ${errorData.detail || response.statusText}`);
        }

        const data = await response.json();
        if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
            let processedText = data.choices[0].message.content.trim();
            // Дополнительная очистка от возможных артефактов ответа LLM
            processedText = processedText.replace(/^prompt:\s*/i, '').replace(/^final prompt:\s*/i, '').replace(/^english prompt:\s*/i, '');
            return processedText;
        } else {
            console.error('Некорректный ответ от API обработки текста:', data);
            throw new Error('Не удалось получить обработанный текст от API.');
        }
    } catch (error) {
        console.error(`Сетевая ошибка при обработке текста (${model}):`, error);
        throw error;
    }
}


// Экспортируем функции, чтобы они были доступны в других файлах
export {
    fetchAvailableImageModels,
    generateImage,
    analyzeImageWithVision,
    processTextForPrompt
};
// --- END OF FILE jl-studio.art/gen-img-ref/js/api.js ---